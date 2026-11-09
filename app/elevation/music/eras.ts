import type { EraPalette } from "../types";

// `instruments` describes the soundfont voices chosen in audio/instruments.ts.
// The room (reverb) for each era is derived in src/services/MixService.ts.
export const ERA_PALETTES: EraPalette[] = [
  { max: 1400, key: "medieval", era: "Romanesque / early medieval", instruments: "church organ line + choir pad, tolling tubular bells", tempo: 60 },
  { max: 1600, key: "renaissance", era: "Gothic / Renaissance", instruments: "harp melody + string consort pad, small bells", tempo: 72 },
  { max: 1830, key: "baroque", era: "Baroque / Neoclassical", instruments: "harpsichord line + chamber string pad, woodblock pulse", tempo: 84 },
  { max: 1900, key: "industrial", era: "Industrial / Victorian", instruments: "trumpet lead + french horn pad, agogo rivets", tempo: 100 },
  { max: 1945, key: "artdeco", era: "Early Modern / Art Deco", instruments: "vibraphone lead + brass section pad, melodic toms", tempo: 112 },
  { max: 1980, key: "midcentury", era: "Mid-century Modern / Brutalist", instruments: "drawbar organ lead + polysynth pad, synth drum pulse", tempo: 120 },
  { max: 2010, key: "postmodern", era: "Postmodern / High-tech", instruments: "FM electric piano lead + sweeping pad, crystal accents", tempo: 128 },
  { max: Infinity, key: "contemporary", era: "Contemporary / Parametric", instruments: "kalimba lead + halo pad, glockenspiel glints", tempo: 138 },
];

/** Era reading → tempo and instrument family. */
export function pickEraPalette(eraStartYear: unknown): EraPalette {
  const y = typeof eraStartYear === "number" ? eraStartYear : 1950;
  return ERA_PALETTES.find((p) => y < p.max) || ERA_PALETTES[ERA_PALETTES.length - 1];
}
