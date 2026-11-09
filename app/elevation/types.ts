import type { MixSettings } from "../../src/services/MixService";

export type LilyMode = "major" | "minor" | "dorian" | "phrygian" | "mixolydian";

export interface Scale {
  name: string;
  intervals: number[];
  /** Closest LilyPond key mode, for the key signature. */
  lilyMode: LilyMode;
}

export type PaletteKey =
  | "medieval"
  | "renaissance"
  | "baroque"
  | "industrial"
  | "artdeco"
  | "midcentury"
  | "postmodern"
  | "contemporary";

export interface EraPalette {
  /** Exclusive upper bound on the era's start year. */
  max: number;
  key: PaletteKey;
  era: string;
  instruments: string;
  tempo: number;
}

/** The structured reading Gemini returns (after user facts are merged in). */
export interface Analysis {
  buildingType: string;
  styleLabel: string;
  eraLabel: string;
  eraStartYear: number;
  regionGuess: string;
  materials: string[];
  structuralRhythm: string;
  repetitionCount: number;
  confidenceNote: string;
  historicalRationale: string;
  musicalReference: string;
}

export interface Meter {
  num: number;
  den: number;
  /** Bar length in sixteenths. */
  barLength: number;
  /** Beat onsets within a bar, in sixteenths. */
  beats: number[];
  /** Eighth-note grouping for asymmetric meters (e.g. [3, 2] for 5/8). */
  beatGroups?: number[];
}

/** One melody note. Times are in sixteenth notes from the start of the phrase. */
export interface NoteEvent {
  index: number;
  bar: number;
  start: number;
  dur: number;
  midi: number;
  name: string;
  /** Appoggiatura: sounds first, on the beat, taking `dur` sixteenths from the main note. */
  grace?: { midi: number; name: string; dur: number };
}

export interface PadHit {
  start: number;
  dur: number;
  midis: number[];
  names: string[];
}

export interface PercHit {
  start: number;
  dur: number;
  accent: boolean;
}

export interface Music {
  scale: Scale;
  palette: EraPalette;
  materialFreq: number;
  materialLabel: string;
  rootOffset: number;
  rootName: string;
  /** Number of bars: one per structural bay. */
  steps: number;
  meter: Meter;
  events: NoteEvent[];
  padHits: PadHit[];
  percHits: PercHit[];
  /** Phrase length in sixteenths. */
  totalLength: number;
  /** Arch value (0..1) for each bar — the structure's silhouette. */
  archCurve: number[];
  /** The anchor pitch each bar's figure is built around. */
  anchorMidis: number[];
  graceCount: number;
  /** One-line description of the riff idea, for the UI. */
  figureLabel: string;
  /** Who wrote the melody: Gemini (per the GenerativeMusic skill) or the local fallback. */
  source: "gemini" | "local";
  /** Bars of Gemini's output the app had to repair or substitute. */
  repairedBars: number[];
  /** Per-structure reverb: sends, dry/wet, pre-delay and room size. */
  mix: MixSettings;
}

export interface ManualFacts {
  name: string;
  year: string;
  location: string;
  style: string;
  materials: string;
  notes: string;
}

export interface UploadedImage {
  base64: string;
  mediaType: string;
  /** Full data URL, for previewing. */
  url: string;
}

export const EMPTY_MANUAL: ManualFacts = {
  name: "",
  year: "",
  location: "",
  style: "",
  materials: "",
  notes: "",
};
