import { deriveMixSettings, type MixSettings } from "../../../src/services/MixService";
import type { Analysis, EraPalette, Music, Scale } from "../types";
import { pickEraPalette } from "./eras";
import { materialFilterFreq, materialTextureLabel } from "./materials";
import { planScore, type Riff, type ScorePlan } from "./riff";
import { NOTE_NAMES, pickScale } from "./scales";

function hashToSemitone(s = ""): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) % 12;
  return hash;
}

/** Everything fixed by the architectural reading, before the melody is composed. */
export interface MusicPlan {
  scale: Scale;
  palette: EraPalette;
  materialFreq: number;
  materialLabel: string;
  rootOffset: number;
  rootName: string;
  /** Number of bars: one per structural bay. */
  steps: number;
  score: ScorePlan;
  mix: MixSettings;
}

export function planMusic(analysis: Analysis): MusicPlan {
  const scale = pickScale(analysis.regionGuess);
  const palette = pickEraPalette(analysis.eraStartYear);
  const rootOffset = hashToSemitone((analysis.buildingType || "") + (analysis.styleLabel || ""));
  const steps = Math.max(4, Math.min(16, Math.round(Number(analysis.repetitionCount)) || 8));
  return {
    scale,
    palette,
    materialFreq: materialFilterFreq(analysis.materials),
    materialLabel: materialTextureLabel(analysis.materials),
    rootOffset,
    rootName: NOTE_NAMES[rootOffset % 12],
    steps,
    score: planScore(palette.key, scale, rootOffset, steps),
    mix: deriveMixSettings(analysis, palette),
  };
}

/** Combines the plan with a composed riff (from Gemini, or the local fallback). */
export function buildMusic(plan: MusicPlan, riff: Riff): Music {
  const { score: _score, ...rest } = plan;
  return { ...rest, ...riff };
}
