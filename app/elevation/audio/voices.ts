// Soundfont instrument choice per era. Pure data (no Tone.js), so the UI and the
// score can name the instruments without loading the audio engine.
// Keep in sync with INSTRUMENTS in scripts/fetch-soundfont.mjs.
import type { GMInstrument } from "../../../src/services/SoundfontService";
import type { PaletteKey } from "../types";

export interface VoiceSpec {
  instrument: GMInstrument;
  volume: number;
  release: number;
}

export interface EraVoices {
  lead: VoiceSpec;
  pad: VoiceSpec;
  /** Percussion plays the tonic in this octave on every beat. */
  perc: VoiceSpec & { octave: number };
}

export const ERA_VOICES: Record<PaletteKey, EraVoices> = {
  medieval: {
    lead: { instrument: "church_organ", volume: -9, release: 1.5 },
    pad: { instrument: "choir_aahs", volume: -11, release: 3 },
    perc: { instrument: "tubular_bells", volume: -18, release: 2, octave: 5 },
  },
  renaissance: {
    lead: { instrument: "orchestral_harp", volume: -3, release: 1.2 },
    pad: { instrument: "string_ensemble_2", volume: -13, release: 2 },
    perc: { instrument: "tinkle_bell", volume: -22, release: 0.6, octave: 5 },
  },
  baroque: {
    lead: { instrument: "harpsichord", volume: -4, release: 0.8 },
    pad: { instrument: "string_ensemble_1", volume: -13, release: 1.5 },
    perc: { instrument: "woodblock", volume: -18, release: 0.2, octave: 5 },
  },
  industrial: {
    lead: { instrument: "trumpet", volume: -8, release: 0.5 },
    pad: { instrument: "french_horn", volume: -14, release: 1 },
    perc: { instrument: "agogo", volume: -16, release: 0.2, octave: 4 },
  },
  artdeco: {
    lead: { instrument: "vibraphone", volume: -4, release: 1.2 },
    pad: { instrument: "brass_section", volume: -17, release: 1 },
    perc: { instrument: "melodic_tom", volume: -16, release: 0.3, octave: 3 },
  },
  midcentury: {
    lead: { instrument: "drawbar_organ", volume: -10, release: 0.3 },
    pad: { instrument: "pad_3_polysynth", volume: -16, release: 0.6 },
    perc: { instrument: "synth_drum", volume: -18, release: 0.2, octave: 3 },
  },
  postmodern: {
    lead: { instrument: "electric_piano_2", volume: -5, release: 0.8 },
    pad: { instrument: "pad_8_sweep", volume: -15, release: 1.5 },
    perc: { instrument: "fx_3_crystal", volume: -20, release: 0.6, octave: 5 },
  },
  contemporary: {
    lead: { instrument: "kalimba", volume: -3, release: 1 },
    pad: { instrument: "pad_7_halo", volume: -13, release: 3 },
    perc: { instrument: "glockenspiel", volume: -22, release: 0.5, octave: 6 },
  },
};
