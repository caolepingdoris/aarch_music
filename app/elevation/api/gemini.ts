import generativeMusicSkill from "../../../src/assets/skill/GenerativeMusic.md?raw";
import type { MusicPlan } from "../music/buildMusic";
import { midiToName } from "../music/riff";
import { ERA_VOICES } from "../audio/voices";
import type { Analysis, ManualFacts, UploadedImage } from "../types";

const GEMINI_MODEL = "gemini-3.6-flash";

// ── Shared request helper ───────────────────────────────────────────────────

/** Called before each retry, so the UI can say Gemini is busy. */
export type RetryListener = (attempt: number, maxAttempts: number, reason: string) => void;

interface GeminiRequest {
  apiKey: string;
  systemInstruction: string;
  parts: Array<Record<string, unknown>>;
  maxOutputTokens: number;
  temperature?: number;
  responseSchema?: Record<string, unknown>;
  onRetry?: RetryListener;
}

export class GeminiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

// Overloaded (503), rate-limited (429) and transient server errors are worth retrying.
const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 4;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function postWithRetry(url: string, body: string, onRetry?: RetryListener): Promise<any> {
  for (let attempt = 1; ; attempt++) {
    let status: number | undefined;
    let message: string;
    let retryAfterMs: number | undefined;
    try {
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body });
      const data = await response.json().catch(() => ({}));
      if (response.ok) return data;
      status = response.status;
      message = data.error?.message || `Gemini request failed (${response.status})`;
      const retryAfter = Number(response.headers.get("retry-after"));
      if (retryAfter > 0) retryAfterMs = retryAfter * 1000;
    } catch (err) {
      message = err instanceof Error ? err.message : "Network error"; // offline / connection reset
    }

    const retryable = status === undefined || RETRYABLE.has(status);
    if (!retryable || attempt >= MAX_ATTEMPTS) throw new GeminiError(message, status);

    // Exponential backoff with jitter: ~1.5s, 3s, 6s (or what the server asks for).
    const delay = Math.min(retryAfterMs ?? 1500 * 2 ** (attempt - 1) * (0.8 + Math.random() * 0.4), 15_000);
    onRetry?.(attempt + 1, MAX_ATTEMPTS, message);
    await sleep(delay);
  }
}

async function generateJson<T>({ apiKey, systemInstruction, parts, maxOutputTokens, temperature, responseSchema, onRetry }: GeminiRequest): Promise<T> {
  const data = await postWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
    JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts }],
      generationConfig: {
        maxOutputTokens,
        responseMimeType: "application/json",
        ...(temperature != null ? { temperature } : {}),
        ...(responseSchema ? { responseSchema } : {}),
      },
    }),
    onRetry
  );

  const responseParts: Array<{ text?: string }> = data.candidates?.[0]?.content?.parts || [];
  const cleaned = responseParts
    .map((part) => part.text || "")
    .join("")
    .replace(/```json|```/g, "")
    .trim();
  if (!cleaned) throw new Error(`No text in Gemini response (finish reason: ${data.candidates?.[0]?.finishReason ?? "unknown"})`);
  return JSON.parse(cleaned) as T;
}

// ── 1. Reading: photo and/or facts → architectural analysis ────────────────

const READING_INSTRUCTION =
  "You are the reading and composition engine for ELEVATION, an art project that turns structures into short generative music. You may receive a photograph, user-provided facts, or both. Respond with ONLY a raw JSON object — no markdown fences, no preamble, no trailing text — matching exactly this shape:\n" +
  '{"buildingType": string, "styleLabel": string, "eraLabel": string, "eraStartYear": number, "regionGuess": string, "materials": [string, ...up to 3], "structuralRhythm": string, "repetitionCount": integer between 4 and 16, "confidenceNote": string, "historicalRationale": string, "musicalReference": string}\n' +
  "Field notes: eraStartYear is a best-guess integer year. regionGuess is broad unless a location was explicitly given. Keep structuralRhythm to one sentence, confidenceNote to one sentence, historicalRationale to 2 concise sentences, and musicalReference to 3-6 words. repetitionCount MUST be an integer between 4 and 16, never a string or description. Keep every field concise so the complete JSON fits within the response budget. This is for an artistic sound-generation tool — always give your best creative estimate for every field, never refuse and never leave a field empty.";

function buildFactsText(manual: ManualFacts): string {
  const factLines: string[] = [];
  if (manual.name.trim()) factLines.push(`Name: ${manual.name.trim()}`);
  if (manual.year.trim()) factLines.push(`Year built: ${manual.year.trim()}`);
  if (manual.location.trim()) factLines.push(`Location: ${manual.location.trim()}`);
  if (manual.style.trim()) factLines.push(`Style: ${manual.style.trim()}`);
  if (manual.materials.trim()) factLines.push(`Materials: ${manual.materials.trim()}`);
  if (manual.notes.trim()) factLines.push(`Notes / history: ${manual.notes.trim()}`);
  return factLines.length
    ? `Known facts about this structure (treat as certain — do not contradict or re-guess these, only fill in what's missing):\n${factLines.join("\n")}`
    : "No user-provided facts were given — rely on the photograph and your general architectural/historical knowledge.";
}

/** User-entered facts always win over the model's phrasing of the same field. */
function mergeManualFacts(parsed: Analysis, manual: ManualFacts): Analysis {
  const merged = { ...parsed };
  if (manual.name.trim()) merged.buildingType = manual.name.trim();
  if (manual.year.trim() && !isNaN(Number(manual.year))) merged.eraStartYear = Number(manual.year);
  if (manual.location.trim()) merged.regionGuess = manual.location.trim();
  if (manual.style.trim()) merged.styleLabel = manual.style.trim();
  if (manual.materials.trim()) {
    merged.materials = manual.materials
      .trim()
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3);
  }
  return merged;
}

export async function readStructure(params: { apiKey: string; manual: ManualFacts; image: UploadedImage | null; onRetry?: RetryListener }): Promise<Analysis> {
  const { apiKey, manual, image, onRetry } = params;
  const parts: Array<Record<string, unknown>> = [];
  if (image) parts.push({ inlineData: { mimeType: image.mediaType, data: image.base64 } });
  parts.push({
    text: `${buildFactsText(manual)}\n\nRead and compose for this structure for ELEVATION. Return only the JSON object.${
      image ? "" : " No photograph was provided — reason from the facts above and general knowledge; never refuse for lack of an image."
    }`,
  });
  const parsed = await generateJson<Analysis>({ apiKey, systemInstruction: READING_INSTRUCTION, parts, maxOutputTokens: 3000, onRetry });
  return mergeManualFacts(parsed, manual);
}

// ── 2. Composition: analysis + plan → MIDI note events (GenerativeMusic skill) ─

export interface GeminiComposition {
  figure?: string;
  bars?: Array<{ notes?: Array<{ midi?: number; dur?: number; grace?: number | null }> }>;
}

const COMPOSITION_SCHEMA = {
  type: "OBJECT",
  properties: {
    figure: { type: "STRING" },
    bars: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          notes: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                midi: { type: "INTEGER" },
                dur: { type: "INTEGER" },
                grace: { type: "INTEGER", nullable: true },
              },
              required: ["midi", "dur"],
            },
          },
        },
        required: ["notes"],
      },
    },
  },
  required: ["figure", "bars"],
};

/** The composition plan sent alongside the skill: the app's givens for this piece. */
function compositionPlan(analysis: Analysis, plan: MusicPlan, variation: string) {
  const { score } = plan;
  const voices = ERA_VOICES[plan.palette.key];
  return {
    variation,
    structure: {
      name: analysis.buildingType,
      style: analysis.styleLabel,
      era: analysis.eraLabel,
      region: analysis.regionGuess,
      materials: analysis.materials,
      structuralRhythm: analysis.structuralRhythm,
      musicalReference: analysis.musicalReference,
      historicalRationale: analysis.historicalRationale,
    },
    era: plan.palette.key,
    eraName: plan.palette.era,
    meter: `${score.meter.num}/${score.meter.den}`,
    beatGrouping: score.meter.beatGroups ? score.meter.beatGroups.join("+") + " eighths" : undefined,
    barLength: score.meter.barLength,
    bars: score.bars,
    tempo: plan.palette.tempo,
    instruments: { lead: voices.lead.instrument, pad: voices.pad.instrument, percussion: voices.perc.instrument },
    tonic: { name: plan.rootName, midi: score.tonicMidi },
    scale: { name: plan.scale.name, intervals: plan.scale.intervals },
    allowedPitches: score.allowedMidis.map((midi) => ({ midi, name: midiToName(midi) })),
    crownBar: score.peakBar + 1,
    arch: score.archCurve.map((value, b) => ({
      bar: b + 1,
      value: Math.round(value * 100) / 100,
      anchorMidi: score.anchorMidis[b],
      anchorName: midiToName(score.anchorMidis[b]),
      density: score.density[b],
    })),
  };
}

export async function composeScore(params: {
  apiKey: string;
  analysis: Analysis;
  plan: MusicPlan;
  variation: string;
  onRetry?: RetryListener;
}): Promise<GeminiComposition> {
  const { apiKey, analysis, plan, variation, onRetry } = params;
  return generateJson<GeminiComposition>({
    apiKey,
    systemInstruction: generativeMusicSkill,
    parts: [
      {
        text:
          "Composition plan (JSON). Compose the lead riff for this structure following the GenerativeMusic skill, " +
          "and return only the Output JSON.\n\n" +
          JSON.stringify(compositionPlan(analysis, plan, variation), null, 1),
      },
    ],
    maxOutputTokens: 12000,
    temperature: 1.1,
    responseSchema: COMPOSITION_SCHEMA,
    onRetry,
  });
}
