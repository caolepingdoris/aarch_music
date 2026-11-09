// Riff layer: plans the score from the reading, turns Gemini's composition into a
// validated riff, and keeps the rule-based generator as a per-bar fallback.
// All durations are in sixteenth notes (1 = 16th … 6 = dotted quarter).
import type { GeminiComposition } from "../api/gemini";
import type { Meter, NoteEvent, PadHit, PaletteKey, PercHit, Scale } from "../types";
import { ERA_STYLES } from "./melody";
import { NOTE_NAMES } from "./scales";

/** Sounding length of an appoggiatura, taken from the start of its main note. */
export const GRACE_LENGTH: Record<number, number> = { 3: 1, 4: 2, 6: 4 };
const ALLOWED_DURATIONS = [6, 4, 3, 2, 1];
export const MIN_MIDI = 55;
export const MAX_MIDI = 86;

function seeded(seedText: string) {
  let a = 0;
  for (let i = 0; i < seedText.length; i++) a = (Math.imul(a, 31) + seedText.charCodeAt(i)) | 0;
  return () => {
    // mulberry32
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const midiToName = (midi: number) => NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1);

const intoRange = (midi: number) => {
  while (midi > MAX_MIDI) midi -= 12;
  while (midi < MIN_MIDI) midi += 12;
  return midi;
};

// ── Plan: everything the app fixes before composing ─────────────────────────

export type Density = "sparse" | "medium" | "dense";

export interface ScorePlan {
  palette: PaletteKey;
  scale: Scale;
  meter: Meter;
  bars: number;
  tonicMidi: number;
  archCurve: number[];
  anchorMidis: number[];
  density: Density[];
  peakBar: number;
  /** Scale tones within the playable range. */
  allowedMidis: number[];
  degreeToMidi: (degree: number) => number;
}

export function planScore(palette: PaletteKey, scale: Scale, rootOffset: number, bars: number): ScorePlan {
  const len = scale.intervals.length;
  // Keep the tonic between G3 and F#4 so the riff sits mid-staff.
  const tonicMidi = 60 + rootOffset - (rootOffset >= 7 ? 12 : 0);
  const degreeToMidi = (d: number) => {
    const oct = Math.floor(d / len);
    return intoRange(tonicMidi + oct * 12 + scale.intervals[d - oct * len]);
  };

  const archCurve = Array.from({ length: bars }, (_, b) => Math.sin((b / Math.max(1, bars - 1)) * Math.PI));
  const peakBar = archCurve.indexOf(Math.max(...archCurve));
  const anchorMidis = archCurve.map((arch) => degreeToMidi(Math.round(arch * len)));
  const density = archCurve.map((arch, b): Density =>
    b === 0 || b === bars - 1 ? "sparse" : arch > 0.8 ? "dense" : arch > 0.4 ? "medium" : "sparse"
  );

  const pitchClasses = new Set(scale.intervals.map((i) => (tonicMidi + i) % 12));
  const allowedMidis: number[] = [];
  for (let m = MIN_MIDI; m <= MAX_MIDI; m++) if (pitchClasses.has(m % 12)) allowedMidis.push(m);

  return { palette, scale, meter: ERA_STYLES[palette].meter, bars, tonicMidi, archCurve, anchorMidis, density, peakBar, allowedMidis, degreeToMidi };
}

// ── Riff assembly ───────────────────────────────────────────────────────────

export interface Riff {
  meter: Meter;
  events: NoteEvent[];
  padHits: PadHit[];
  percHits: PercHit[];
  totalLength: number;
  archCurve: number[];
  anchorMidis: number[];
  graceCount: number;
  figureLabel: string;
  /** Who wrote the melody. */
  source: "gemini" | "local";
  /** Bars the app had to repair or substitute (Gemini output only). */
  repairedBars: number[];
}

type RawNote = { midi: number; dur: number; grace?: number | null };

function assemble(plan: ScorePlan, bars: RawNote[][], meta: Pick<Riff, "figureLabel" | "source" | "repairedBars">): Riff {
  const { meter, tonicMidi } = plan;
  const { barLength } = meter;
  const events: NoteEvent[] = [];
  bars.forEach((notes, b) => {
    let t = b * barLength;
    for (const n of notes) {
      const event: NoteEvent = { index: events.length, bar: b, start: t, dur: n.dur, midi: n.midi, name: midiToName(n.midi) };
      if (n.grace != null && GRACE_LENGTH[n.dur] && n.grace !== n.midi) {
        event.grace = { midi: n.grace, name: midiToName(n.grace), dur: GRACE_LENGTH[n.dur] };
      }
      events.push(event);
      t += n.dur;
    }
  });

  const totalLength = plan.bars * barLength;

  // Pad: open fifth on the tonic, re-voiced about every whole note (sampled pads decay).
  const padEvery = Math.max(1, Math.round(16 / barLength));
  const padRoot = tonicMidi - 12;
  const padHits: PadHit[] = [];
  for (let b = 0; b < plan.bars; b += padEvery) {
    const start = b * barLength;
    const midis = [padRoot, padRoot + 7];
    padHits.push({ start, dur: Math.min(padEvery * barLength, totalLength - start), midis, names: midis.map(midiToName) });
  }

  // Percussion on every beat, accented on each bar's downbeat.
  const percHits: PercHit[] = [];
  for (let b = 0; b < plan.bars; b++) {
    meter.beats.forEach((beat, i) => {
      const next = meter.beats[i + 1] ?? barLength;
      percHits.push({ start: b * barLength + beat, dur: next - beat, accent: i === 0 });
    });
  }

  return {
    meter,
    events,
    padHits,
    percHits,
    totalLength,
    archCurve: plan.archCurve,
    anchorMidis: plan.anchorMidis,
    graceCount: events.filter((e) => e.grace).length,
    ...meta,
  };
}

// ── Local rule-based generator (fallback) ───────────────────────────────────

function localBars(plan: ScorePlan, seed: string): RawNote[][] {
  const style = ERA_STYLES[plan.palette];
  const len = plan.scale.intervals.length;
  const rand = seeded(seed);
  const pick = <T>(list: T[]) => list[Math.floor(rand() * list.length)];
  const modularCell = pick(style.cells.medium);

  return plan.archCurve.map((arch, b) => {
    const isLast = b === plan.bars - 1;
    let cell = style.modular && !isLast ? modularCell : pick(style.cells[plan.density[b]]);
    // The cadence needs a long final note.
    if (isLast) cell = style.cells.sparse.reduce((best, c) => (c[c.length - 1] > best[best.length - 1] ? c : best));

    const anchor = Math.round(arch * len);
    const figure = style.figure(arch);
    return cell.map((dur, j) => {
      let degree = anchor + figure[(j + b * style.figureShift) % figure.length];
      const lastNote = isLast && j === cell.length - 1;
      if (lastNote) degree = anchor > len / 2 ? len : 0; // resolve to the tonic
      const midi = plan.degreeToMidi(degree);
      const isCrown = b === plan.peakBar && j === cell.findIndex((d) => d >= 3);
      const wantsGrace = dur >= 3 && (lastNote || isCrown || (dur >= 4 && rand() < style.graceRate));
      const grace = wantsGrace ? (style.graceFromBelow ? midi - 1 : plan.degreeToMidi(degree + 1)) : null;
      return { midi, dur, grace };
    });
  });
}

/** Rule-based riff. `seed` changes per take, so recomposing varies. */
export function buildLocalRiff(plan: ScorePlan, seed: string): Riff {
  return assemble(plan, localBars(plan, seed), { figureLabel: ERA_STYLES[plan.palette].label, source: "local", repairedBars: [] });
}

// ── Gemini composition → validated riff ─────────────────────────────────────

/** Greedy split of a span into allowed durations. */
function fill(span: number): number[] {
  const out: number[] = [];
  while (span > 0) {
    const d = ALLOWED_DURATIONS.find((x) => x <= span)!;
    out.push(d);
    span -= d;
  }
  return out;
}

/** Makes one Gemini bar legal. Returns null when nothing usable is left. */
function repairBar(raw: unknown, barLength: number): { notes: RawNote[]; repaired: boolean } | null {
  const list = (raw as { notes?: unknown } | undefined)?.notes;
  if (!Array.isArray(list)) return null;
  let repaired = false;
  const notes: RawNote[] = [];
  let used = 0;
  for (const item of list) {
    const n = item as { midi?: unknown; dur?: unknown; grace?: unknown };
    if (typeof n.midi !== "number" || !Number.isFinite(n.midi)) {
      repaired = true;
      continue;
    }
    const left = barLength - used;
    if (left <= 0) {
      repaired = true; // overflow: drop the rest of the bar
      break;
    }
    const midi = intoRange(Math.round(n.midi));
    if (midi !== Math.round(n.midi)) repaired = true;
    let dur = typeof n.dur === "number" ? Math.round(n.dur) : 0;
    if (!ALLOWED_DURATIONS.includes(dur)) {
      dur = ALLOWED_DURATIONS.find((d) => d <= Math.max(1, dur)) ?? 1; // snap down to a legal value
      repaired = true;
    }
    if (dur > left) {
      dur = ALLOWED_DURATIONS.find((d) => d <= left)!;
      repaired = true;
    }
    let grace: number | null = null;
    if (typeof n.grace === "number" && Number.isFinite(n.grace) && GRACE_LENGTH[dur]) {
      const g = Math.round(n.grace);
      if (Math.abs(g - midi) <= 12 && g >= MIN_MIDI - 2 && g <= MAX_MIDI + 2) grace = g;
    }
    notes.push({ midi, dur, grace });
    used += dur;
  }
  if (notes.length === 0) return null;
  if (used < barLength) {
    // Underfull: sustain the last pitch so the bar still adds up.
    const last = notes[notes.length - 1].midi;
    for (const d of fill(barLength - used)) notes.push({ midi: last, dur: d, grace: null });
    repaired = true;
  }
  return { notes, repaired };
}

/**
 * Turns Gemini's composition into a playable, engravable riff. Every bar is
 * validated against the plan. Bars that are missing or unusable fall back to the
 * local generator for that bar only.
 */
export function riffFromComposition(plan: ScorePlan, composition: GeminiComposition, seed: string): Riff {
  const fallback = localBars(plan, seed);
  const repairedBars: number[] = [];
  const bars = fallback.map((localBar, b) => {
    const fixed = repairBar(composition.bars?.[b], plan.meter.barLength);
    if (!fixed) {
      repairedBars.push(b);
      return localBar;
    }
    if (fixed.repaired) repairedBars.push(b);
    return fixed.notes;
  });
  const figure =
    typeof composition.figure === "string" && composition.figure.trim()
      ? composition.figure.trim().slice(0, 120)
      : ERA_STYLES[plan.palette].label;
  return assemble(plan, bars, { figureLabel: figure, source: "gemini", repairedBars });
}
