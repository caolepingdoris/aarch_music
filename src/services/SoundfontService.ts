// Sampled instruments from the bundled General MIDI soundfont, played through Tone.Sampler.
//
// Samples live in src/assets/sf/<instrument>/<Note><Octave>.mp3 (FluidR3_GM, MIT;
// see src/assets/sf/README.md). Vite discovers them at build time and fingerprints
// each file, so playback needs no third-party CDN.
//
// Browser-only: imports Tone.js, so only load this module via dynamic import().
import * as Tone from "tone";

/** General MIDI instrument names bundled under src/assets/sf. */
export type GMInstrument =
  | "agogo"
  | "brass_section"
  | "choir_aahs"
  | "church_organ"
  | "drawbar_organ"
  | "electric_piano_2"
  | "french_horn"
  | "fx_3_crystal"
  | "glockenspiel"
  | "harpsichord"
  | "kalimba"
  | "melodic_tom"
  | "orchestral_harp"
  | "pad_3_polysynth"
  | "pad_7_halo"
  | "pad_8_sweep"
  | "string_ensemble_1"
  | "string_ensemble_2"
  | "synth_drum"
  | "tinkle_bell"
  | "trumpet"
  | "tubular_bells"
  | "vibraphone"
  | "woodblock";

// "/src/assets/sf/harpsichord/Eb4.mp3" → hashed asset URL
const SAMPLE_URLS = import.meta.glob("/src/assets/sf/*/*.mp3", {
  query: "?url",
  import: "default",
  eager: true,
}) as Record<string, string>;

/** instrument → { "Eb4": url, ... } */
const LIBRARY: Record<string, Record<string, string>> = {};
for (const [path, url] of Object.entries(SAMPLE_URLS)) {
  const match = path.match(/\/sf\/([^/]+)\/([A-G]b?\d)\.mp3$/);
  if (!match) continue;
  (LIBRARY[match[1]] ??= {})[match[2]] = url;
}

type BufferMap = Record<string, AudioBuffer>;

// Decoded buffers survive across plays (samplers are disposed on stop, the raw
// AudioBuffers are not), so replaying or recomposing never re-decodes.
const cache = new Map<GMInstrument, Promise<BufferMap>>();

function loadInstrument(instrument: GMInstrument): Promise<BufferMap> {
  let pending = cache.get(instrument);
  if (!pending) {
    const files = LIBRARY[instrument];
    if (!files) return Promise.reject(new Error(`No samples bundled for "${instrument}" — run scripts/fetch-soundfont.mjs`));
    pending = (async () => {
      const entries = await Promise.all(
        Object.entries(files).map(async ([note, url]) => [note, (await new Tone.ToneAudioBuffer().load(url)).get()] as const)
      );
      const map: BufferMap = {};
      for (const [note, buffer] of entries) if (buffer) map[note] = buffer;
      return map;
    })();
    pending.catch(() => cache.delete(instrument));
    cache.set(instrument, pending);
  }
  return pending;
}

export interface SoundfontVoiceOptions {
  instrument: GMInstrument;
  volume?: number;
  /** Seconds of fade after a note is released. */
  release?: number;
}

/** Decodes (or reuses) the instrument's samples and returns a ready-to-play sampler. */
export async function createSoundfontVoice({ instrument, volume = 0, release = 1 }: SoundfontVoiceOptions): Promise<Tone.Sampler> {
  const urls = await loadInstrument(instrument);
  return new Tone.Sampler({ urls, volume, release });
}
