// Turns a generated score into LilyPond source.
//
// Pure and isomorphic: the browser uses it for the "Download .ly" button and the
// source view, and the server uses it to engrave. The server never accepts LilyPond
// text from the client (LilyPond can run Scheme), only ScoreData, which
// parseScoreData() validates as plain numbers before toLilyPond() writes the source.
import type { LilyMode, Music } from "~/elevation/types";

export interface ScoreData {
  tempo: number;
  meter: { num: number; den: number; barLength: number; beatGroups?: number[] };
  /** Tonic pitch class, 0 = C. */
  tonic: number;
  mode: LilyMode;
  totalLength: number;
  lead: { index: number; start: number; dur: number; midi: number; grace?: { midi: number; dur: number } }[];
  pad: { start: number; dur: number; midis: number[] }[];
  perc: { start: number; dur: number; accent: boolean }[];
  leadName: string;
  padName: string;
  percName: string;
}

/** "brass_section" → "BRASS SECTION". Names are set in a monospace font, so capitals cost no extra width. */
const titleCase = (s: string) => s.replace(/_/g, " ").toUpperCase();

export function toScoreData(music: Music, voices?: { lead: string; pad: string; perc: string }): ScoreData {
  return {
    tempo: music.palette.tempo,
    meter: { num: music.meter.num, den: music.meter.den, barLength: music.meter.barLength, beatGroups: music.meter.beatGroups },
    tonic: music.rootOffset % 12,
    mode: music.scale.lilyMode,
    totalLength: music.totalLength,
    lead: music.events.map((e) => ({
      index: e.index,
      start: e.start,
      dur: e.dur,
      midi: e.midi,
      grace: e.grace ? { midi: e.grace.midi, dur: e.grace.dur } : undefined,
    })),
    pad: music.padHits.map((p) => ({ start: p.start, dur: p.dur, midis: p.midis })),
    perc: music.percHits.map((p) => ({ start: p.start, dur: p.dur, accent: p.accent })),
    leadName: titleCase(voices?.lead ?? "Lead"),
    padName: titleCase(voices?.pad ?? "Pad"),
    percName: titleCase(voices?.perc ?? "Perc."),
  };
}

// ── Validation (server side) ────────────────────────────────────────────────

const MODES: LilyMode[] = ["major", "minor", "dorian", "phrygian", "mixolydian"];

function int(v: unknown, lo: number, hi: number, what: string): number {
  if (typeof v !== "number" || !Number.isInteger(v) || v < lo || v > hi) throw new Error(`invalid ${what}`);
  return v;
}
function list(v: unknown, max: number, what: string): unknown[] {
  if (!Array.isArray(v) || v.length > max) throw new Error(`invalid ${what}`);
  return v;
}
function name(v: unknown): string {
  if (typeof v !== "string" || !/^[A-Za-z0-9 .\-]{1,32}$/.test(v)) throw new Error("invalid instrument name");
  return v;
}

export function parseScoreData(input: unknown): ScoreData {
  const d = input as Record<string, any>;
  if (!d || typeof d !== "object") throw new Error("invalid score");
  const meter = d.meter ?? {};
  const m = {
    num: int(meter.num, 1, 16, "meter"),
    den: int(meter.den, 2, 16, "meter"),
    barLength: int(meter.barLength, 1, 32, "meter"),
    beatGroups: meter.beatGroups == null ? undefined : list(meter.beatGroups, 8, "beat groups").map((g) => int(g, 1, 8, "beat group")),
  };
  if (m.barLength !== (m.num * 16) / m.den) throw new Error("invalid meter");
  if (!MODES.includes(d.mode)) throw new Error("invalid mode");
  const totalLength = int(d.totalLength, 1, 16 * 32, "length");

  return {
    tempo: int(d.tempo, 20, 300, "tempo"),
    meter: m,
    tonic: int(d.tonic, 0, 11, "tonic"),
    mode: d.mode,
    totalLength,
    lead: list(d.lead, 512, "lead").map((raw: any) => ({
      index: int(raw?.index, 0, 511, "index"),
      start: int(raw?.start, 0, totalLength, "start"),
      dur: int(raw?.dur, 1, 16, "duration"),
      midi: int(raw?.midi, 21, 108, "pitch"),
      grace: raw?.grace ? { midi: int(raw.grace.midi, 21, 108, "grace pitch"), dur: int(raw.grace.dur, 1, 8, "grace duration") } : undefined,
    })),
    pad: list(d.pad, 256, "pad").map((raw: any) => ({
      start: int(raw?.start, 0, totalLength, "start"),
      dur: int(raw?.dur, 1, 16 * 32, "duration"),
      midis: list(raw?.midis, 6, "chord").map((n) => int(n, 21, 108, "pitch")),
    })),
    perc: list(d.perc, 512, "perc").map((raw: any) => ({
      start: int(raw?.start, 0, totalLength, "start"),
      dur: int(raw?.dur, 1, 32, "duration"),
      accent: raw?.accent === true,
    })),
    leadName: name(d.leadName),
    padName: name(d.padName),
    percName: name(d.percName),
  };
}

// ── LilyPond writer ─────────────────────────────────────────────────────────

const SHARP_NAMES = ["c", "cis", "d", "dis", "e", "f", "fis", "g", "gis", "a", "ais", "b"];
const FLAT_NAMES = ["c", "des", "d", "ees", "e", "f", "ges", "g", "aes", "a", "bes", "b"];
/** Semitones from the mode's tonic down to its relative major. */
const MODE_TO_MAJOR: Record<LilyMode, number> = { major: 0, dorian: 2, phrygian: 4, mixolydian: 7, minor: 9 };
/** Major keys written with flats: F, B♭, E♭, A♭, D♭. */
const FLAT_MAJORS = new Set([5, 10, 3, 8, 1]);

/** Sixteenths → LilyPond duration, largest first. */
const DURATIONS: [number, string][] = [
  [16, "1"],
  [12, "2."],
  [8, "2"],
  [6, "4."],
  [4, "4"],
  [3, "8."],
  [2, "8"],
  [1, "16"],
];

function lyDuration(sixteenths: number): string {
  const hit = DURATIONS.find(([len]) => len === sixteenths);
  if (!hit) throw new Error(`no single LilyPond duration for ${sixteenths}/16`);
  return hit[1];
}

/** Split a span at barlines, then into notatable values (to be tied). */
function splitSpan(start: number, dur: number, barLength: number): number[] {
  const parts: number[] = [];
  let t = start;
  let left = dur;
  while (left > 0) {
    let chunk = Math.min(left, barLength - (t % barLength));
    t += chunk;
    left -= chunk;
    while (chunk > 0) {
      const [len] = DURATIONS.find(([l]) => l <= chunk)!;
      parts.push(len);
      chunk -= len;
    }
  }
  return parts;
}

export function toLilyPond(data: ScoreData): string {
  const flats = FLAT_MAJORS.has((data.tonic - MODE_TO_MAJOR[data.mode] + 12) % 12);
  const names = flats ? FLAT_NAMES : SHARP_NAMES;
  // Absolute pitch: c' is middle C (MIDI 60).
  const pitch = (midi: number) => {
    const octave = Math.floor(midi / 12) - 4;
    return names[midi % 12] + (octave > 0 ? "'".repeat(octave) : ",".repeat(-octave));
  };
  const chord = (midis: number[]) => (midis.length === 1 ? pitch(midis[0]) : `<${midis.map(pitch).join(" ")}>`);
  const { barLength } = data.meter;

  const lead = data.lead
    .map((e) => {
      const main = `\\tweak output-attributes #'((data-ev . "${e.index}")) ${pitch(e.midi)}${lyDuration(e.dur)}`;
      if (!e.grace) return main;
      const grace = `\\tweak output-attributes #'((class . "el-ly-grace")) ${pitch(e.grace.midi)}${lyDuration(e.grace.dur)}`;
      return `\\appoggiatura ${grace} ${main}`;
    })
    .join(" ");

  const tied = (start: number, dur: number, note: string, first = "") =>
    splitSpan(start, dur, barLength)
      .map((len, i, all) => `${note}${lyDuration(len)}${i === 0 ? first : ""}${i < all.length - 1 ? " ~" : ""}`)
      .join(" ");

  const pad = data.pad.map((p) => tied(p.start, p.dur, chord(p.midis))).join(" ");
  const perc = data.perc.map((p) => tied(p.start, p.dur, "c", p.accent ? "->" : "")).join(" ");

  const beatStructure = data.meter.beatGroups ? `\\set Timing.beatStructure = ${data.meter.beatGroups.join(",")}` : "";
  const quote = (s: string) => `"${s.replace(/["\\]/g, "")}"`;

  return `\\version "2.24.0"
% The Resonant Frame: generated score. One bar per structural bay.

\\header { tagline = ##f }

\\paper {
  line-width = 150\\mm
  indent = 28\\mm
  short-indent = 9\\mm
  ragged-last = ##t
  page-breaking = #ly:one-page-breaking
  print-page-number = ##f
  oddHeaderMarkup = ##f
  evenHeaderMarkup = ##f
  oddFooterMarkup = ##f
  evenFooterMarkup = ##f
  system-system-spacing = #'((basic-distance . 15) (padding . 3))
}

\\layout {
  \\context {
    \\Score
    barNumberVisibility = #all-bar-numbers-visible
    \\override BarNumber.break-visibility = ##(#f #t #t)
    \\override BarNumber.font-size = #-2
    \\override BarNumber.output-attributes = #'((class . "el-ly-barnum"))
    \\override MetronomeMark.output-attributes = #'((class . "el-ly-tempo"))
    \\override SpacingSpanner.base-shortest-duration = #(ly:make-moment 1/32)
  }
  \\context {
    \\Staff
    \\override InstrumentName.output-attributes = #'((class . "el-ly-name"))
    \\override InstrumentName.font-family = #'typewriter
    \\override InstrumentName.font-size = #-2
    \\override StaffSymbol.output-attributes = #'((class . "el-ly-staff"))
  }
  \\context {
    \\RhythmicStaff
    \\override InstrumentName.output-attributes = #'((class . "el-ly-name"))
    \\override InstrumentName.font-family = #'typewriter
    \\override InstrumentName.font-size = #-2
    \\override StaffSymbol.output-attributes = #'((class . "el-ly-staff"))
    \\override NoteHead.output-attributes = #'((class . "el-ly-perc"))
  }
}

global = {
  \\key ${names[data.tonic]} \\${data.mode}
  \\time ${data.meter.num}/${data.meter.den}
  ${beatStructure}
  \\bar ""
}

\\score {
  <<
    \\new Staff \\with { instrumentName = ${quote(data.leadName)} shortInstrumentName = "L." } {
      \\global \\clef treble \\tempo 4 = ${data.tempo}
      ${lead} \\bar "|."
    }
    \\new Staff \\with { instrumentName = ${quote(data.padName)} shortInstrumentName = "P." } {
      \\global \\clef bass
      ${pad} \\bar "|."
    }
    \\new RhythmicStaff \\with { instrumentName = ${quote(data.percName)} shortInstrumentName = "PC." } {
      \\time ${data.meter.num}/${data.meter.den}
      ${beatStructure}
      ${perc} \\bar "|."
    }
  >>
  \\layout { }
}
`;
}
