// Per-structure reverb: derives a room from the architectural reading and builds
// the matching Tone.js mix bus.
//
// deriveMixSettings() is pure and safe during server rendering. MixService.create()
// loads Tone.js lazily, so importing this module never touches Web Audio on the server.
import type * as ToneNS from "tone";
import type { Analysis, EraPalette, PaletteKey } from "~/elevation/types";

export type VoiceName = "lead" | "pad" | "perc";

export interface MixSettings {
  /** Reverb mix: how much of each voice is sent into the reverb (0..1). */
  sends: Record<VoiceName, number>;
  /** Dry/wet ratio of the master output: 0 = fully dry, 1 = fully wet. */
  dryWet: number;
  /** Seconds before the first reflection arrives. */
  preDelay: number;
  /** Room size, 0 (small room) .. 1 (vast nave). Sets the decay time. */
  size: number;
  /** Decay time in seconds that `size` maps to. */
  decay: number;
  /** One-line description of the space, for the UI. */
  spaceLabel: string;
}

// ── Derivation ──────────────────────────────────────────────────────────────

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const round = (v: number, places = 3) => Math.round(v * 10 ** places) / 10 ** places;

interface SpaceType {
  pattern: RegExp;
  size: number;
  /** Open-air structures: late, sparse reflections off distant surfaces. */
  open?: boolean;
  label: string;
}

/** Whole-word match (plurals allowed), so "Notre-Dame" doesn't read as a dam. */
const words = (...list: string[]) => new RegExp(`\\b(?:${list.join("|")})s?\\b`);

const SPACE_TYPES: SpaceType[] = [
  { pattern: words("cathedral", "basilica", "church", "chapel", "abbey", "minster", "mosque", "temple", "shrine", "pantheon", "dome", "notre-dame", "duomo"), size: 0.92, label: "a vaulted sacred interior" },
  { pattern: words("station", "terminal", "airport", "hangar", "arena", "stadium", "hall", "atrium", "warehouse", "factory", "mill"), size: 0.72, label: "a large hard-walled hall" },
  { pattern: words("museum", "gallery", "library", "opera", "theater", "theatre", "concert", "palace", "castle", "parliament", "capitol"), size: 0.62, label: "a grand public room" },
  { pattern: words("tower", "skyscraper", "office", "apartment", "hotel", "bank", "school", "hospital"), size: 0.42, label: "a medium room" },
  { pattern: words("house", "home", "villa", "cottage", "cabin", "residence", "pavilion", "hut", "teahouse"), size: 0.24, label: "an intimate room" },
  { pattern: words("bridge", "dam", "aqueduct", "viaduct", "monument", "obelisk", "plaza", "square", "park", "wall", "gate", "arch", "lighthouse", "ruin"), size: 0.55, open: true, label: "open air, echoing off distant surfaces" },
];

/** Era sets a baseline room: medieval stone spaces ring longest, mid-century rooms are driest. */
const ERA_SIZE: Record<PaletteKey, number> = {
  medieval: 0.88,
  renaissance: 0.66,
  baroque: 0.56,
  industrial: 0.46,
  artdeco: 0.5,
  midcentury: 0.26,
  postmodern: 0.44,
  contemporary: 0.62,
};

/** Per-era send levels: which voices bloom in the room and which stay close. */
const ERA_SENDS: Record<PaletteKey, Record<VoiceName, number>> = {
  medieval: { lead: 0.75, pad: 0.95, perc: 0.85 },
  renaissance: { lead: 0.55, pad: 0.85, perc: 0.6 },
  baroque: { lead: 0.45, pad: 0.8, perc: 0.35 },
  industrial: { lead: 0.4, pad: 0.65, perc: 0.55 },
  artdeco: { lead: 0.55, pad: 0.7, perc: 0.3 },
  midcentury: { lead: 0.3, pad: 0.5, perc: 0.2 },
  postmodern: { lead: 0.6, pad: 0.8, perc: 0.45 },
  contemporary: { lead: 0.7, pad: 1, perc: 0.5 },
};

/** Material reflectivity: hard surfaces lengthen and brighten, soft ones absorb. */
function materialAdjust(materials: string[] = []) {
  const m = materials.join(" ").toLowerCase();
  let size = 0;
  let wet = 0;
  if (/stone|marble|granite|masonry|brick|concrete/.test(m)) {
    size += 0.1;
    wet += 0.08;
  }
  if (/glass/.test(m)) {
    size += 0.05;
    wet += 0.05;
  }
  if (/steel|iron|metal/.test(m)) {
    size += 0.04;
    wet += 0.03;
  }
  if (/wood|timber|bamboo|thatch/.test(m)) {
    size -= 0.1;
    wet -= 0.06;
  }
  return { size, wet };
}

/** Small deterministic offset so two similar readings still get distinct rooms. */
function jitter(seed: string, amount: number): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return (((h >>> 0) % 1000) / 1000 - 0.5) * 2 * amount;
}

export function deriveMixSettings(analysis: Analysis, palette: EraPalette): MixSettings {
  const type = (analysis.buildingType || "").toLowerCase() + " " + (analysis.styleLabel || "").toLowerCase();
  const space = SPACE_TYPES.find((s) => s.pattern.test(type));
  const material = materialAdjust(analysis.materials);
  const seed = `${analysis.buildingType}|${analysis.styleLabel}|${analysis.eraStartYear}`;

  const eraSize = ERA_SIZE[palette.key];
  const baseSize = space ? space.size * 0.65 + eraSize * 0.35 : eraSize;
  const size = clamp(baseSize + material.size + jitter(seed + "size", 0.04), 0.08, 1);

  // Size → decay: 0.5s small room up to ~10s for a great cathedral.
  const decay = 0.5 + size ** 1.6 * 9.5;

  // Bigger rooms put the first reflection further away; open air delays it most.
  const preDelay = clamp(0.004 + size * 0.05 + (space?.open ? 0.045 : 0) + jitter(seed + "pre", 0.006), 0.002, 0.12);

  const dryWet = clamp(
    0.14 + size * 0.36 + material.wet - (space?.open ? 0.08 : 0) + jitter(seed + "wet", 0.03),
    0.08,
    0.65
  );

  const sends = { ...ERA_SENDS[palette.key] };
  // Lots of repetition (colonnades, bays) reads busier, so keep the lead a little drier.
  const busy = clamp(((analysis.repetitionCount || 8) - 8) / 8, -0.5, 1);
  sends.lead = clamp(sends.lead - busy * 0.1, 0, 1);

  return {
    sends: { lead: round(sends.lead, 2), pad: round(sends.pad, 2), perc: round(sends.perc, 2) },
    dryWet: round(dryWet, 2),
    preDelay: round(preDelay, 3),
    size: round(size, 2),
    decay: round(decay, 2),
    spaceLabel: space?.label ?? `a room sized by its era (${palette.era})`,
  };
}

// ── Audio graph ─────────────────────────────────────────────────────────────

/**
 *   voice ─► channel ─┬──────────────► dry gain ─┐
 *                     └─► send gain ─► reverb ─► wet gain ─┴─► destination
 *                                     (preDelay, decay ← size)
 *
 * Dry and wet gains use an equal-power curve so changing the ratio keeps
 * perceived loudness steady.
 */
export class MixService {
  private constructor(
    readonly settings: MixSettings,
    private readonly channels: Record<VoiceName, ToneNS.Gain>,
    private readonly nodes: ToneNS.ToneAudioNode[]
  ) {}

  static async create(settings: MixSettings): Promise<MixService> {
    const Tone = await import("tone");
    const nodes: ToneNS.ToneAudioNode[] = [];
    const track = <T extends ToneNS.ToneAudioNode>(n: T) => (nodes.push(n), n);

    const angle = settings.dryWet * (Math.PI / 2);
    const dry = track(new Tone.Gain(Math.cos(angle))).toDestination();
    const wet = track(new Tone.Gain(Math.sin(angle))).toDestination();

    const reverb = track(new Tone.Reverb({ decay: settings.decay, preDelay: settings.preDelay, wet: 1 }));
    reverb.connect(wet);
    // The impulse response is generated asynchronously; wait so the first notes are reverberant.
    await reverb.ready;

    const makeChannel = (voice: VoiceName) => {
      const channel = track(new Tone.Gain(1));
      channel.connect(dry);
      channel.connect(track(new Tone.Gain(settings.sends[voice])).connect(reverb));
      return channel;
    };

    return new MixService(settings, { lead: makeChannel("lead"), pad: makeChannel("pad"), perc: makeChannel("perc") }, nodes);
  }

  /** The node a voice should connect to. */
  input(voice: VoiceName): ToneNS.Gain {
    return this.channels[voice];
  }

  dispose() {
    this.nodes.forEach((n) => {
      try {
        n.dispose();
      } catch {}
    });
  }
}
