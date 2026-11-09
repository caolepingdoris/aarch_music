// Downloads the soundfont samples the app uses into src/assets/sf/<instrument>/<Note>.mp3.
//
//   node scripts/fetch-soundfont.mjs            # only missing files
//   node scripts/fetch-soundfont.mjs --force    # re-download everything
//
// Source: gleitz/midi-js-soundfonts, pre-rendered FluidR3_GM (MIT licence).
// Keep INSTRUMENTS in sync with ERA_VOICES in app/elevation/audio/instruments.ts.
import { mkdir, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FONT = "FluidR3_GM";
const BASE = `https://gleitz.github.io/midi-js-soundfonts/${FONT}`;
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "assets", "sf");

// Every minor third; Tone.Sampler repitches at most 1.5 semitones between them.
const PITCHES = ["C", "Eb", "Gb", "A"];
const LEAD = [3, 4, 5, 6];
const PAD = [2, 3, 4];

/** instrument → octaves to sample */
const INSTRUMENTS = {
  // leads
  church_organ: LEAD,
  orchestral_harp: LEAD,
  harpsichord: LEAD,
  trumpet: LEAD,
  vibraphone: LEAD,
  drawbar_organ: LEAD,
  electric_piano_2: LEAD,
  kalimba: LEAD,
  // pads
  choir_aahs: PAD,
  string_ensemble_2: PAD,
  string_ensemble_1: PAD,
  french_horn: PAD,
  brass_section: PAD,
  pad_3_polysynth: PAD,
  pad_8_sweep: PAD,
  pad_7_halo: PAD,
  // percussion (root note in one octave, plus the octave above for repitching)
  tubular_bells: [5, 6],
  tinkle_bell: [5, 6],
  woodblock: [5, 6],
  agogo: [4, 5],
  melodic_tom: [3, 4],
  synth_drum: [3, 4],
  fx_3_crystal: [5, 6],
  glockenspiel: [6, 7],
};

const force = process.argv.includes("--force");
const exists = (p) => stat(p).then(() => true, () => false);

const jobs = Object.entries(INSTRUMENTS).flatMap(([instrument, octaves]) =>
  octaves.flatMap((o) => PITCHES.map((p) => ({ instrument, note: `${p}${o}` })))
);

let fetched = 0;
let skipped = 0;
const queue = [...jobs];
async function worker() {
  for (let job = queue.shift(); job; job = queue.shift()) {
    const file = join(OUT, job.instrument, `${job.note}.mp3`);
    if (!force && (await exists(file))) {
      skipped++;
      continue;
    }
    const res = await fetch(`${BASE}/${job.instrument}-mp3/${job.note}.mp3`);
    if (!res.ok) throw new Error(`${res.status} for ${job.instrument}/${job.note}`);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, Buffer.from(await res.arrayBuffer()));
    fetched++;
  }
}
await Promise.all(Array.from({ length: 8 }, worker));
console.log(`soundfont: ${fetched} downloaded, ${skipped} already present → ${OUT}`);
