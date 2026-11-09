import type { Scale } from "../types";

export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** Region reading → a scale from that broad musical tradition. */
export function pickScale(regionGuess = ""): Scale {
  const r = regionGuess.toLowerCase();
  if (/china|japan|korea|east asia/.test(r)) return { name: "pentatonic major", intervals: [0, 2, 4, 7, 9], lilyMode: "major" };
  if (/middle east|persia|arab|turk/.test(r)) return { name: "phrygian dominant", intervals: [0, 1, 4, 5, 7, 8, 10], lilyMode: "phrygian" };
  if (/india|south asia/.test(r)) return { name: "raga-inspired mode", intervals: [0, 1, 4, 5, 7, 8, 11], lilyMode: "phrygian" };
  if (/africa/.test(r)) return { name: "pentatonic minor", intervals: [0, 3, 5, 7, 10], lilyMode: "minor" };
  if (/latin america|south america|mexico|caribbean/.test(r)) return { name: "phrygian", intervals: [0, 1, 3, 5, 7, 8, 10], lilyMode: "phrygian" };
  if (/united states|north america|americas/.test(r)) return { name: "mixolydian", intervals: [0, 2, 4, 5, 7, 9, 10], lilyMode: "mixolydian" };
  if (/europe/.test(r)) return { name: "aeolian", intervals: [0, 2, 3, 5, 7, 8, 10], lilyMode: "minor" };
  if (/oceania|australia|pacific/.test(r)) return { name: "pentatonic major", intervals: [0, 2, 4, 7, 9], lilyMode: "major" };
  return { name: "dorian", intervals: [0, 2, 3, 5, 7, 9, 10], lilyMode: "dorian" };
}
