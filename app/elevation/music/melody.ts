// Era styles for the melody. Mirrors the era table in src/assets/skill/GenerativeMusic.md,
// which is the brief Gemini composes from; riff.ts uses these for the local fallback.
//
// Architecture → music mapping
//   • one bar per structural bay (repetitionCount bars)
//   • the arch over the whole façade sets each bar's anchor pitch (silhouette → contour)
//     and its rhythmic density: sparse dotted values at the edges, sixteenth runs at the crown
//   • the era chooses the meter, the rhythmic cells and the melodic figure (see ERA_STYLES)
//   • appoggiaturas lean into long notes, always at the crown and the final cadence
//
// All durations are in sixteenth notes: 1 = 16th, 2 = 8th, 3 = dotted 8th,
// 4 = quarter, 6 = dotted quarter.
import type { Meter, PaletteKey } from "../types";

export type Cells = { sparse: number[][]; medium: number[][]; dense: number[][] };

export interface EraStyle {
  meter: Meter;
  cells: Cells;
  /** Scale-degree offsets around the bar's anchor, cycled across the bar's notes. */
  figure: (arch: number) => number[];
  /** Advance the figure by this many notes each bar, so bays vary (0 = identical modules). */
  figureShift: number;
  /** Chance of an appoggiatura on any note a quarter or longer. */
  graceRate: number;
  /** Lean from a chromatic semitone below instead of the scale step above. */
  graceFromBelow?: boolean;
  /** Use the same cell in every bar (modular, grid-like façades). */
  modular?: boolean;
  label: string;
}

const meter = (num: number, den: number, beatsInEighths?: number[]): Meter => {
  const barLength = (num * 16) / den;
  const beats: number[] = [];
  if (beatsInEighths) {
    let t = 0;
    for (const b of beatsInEighths) {
      beats.push(t);
      t += b * 2;
    }
  } else {
    const beatLen = den === 8 ? 6 : 4;
    for (let t = 0; t < barLength; t += beatLen) beats.push(t);
  }
  return { num, den, barLength, beats, beatGroups: beatsInEighths };
};

export const ERA_STYLES: Record<PaletteKey, EraStyle> = {
  medieval: {
    // Notre-Dame school rhythmic modes: long–short trochees in compound time.
    meter: meter(6, 8),
    cells: {
      sparse: [[6, 6], [4, 2, 6]],
      medium: [[4, 2, 4, 2], [6, 4, 2]],
      dense: [[4, 2, 3, 1, 2], [2, 2, 2, 4, 2]],
    },
    figure: () => [0, 1, 0, -1, -2, -1],
    figureShift: 1,
    graceRate: 0.15,
    label: "rhythmic-mode chant: long–short trochees in 6/8, stepwise neumes",
  },
  renaissance: {
    meter: meter(3, 4),
    cells: {
      sparse: [[6, 2, 4], [4, 4, 4]],
      medium: [[4, 3, 1, 4], [3, 1, 4, 4], [6, 2, 2, 2]],
      dense: [[2, 2, 3, 1, 4], [3, 1, 2, 2, 4]],
    },
    figure: () => [2, 1, 0, 1, 0, -1],
    figureShift: 2,
    graceRate: 0.3,
    label: "flowing imitative line in 3/4, stepping down into each bay",
  },
  baroque: {
    meter: meter(2, 4),
    cells: {
      sparse: [[6, 2], [4, 4]],
      medium: [[3, 1, 2, 2], [2, 2, 3, 1]],
      dense: [[1, 1, 1, 1, 2, 2], [2, 1, 1, 2, 1, 1], [3, 1, 1, 1, 2]],
    },
    figure: () => [0, 2, 4, 2, 0, -1, 0, 2],
    figureShift: 3,
    graceRate: 0.45,
    label: "ornamented broken chords and turns, dense with appoggiaturas",
  },
  industrial: {
    meter: meter(2, 4),
    cells: {
      sparse: [[6, 2], [4, 4]],
      medium: [[3, 1, 3, 1], [3, 1, 4]],
      dense: [[3, 1, 1, 1, 2], [1, 1, 2, 3, 1]],
    },
    figure: () => [0, 0, 4, 0, 0, 3],
    figureShift: 0,
    graceRate: 0.1,
    label: "dotted march rhythms and repeated piston strokes in 2/4",
  },
  artdeco: {
    meter: meter(2, 4),
    cells: {
      sparse: [[3, 3, 2], [6, 2]],
      medium: [[3, 3, 2], [2, 3, 3], [1, 2, 1, 4]],
      dense: [[1, 2, 1, 2, 2], [3, 1, 2, 1, 1]],
    },
    figure: () => [-1, 0, 2, 1, 3, 2],
    figureShift: 1,
    graceRate: 0.35,
    graceFromBelow: true,
    label: "syncopated tresillo setbacks stepping upward like a ziggurat",
  },
  midcentury: {
    meter: meter(2, 4),
    cells: {
      sparse: [[6, 2], [2, 2, 4]],
      medium: [[3, 1, 2, 2], [2, 1, 1, 4], [3, 3, 2]],
      dense: [[1, 1, 2, 1, 1, 2], [2, 1, 1, 2, 2]],
    },
    figure: () => [0, 2, 1],
    figureShift: 0,
    graceRate: 0.05,
    modular: true,
    label: "one modular three-note cell, repeated like a structural grid",
  },
  postmodern: {
    // 2+2+3 eighths: deliberate asymmetry.
    meter: meter(7, 8, [2, 2, 3]),
    cells: {
      sparse: [[4, 4, 6], [6, 2, 6]],
      medium: [[4, 3, 1, 6], [2, 2, 4, 6]],
      dense: [[2, 2, 3, 1, 4, 2], [1, 1, 2, 4, 3, 1, 2]],
    },
    figure: () => [0, 4, -1, 3, 1, 5],
    figureShift: 2,
    graceRate: 0.25,
    label: "collaged quotations: wide leaps in asymmetric 7/8",
  },
  contemporary: {
    // 3+2 eighths.
    meter: meter(5, 8, [3, 2]),
    cells: {
      sparse: [[6, 4], [4, 6]],
      medium: [[3, 1, 2, 4], [6, 2, 2]],
      dense: [[2, 1, 1, 2, 2, 2], [1, 1, 2, 3, 1, 2]],
    },
    figure: (arch) => {
      const k = 1 + Math.round(arch * 2);
      return [0, k, 2 * k, k, 0];
    },
    figureShift: 1,
    graceRate: 0.2,
    label: "parametric figure in 5/8: intervals widen as the form swells",
  },
};
