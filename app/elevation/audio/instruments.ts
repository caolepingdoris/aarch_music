// Browser-only: this module imports Tone.js and is loaded with a dynamic import()
// from usePlayback so it never runs during server rendering.
import * as Tone from "tone";
import { MixService } from "../../../src/services/MixService";
import { createSoundfontVoice } from "../../../src/services/SoundfontService";
import type { Music } from "../types";
import { ERA_VOICES } from "./voices";

export interface Rack {
  lead: Tone.Sampler;
  pad: Tone.Sampler;
  perc: Tone.Sampler;
  percNote: string;
  mix: MixService;
  /** Every node created, for disposal (the mix bus disposes itself). */
  nodes: Tone.ToneAudioNode[];
}

/** Decodes the era's soundfont samples and routes them through the structure's room. */
export async function buildInstruments(music: Music): Promise<Rack> {
  const voices = ERA_VOICES[music.palette.key];

  const [mix, lead, pad, perc] = await Promise.all([
    MixService.create(music.mix),
    createSoundfontVoice(voices.lead),
    createSoundfontVoice(voices.pad),
    createSoundfontVoice(voices.perc),
  ]);

  // Material still colours the lead before it reaches the room.
  const filter = new Tone.Filter(music.materialFreq, "lowpass").connect(mix.input("lead"));
  lead.connect(filter);
  pad.connect(mix.input("pad"));
  perc.connect(mix.input("perc"));

  return {
    lead,
    pad,
    perc,
    percNote: music.rootName + voices.perc.octave,
    mix,
    nodes: [filter, lead, pad, perc],
  };
}

export function disposeRack(rack: Rack) {
  try {
    rack.pad.releaseAll();
  } catch {}
  rack.nodes.forEach((n) => {
    try {
      n.dispose();
    } catch {}
  });
  rack.mix.dispose();
}
