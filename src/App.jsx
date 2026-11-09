import React, { useState, useRef, useCallback, useEffect } from "react";
import * as Tone from "tone";
import { Upload, Play, Square, Loader2, AlertCircle, RotateCcw } from "lucide-react";

const FONT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@300;500;600&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');";

const STYLE = `
${FONT_IMPORT}

.el-root {
  --bg: #10182B;
  --bg2: #182238;
  --panel: #1B2743;
  --paper: #ECE6D2;
  --ink: #E9E4D4;
  --muted: #8792A8;
  --brass: #C9A227;
  --brass-dim: #8C7220;
  --patina: #6FA8A0;
  --danger: #D96C5F;
  background: var(--bg);
  color: var(--ink);
  font-family: 'Inter', sans-serif;
  min-height: 100%;
  width: 100%;
  padding: 2.5rem 1.25rem 3rem;
  box-sizing: border-box;
}

.el-shell { max-width: 880px; margin: 0 auto; }

.el-header { margin-bottom: 2.25rem; border-bottom: 1px solid rgba(233,228,212,0.15); padding-bottom: 1.25rem; }
.el-eyebrow {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.68rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--brass);
  margin: 0 0 0.6rem 0;
}
.el-title {
  font-family: 'Fraunces', serif;
  font-weight: 500;
  font-size: clamp(2.2rem, 6vw, 3.4rem);
  letter-spacing: -0.01em;
  margin: 0;
  line-height: 1.02;
}
.el-title em { font-style: italic; font-weight: 300; color: var(--patina); }
.el-sub {
  margin: 0.75rem 0 0 0;
  color: var(--muted);
  font-size: 0.95rem;
  max-width: 52ch;
  line-height: 1.5;
}

.el-panel {
  background: var(--panel);
  border: 1px solid rgba(233,228,212,0.1);
  border-radius: 2px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}
.el-panel-title { font-family: 'IBM Plex Mono', monospace; font-size: 0.7rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--brass); margin: 0 0 1.1rem 0; }

.el-upload {
  position: relative;
  border: 1px dashed rgba(233,228,212,0.35);
  border-radius: 2px;
  padding: 2rem 1.5rem;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
}
.el-upload:hover { border-color: var(--brass); background: rgba(201,162,39,0.04); }
.el-corner { position: absolute; width: 12px; height: 12px; border-color: var(--brass); opacity: 0.7; }
.el-corner.tl { top: 8px; left: 8px; border-top: 1px solid; border-left: 1px solid; }
.el-corner.tr { top: 8px; right: 8px; border-top: 1px solid; border-right: 1px solid; }
.el-corner.bl { bottom: 8px; left: 8px; border-bottom: 1px solid; border-left: 1px solid; }
.el-corner.br { bottom: 8px; right: 8px; border-bottom: 1px solid; border-right: 1px solid; }

.el-upload-icon { color: var(--muted); margin-bottom: 0.7rem; }
.el-upload-label { font-family: 'IBM Plex Mono', monospace; font-size: 0.78rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink); }
.el-upload-hint { font-size: 0.82rem; color: var(--muted); margin-top: 0.4rem; }

.el-image-wrap { position: relative; border-radius: 2px; overflow: hidden; border: 1px solid rgba(233,228,212,0.12); }
.el-image { display: block; width: 100%; height: 260px; object-fit: cover; }
.el-grid-overlay {
  position: absolute; inset: 0;
  background-image:
    repeating-linear-gradient(0deg, rgba(233,228,212,0.08) 0px, rgba(233,228,212,0.08) 1px, transparent 1px, transparent 32px),
    repeating-linear-gradient(90deg, rgba(233,228,212,0.08) 0px, rgba(233,228,212,0.08) 1px, transparent 1px, transparent 32px);
  pointer-events: none;
}
.el-image-change {
  position: absolute; bottom: 10px; right: 10px;
  font-family: 'IBM Plex Mono', monospace; font-size: 0.68rem; letter-spacing: 0.08em; text-transform: uppercase;
  background: rgba(16,24,43,0.8); border: 1px solid rgba(233,228,212,0.3); color: var(--ink);
  padding: 0.4rem 0.65rem; border-radius: 2px; cursor: pointer;
}

.el-divider { display: flex; align-items: center; gap: 0.75rem; margin: 1.4rem 0 1.1rem; color: var(--muted); font-family: 'IBM Plex Mono', monospace; font-size: 0.66rem; letter-spacing: 0.16em; text-transform: uppercase; }
.el-divider::before, .el-divider::after { content: ''; flex: 1; height: 1px; background: rgba(233,228,212,0.12); }

.el-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.9rem; }
.el-field { display: flex; flex-direction: column; gap: 0.35rem; }
.el-field.full { grid-column: 1 / -1; }
.el-field-label { font-family: 'IBM Plex Mono', monospace; font-size: 0.64rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
.el-input, .el-textarea {
  background: rgba(233,228,212,0.04); border: 1px solid rgba(233,228,212,0.18); border-radius: 2px;
  padding: 0.55rem 0.7rem; color: var(--ink); font-family: 'Inter', sans-serif; font-size: 0.88rem; outline: none;
  transition: border-color 0.15s ease;
}
.el-input:focus, .el-textarea:focus { border-color: var(--brass); }
.el-textarea { resize: vertical; min-height: 64px; }
.el-form-hint { font-size: 0.78rem; color: var(--muted); margin-top: -0.3rem; margin-bottom: 0.9rem; }

.el-row { display: flex; gap: 0.75rem; margin-top: 1.1rem; flex-wrap: wrap; }

.el-btn {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.1rem;
  border-radius: 2px;
  border: 1px solid rgba(233,228,212,0.25);
  background: transparent;
  color: var(--ink);
  cursor: pointer;
  transition: all 0.15s ease;
}
.el-btn:hover:not(:disabled) { border-color: var(--brass); color: var(--brass); }
.el-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.el-btn-primary { background: var(--brass); border-color: var(--brass); color: var(--bg); }
.el-btn-primary:hover:not(:disabled) { background: var(--brass-dim); border-color: var(--brass-dim); color: var(--bg); }

.el-error {
  display: flex; align-items: flex-start; gap: 0.6rem;
  color: var(--danger); font-size: 0.85rem; margin-top: 1rem;
  border-left: 2px solid var(--danger); padding-left: 0.75rem;
}

.el-callouts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; margin-top: 1.4rem; background: rgba(233,228,212,0.12); }
.el-callout { background: var(--panel); padding: 1rem 1rem 1.1rem; position: relative; }
.el-callout::before { content: ''; position: absolute; top: 0; left: 1rem; width: 18px; height: 1px; background: var(--brass); transform: translateY(-1px); }
.el-callout-num { font-family: 'IBM Plex Mono', monospace; font-size: 0.68rem; color: var(--brass); letter-spacing: 0.1em; }
.el-callout-label { font-family: 'IBM Plex Mono', monospace; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.12em; color: var(--muted); margin-top: 0.5rem; }
.el-callout-value { font-size: 0.92rem; color: var(--ink); margin-top: 0.3rem; line-height: 1.35; }

.el-rhythm { margin-top: 1.25rem; font-family: 'Fraunces', serif; font-style: italic; font-weight: 300; color: var(--patina); font-size: 1.05rem; line-height: 1.5; }
.el-chip { display: inline-block; margin-top: 1rem; padding: 0.25rem 0.65rem; border: 1px solid var(--patina); color: var(--patina); border-radius: 999px; font-family: 'IBM Plex Mono', monospace; font-size: 0.68rem; letter-spacing: 0.04em; }
.el-rationale { margin-top: 0.8rem; font-size: 0.9rem; line-height: 1.65; color: var(--ink); }
.el-confidence { margin-top: 1rem; font-size: 0.78rem; color: var(--muted); }

.el-score-sub { font-size: 0.85rem; color: var(--muted); margin: -0.5rem 0 1.25rem 0; line-height: 1.55; }
.el-bridge { display: grid; grid-template-columns: 1fr auto 1fr auto 1fr; align-items: stretch; gap: 0.65rem; margin: 1.25rem 0 1.7rem; }
.el-bridge-stage { border-top: 1px solid var(--brass); padding-top: 0.7rem; min-width: 0; }
.el-bridge-kicker { font-family: 'IBM Plex Mono', monospace; font-size: 0.62rem; letter-spacing: 0.13em; text-transform: uppercase; color: var(--brass); }
.el-bridge-value { margin-top: 0.45rem; color: var(--ink); font-family: 'Fraunces', serif; font-size: 1rem; line-height: 1.25; }
.el-bridge-note { margin-top: 0.35rem; color: var(--muted); font-size: 0.72rem; line-height: 1.45; }
.el-bridge-arrow { align-self: center; color: var(--patina); font-family: 'IBM Plex Mono', monospace; font-size: 1rem; }

.el-trows { display: flex; flex-direction: column; gap: 0.9rem; margin-bottom: 1.6rem; }
.el-trow { border-top: 1px solid rgba(233,228,212,0.1); padding-top: 0.75rem; }
.el-trow-head { display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; flex-wrap: wrap; }
.el-trow-label { font-family: 'IBM Plex Mono', monospace; font-size: 0.68rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--brass); white-space: nowrap; }
.el-trow-value { font-family: 'IBM Plex Mono', monospace; font-size: 0.85rem; color: var(--ink); text-align: right; }
.el-trow-principle { font-size: 0.82rem; color: var(--muted); margin-top: 0.35rem; line-height: 1.5; max-width: 64ch; }
.el-trow-detail { font-size: 0.76rem; color: var(--ink); margin: 0.45rem 0 0; padding-left: 0.75rem; border-left: 1px solid var(--brass-dim); line-height: 1.5; max-width: 64ch; }

.el-chart-wrap { border-top: 1px solid rgba(233,228,212,0.1); padding-top: 1.25rem; }
.el-chart-label { font-family: 'IBM Plex Mono', monospace; font-size: 0.68rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--brass); margin-bottom: 0.9rem; }
.el-chart-caption { font-size: 0.8rem; color: var(--muted); margin-top: 0.6rem; line-height: 1.55; }
.el-chart-now { font-family: 'IBM Plex Mono', monospace; font-size: 0.78rem; color: var(--ink); margin-top: 0.5rem; }

.el-placeholder { color: var(--muted); font-size: 0.88rem; text-align: center; padding: 1.5rem 0; }
.el-footer { margin-top: 2rem; font-size: 0.76rem; color: var(--muted); text-align: center; line-height: 1.6; }

@media (max-width: 640px) {
  .el-callouts { grid-template-columns: 1fr; }
  .el-form-grid { grid-template-columns: 1fr; }
  .el-image { height: 200px; }
  .el-trow-value { text-align: left; }
  .el-bridge { grid-template-columns: 1fr; gap: 0.85rem; }
  .el-bridge-arrow { transform: rotate(90deg); justify-self: center; }
}
`;

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function pickScale(regionGuess = "") {
  const r = regionGuess.toLowerCase();
  if (/china|japan|korea|east asia/.test(r)) return { name: "pentatonic major", intervals: [0, 2, 4, 7, 9] };
  if (/middle east|persia|arab|turk/.test(r)) return { name: "phrygian dominant", intervals: [0, 1, 4, 5, 7, 8, 10] };
  if (/india|south asia/.test(r)) return { name: "raga-inspired mode", intervals: [0, 1, 4, 5, 7, 8, 11] };
  if (/africa/.test(r)) return { name: "pentatonic minor", intervals: [0, 3, 5, 7, 10] };
  if (/latin america|south america|mexico|caribbean/.test(r)) return { name: "phrygian", intervals: [0, 1, 3, 5, 7, 8, 10] };
  if (/united states|north america|americas/.test(r)) return { name: "mixolydian", intervals: [0, 2, 4, 5, 7, 9, 10] };
  if (/europe/.test(r)) return { name: "aeolian", intervals: [0, 2, 3, 5, 7, 8, 10] };
  if (/oceania|australia|pacific/.test(r)) return { name: "pentatonic major", intervals: [0, 2, 4, 7, 9] };
  return { name: "dorian", intervals: [0, 2, 3, 5, 7, 9, 10] };
}

const ERA_PALETTES = [
  { max: 1400, key: "medieval", era: "Romanesque / early medieval", instruments: "stone-cathedral organ drone + hand bells, sparse chant-like line", tempo: 60, reverb: 5.5 },
  { max: 1600, key: "renaissance", era: "Gothic / Renaissance", instruments: "harpsichord-toned pluck melody + string-like pad", tempo: 72, reverb: 2.6 },
  { max: 1830, key: "baroque", era: "Baroque / Neoclassical", instruments: "ornamented harpsichord line + chamber string pad", tempo: 84, reverb: 1.8 },
  { max: 1900, key: "industrial", era: "Industrial / Victorian", instruments: "brass-toned lead + mechanical rivet percussion", tempo: 100, reverb: 1.2 },
  { max: 1945, key: "artdeco", era: "Early Modern / Art Deco", instruments: "vibraphone-toned lead + syncopated pad", tempo: 112, reverb: 1.4 },
  { max: 1980, key: "midcentury", era: "Mid-century Modern / Brutalist", instruments: "electric organ lead + minimal repeating synth pulse", tempo: 120, reverb: 0.6 },
  { max: 2010, key: "postmodern", era: "Postmodern / High-tech", instruments: "digital FM bell lead + bright glassy pad", tempo: 128, reverb: 1.6 },
  { max: Infinity, key: "contemporary", era: "Contemporary / Parametric", instruments: "granular pluck lead + shimmering ambient pad", tempo: 138, reverb: 3.2 },
];

function pickEraPalette(eraStartYear) {
  const y = typeof eraStartYear === "number" ? eraStartYear : 1950;
  return ERA_PALETTES.find((p) => y < p.max) || ERA_PALETTES[ERA_PALETTES.length - 1];
}

function materialFilterFreq(materials = []) {
  const m = (materials || []).join(" ").toLowerCase();
  if (/glass/.test(m)) return 9000;
  if (/steel|iron|metal|cable/.test(m)) return 6000;
  if (/wood|timber/.test(m)) return 2600;
  if (/stone|concrete|brick|masonry|marble/.test(m)) return 1300;
  return 3500;
}
function materialTextureLabel(materials = []) {
  const m = (materials || []).join(" ").toLowerCase();
  if (/glass/.test(m)) return "glass brightens the tone into a shimmering upper register";
  if (/steel|iron|metal|cable/.test(m)) return "steel/metal keeps the tone bright and resonant";
  if (/wood|timber/.test(m)) return "wood warms the tone toward a rounder midrange";
  if (/stone|concrete|brick|masonry|marble/.test(m)) return "stone/concrete mutes the tone into a darker register";
  return "an unremarkable material reading keeps the tone neutral";
}

function hashToSemitone(s = "") {
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) % 12;
  return hash;
}

// Builds the note pattern AND exposes both the raw arch curve (0..1, continuous —
// the structure's silhouette) and the quantized scale-degree curve actually played,
// so the UI can draw the two together and show how one becomes the other.
function buildMusic(analysis) {
  const scale = pickScale(analysis.regionGuess);
  const palette = pickEraPalette(analysis.eraStartYear);
  const materialFreq = materialFilterFreq(analysis.materials);
  const materialLabel = materialTextureLabel(analysis.materials);
  const rootOffset = hashToSemitone((analysis.buildingType || "") + (analysis.styleLabel || ""));
  const steps = Math.max(4, Math.min(16, analysis.repetitionCount || 8));

  const notes = [];
  const archCurve = [];
  const degreeIndices = [];
  for (let i = 0; i < steps; i++) {
    const arch = Math.sin((i / Math.max(1, steps - 1)) * Math.PI);
    const degreeIndex = Math.round(arch * (scale.intervals.length - 1));
    const semitone = (rootOffset + scale.intervals[degreeIndex]) % 12;
    notes.push(NOTE_NAMES[semitone] + "4");
    archCurve.push(arch);
    degreeIndices.push(degreeIndex);
  }
  const rootName = NOTE_NAMES[rootOffset % 12];
  return { scale, palette, materialFreq, materialLabel, rootOffset, rootName, steps, notes, archCurve, degreeIndices };
}

function buildInstruments(palette, materialFreq) {
  const nodes = [];
  const reverb = new Tone.Reverb({ decay: palette.reverb, wet: 0.35 }).toDestination();
  nodes.push(reverb);

  let leadBus = reverb;
  if (palette.key === "industrial") {
    const dist = new Tone.Distortion({ distortion: 0.22, wet: 0.28 }).connect(reverb);
    nodes.push(dist);
    leadBus = dist;
  } else if (palette.key === "contemporary") {
    const chorus = new Tone.Chorus({ frequency: 1.4, depth: 0.55, wet: 0.4 }).connect(reverb);
    chorus.start();
    nodes.push(chorus);
    leadBus = chorus;
  }

  const filter = new Tone.Filter(materialFreq, "lowpass").connect(leadBus);
  nodes.push(filter);

  let lead, pad, perc;

  switch (palette.key) {
    case "medieval":
      lead = new Tone.FMSynth({ harmonicity: 1, modulationIndex: 2, envelope: { attack: 0.4, decay: 0.3, sustain: 0.6, release: 2 }, volume: -13 }).connect(filter);
      pad = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "sine" }, envelope: { attack: 2, decay: 1, sustain: 0.9, release: 4 }, volume: -17 }).connect(reverb);
      perc = new Tone.MetalSynth({ harmonicity: 3.1, resonance: 900, volume: -20, envelope: { attack: 0.001, decay: 0.3, release: 0.3 } }).connect(reverb);
      break;
    case "renaissance":
      lead = new Tone.PluckSynth({ attackNoise: 0.6, dampening: 2500, resonance: 0.9, volume: -5 }).connect(filter);
      pad = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "triangle" }, envelope: { attack: 0.8, decay: 0.5, sustain: 0.7, release: 2 }, volume: -17 }).connect(reverb);
      perc = new Tone.MetalSynth({ harmonicity: 4, resonance: 1200, volume: -24, envelope: { decay: 0.15 } }).connect(reverb);
      break;
    case "baroque":
      lead = new Tone.PluckSynth({ attackNoise: 1, dampening: 3200, resonance: 0.8, volume: -4 }).connect(filter);
      pad = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "triangle" }, envelope: { attack: 0.4, decay: 0.3, sustain: 0.8, release: 1.5 }, volume: -16 }).connect(reverb);
      perc = new Tone.MetalSynth({ harmonicity: 3.5, resonance: 1000, volume: -24, envelope: { decay: 0.1 } }).connect(reverb);
      break;
    case "industrial":
      lead = new Tone.Synth({ oscillator: { type: "sawtooth" }, envelope: { attack: 0.02, decay: 0.2, sustain: 0.4, release: 0.5 }, volume: -12 }).connect(filter);
      pad = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "sawtooth" }, envelope: { attack: 0.3, decay: 0.3, sustain: 0.6, release: 1 }, volume: -19 }).connect(reverb);
      perc = new Tone.MetalSynth({ harmonicity: 2, resonance: 400, volume: -15, envelope: { attack: 0.001, decay: 0.08, release: 0.05 } }).connect(reverb);
      break;
    case "artdeco":
      lead = new Tone.FMSynth({ harmonicity: 3.5, modulationIndex: 8, envelope: { attack: 0.005, decay: 0.5, sustain: 0.1, release: 0.8 }, volume: -10 }).connect(filter);
      pad = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "triangle" }, envelope: { attack: 0.2, decay: 0.3, sustain: 0.5, release: 1.2 }, volume: -17 }).connect(reverb);
      perc = new Tone.MembraneSynth({ volume: -18, envelope: { decay: 0.2 } }).connect(reverb);
      break;
    case "midcentury":
      lead = new Tone.Synth({ oscillator: { type: "square" }, envelope: { attack: 0.01, decay: 0.1, sustain: 0.6, release: 0.3 }, volume: -14 }).connect(filter);
      pad = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "sawtooth" }, envelope: { attack: 0.05, decay: 0.1, sustain: 0.7, release: 0.4 }, volume: -19 }).connect(reverb);
      perc = new Tone.MetalSynth({ harmonicity: 1.5, resonance: 300, volume: -22, envelope: { decay: 0.04 } }).connect(reverb);
      break;
    case "postmodern":
      lead = new Tone.FMSynth({ harmonicity: 5, modulationIndex: 10, envelope: { attack: 0.001, decay: 0.3, sustain: 0.1, release: 0.6 }, volume: -11 }).connect(filter);
      pad = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "square" }, envelope: { attack: 0.1, decay: 0.2, sustain: 0.5, release: 0.8 }, volume: -19 }).connect(reverb);
      perc = new Tone.MetalSynth({ harmonicity: 6, resonance: 1800, volume: -20, envelope: { decay: 0.05 } }).connect(reverb);
      break;
    case "contemporary":
    default:
      lead = new Tone.PluckSynth({ attackNoise: 0.8, dampening: 6000, resonance: 0.6, volume: -6 }).connect(filter);
      pad = new Tone.PolySynth(Tone.Synth, { oscillator: { type: "sine" }, envelope: { attack: 1.8, decay: 1, sustain: 0.8, release: 3 }, volume: -17 }).connect(leadBus);
      perc = new Tone.MetalSynth({ harmonicity: 8, resonance: 2500, volume: -22, envelope: { decay: 0.03 } }).connect(reverb);
      break;
  }

  nodes.push(lead, pad, perc);
  return { lead, pad, perc, nodes };
}

function playLead(lead, note, time) {
  if (typeof lead.triggerAttackRelease === "function") {
    lead.triggerAttackRelease(note, "8n", time);
  } else {
    lead.triggerAttack(note, time);
  }
}

const EMPTY_MANUAL = { name: "", year: "", location: "", style: "", materials: "", notes: "" };

export default function Elevation() {
  const [imageData, setImageData] = useState(null); // { base64, mediaType, url }
  const [manual, setManual] = useState(EMPTY_MANUAL);
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem("elevation-gemini-key") || "");
  const [analysis, setAnalysis] = useState(null);
  const [music, setMusic] = useState(null);
  const [isComposing, setIsComposing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);
  const seqRef = useRef(null);
  const rackRef = useRef({ nodes: [], pad: null });

  useEffect(() => {
    return () => stopPlayback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateManual = (key) => (e) => setManual((m) => ({ ...m, [key]: e.target.value }));

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const [, mediaType, base64] = result.match(/^data:(.+);base64,(.*)$/) || [];
      setImageData({ base64, mediaType, url: result });
    };
    reader.onerror = () => setError("Could not read that file.");
    reader.readAsDataURL(file);
  }, []);

  const canCompose = !!imageData || manual.name.trim().length > 0;

  const compose = async () => {
    if (!canCompose || isComposing) return;
    setIsComposing(true);
    setError(null);
    stopPlayback();
    try {
      const factLines = [];
      if (manual.name.trim()) factLines.push(`Name: ${manual.name.trim()}`);
      if (manual.year.trim()) factLines.push(`Year built: ${manual.year.trim()}`);
      if (manual.location.trim()) factLines.push(`Location: ${manual.location.trim()}`);
      if (manual.style.trim()) factLines.push(`Style: ${manual.style.trim()}`);
      if (manual.materials.trim()) factLines.push(`Materials: ${manual.materials.trim()}`);
      if (manual.notes.trim()) factLines.push(`Notes / history: ${manual.notes.trim()}`);
      const factsText = factLines.length
        ? `Known facts about this structure (treat as certain — do not contradict or re-guess these, only fill in what's missing):\n${factLines.join("\n")}`
        : "No user-provided facts were given — rely on the photograph and your general architectural/historical knowledge.";

      const parts = [];
      if (imageData) {
        parts.push({ inlineData: { mimeType: imageData.mediaType, data: imageData.base64 } });
      }
      parts.push({
        text: `${factsText}\n\nRead and compose for this structure for ELEVATION. Return only the JSON object.${
          imageData ? "" : " No photograph was provided — reason from the facts above and general knowledge; never refuse for lack of an image."
        }`,
      });

      if (!geminiApiKey.trim()) throw new Error("Please enter a Gemini API key.");
      localStorage.setItem("elevation-gemini-key", geminiApiKey.trim());
      const systemInstruction =
        "You are the reading and composition engine for ELEVATION, an art project that turns structures into short generative music. You may receive a photograph, user-provided facts, or both. Respond with ONLY a raw JSON object — no markdown fences, no preamble, no trailing text — matching exactly this shape:\n" +
        '{"buildingType": string, "styleLabel": string, "eraLabel": string, "eraStartYear": number, "regionGuess": string, "materials": [string, ...up to 3], "structuralRhythm": string, "repetitionCount": integer between 4 and 16, "confidenceNote": string, "historicalRationale": string, "musicalReference": string}\n' +
        "Field notes: eraStartYear is a best-guess integer year. regionGuess is broad unless a location was explicitly given. Keep structuralRhythm to one sentence, confidenceNote to one sentence, historicalRationale to 2 concise sentences, and musicalReference to 3-6 words. repetitionCount MUST be an integer between 4 and 16, never a string or description. Keep every field concise so the complete JSON fits within the response budget. This is for an artistic sound-generation tool — always give your best creative estimate for every field, never refuse and never leave a field empty.";

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(geminiApiKey.trim())}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: "user", parts }],
          generationConfig: { maxOutputTokens: 3000, responseMimeType: "application/json" },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "Gemini request failed");
      const cleaned = (data.candidates?.[0]?.content?.parts || []).map((part) => part.text || "").join("").replace(/```json|```/g, "").trim();
      if (!cleaned) throw new Error("No text in Gemini response");
      const parsed = JSON.parse(cleaned);

      // User-entered facts always win over the model's phrasing of the same field.
      const merged = { ...parsed };
      if (manual.name.trim()) merged.buildingType = manual.name.trim();
      if (manual.year.trim() && !isNaN(Number(manual.year))) merged.eraStartYear = Number(manual.year);
      if (manual.location.trim()) merged.regionGuess = manual.location.trim();
      if (manual.style.trim()) merged.styleLabel = manual.style.trim();
      if (manual.materials.trim()) {
        merged.materials = manual.materials.trim().split(",").map((s) => s.trim()).filter(Boolean).slice(0, 3);
      }

      setAnalysis(merged);
      setMusic(buildMusic(merged));
    } catch (err) {
      setError("Couldn't complete a reading — try again, or add a bit more detail below.");
    } finally {
      setIsComposing(false);
    }
  };

  const stopPlayback = () => {
    if (seqRef.current) {
      seqRef.current.stop();
      seqRef.current.dispose();
      seqRef.current = null;
    }
    Tone.Transport.stop();
    Tone.Transport.cancel();
    const { pad, nodes } = rackRef.current || {};
    try {
      pad && pad.releaseAll && pad.releaseAll();
    } catch (e) {}
    (nodes || []).forEach((n) => {
      try {
        n.dispose && n.dispose();
      } catch (e) {}
    });
    rackRef.current = { nodes: [], pad: null };
    setIsPlaying(false);
    setCurrentStep(-1);
  };

  const handlePlay = async () => {
    if (!music) return;
    await Tone.start();
    stopPlayback();

    const rack = buildInstruments(music.palette, music.materialFreq);
    rackRef.current = rack;

    Tone.Transport.bpm.value = music.palette.tempo;

    const rootName = music.rootName + "3";
    const fifthSemitone = (music.rootOffset + 7) % 12;
    const fifthName = NOTE_NAMES[fifthSemitone] + "3";
    rack.pad.triggerAttack([rootName, fifthName]);

    let i = 0;
    const seq = new Tone.Sequence(
      (time, note) => {
        playLead(rack.lead, note, time);
        rack.perc.triggerAttackRelease("16n", time);
        const stepIndex = i % music.steps;
        Tone.Draw.schedule(() => setCurrentStep(stepIndex), time);
        i++;
      },
      music.notes,
      "8n"
    ).start(0);

    seqRef.current = seq;
    Tone.Transport.start();
    setIsPlaying(true);
  };

  const handleReset = () => {
    stopPlayback();
    setImageData(null);
    setManual(EMPTY_MANUAL);
    setAnalysis(null);
    setMusic(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const translationRows =
    music && analysis
      ? [
          {
            label: "Tempo",
            value: `${music.palette.tempo} BPM`,
            principle: `Era reading (${music.palette.era}, ${analysis.eraLabel}) sets the pulse — earlier eras read slower, more recent ones read faster.`,
            detail: "The building's historical moment becomes bodily movement: procession, work, ceremony, or speed. Tempo is the architecture's sense of time.",
          },
          {
            label: "Scale",
            value: `${music.rootName} ${music.scale.name}`,
            principle: `Region reading (${analysis.regionGuess}) selects a scale from that broad musical tradition — an interpretive palette, not a claim about the place.`,
            detail: "The scale controls which distances feel open, tense, or resolved. It gives the structure a cultural horizon without pretending to reproduce a historical work.",
          },
          {
            label: "Instrumentation",
            value: music.palette.instruments,
            principle: `The era reading picks the instrument family; ${music.materialLabel}.`,
            detail: "Instrument choice is the bridge between history and timbre: the sound carries both the period's musical practice and the material's imagined resonance.",
          },
          {
            label: "Historical fit",
            value: analysis.musicalReference || "—",
            principle: analysis.historicalRationale || "",
            detail: "Historical context keeps the composition situated in a real time and place. It is a listening reference, not an authenticated reconstruction.",
          },
          {
            label: "Rhythm & contour",
            value: `${music.steps}-step pattern, arch-shaped melody`,
            principle: `The repetition count of the dominant structural element sets the pattern length. The chart below is the actual curve — see how the structure's rise and fall becomes pitch.`,
            detail: "Repeated bays, columns, arches, or roof tiers become beats. Their rise and fall becomes contour, so the melody behaves like the building's silhouette.",
          },
        ]
      : [];

  // Chart geometry: raw arch curve (the structure's continuous silhouette) vs.
  // the quantized scale-degree curve that's actually played.
  const CW = 600, CH = 130, CPAD = 18;
  const scaleLen = music ? music.scale.intervals.length : 1;
  const stepX = (i) => CPAD + (i / Math.max(1, music.steps - 1)) * (CW - CPAD * 2);
  const archY = (v) => CH - CPAD - v * (CH - CPAD * 2);
  const refPoints = music ? music.archCurve.map((v, i) => `${stepX(i)},${archY(v)}`).join(" ") : "";
  const notePoints = music ? music.degreeIndices.map((d, i) => [stepX(i), archY(scaleLen > 1 ? d / (scaleLen - 1) : 0.5)]) : [];
  const notePath = notePoints.map((p, i) => (i === 0 ? "M" : "L") + p[0] + "," + p[1]).join(" ");

  return (
    <div className="el-root">
      <style>{STYLE}</style>
      <div className="el-shell">
        <div className="el-header">
          <p className="el-eyebrow">The Resonant Frame</p>
          <h1 className="el-title">
            The Resonant Frame<br />
            <em>An echo of what remains.</em>
          </h1>
          <p className="el-sub">
            Offer a photograph, or whisper the history of the walls before you. The Resonant Frame traces
            the lineage of architecture: its epoch, its native soil, its physical marrow, and the silent
            rhythm of its frame. In return, it awakens the structure, translating stone and timber into a
            fleeting symphony, voiced by instruments born of the building's own dawn.
          </p>
        </div>

        <div className="el-panel">
          <p className="el-panel-title">01 · Structure</p>

          {!imageData && (
            <div className="el-upload" onClick={() => fileInputRef.current?.click()}>
              <span className="el-corner tl" />
              <span className="el-corner tr" />
              <span className="el-corner bl" />
              <span className="el-corner br" />
              <div className="el-upload-icon"><Upload size={24} strokeWidth={1.4} /></div>
              <div className="el-upload-label">Drop elevation</div>
              <div className="el-upload-hint">optional — a photograph of the structure</div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>
          )}

          {imageData && (
            <div className="el-image-wrap">
              <img src={imageData.url} alt="Uploaded structure" className="el-image" />
              <div className="el-grid-overlay" />
              <div className="el-image-change" onClick={() => fileInputRef.current?.click()}>Change photo</div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>
          )}

          <div className="el-divider">and / or tell it directly</div>

          <div className="el-form-grid">
            <div className="el-field full">
              <label className="el-field-label">Gemini API key</label>
              <input
                className="el-input"
                type="password"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="Paste your Gemini API key"
                autoComplete="off"
              />
            </div>
            <div className="el-field">
              <label className="el-field-label">Name</label>
              <input className="el-input" value={manual.name} onChange={updateManual("name")} placeholder="e.g. Golden Gate Bridge" />
            </div>
            <div className="el-field">
              <label className="el-field-label">Year built</label>
              <input className="el-input" value={manual.year} onChange={updateManual("year")} placeholder="e.g. 1937" inputMode="numeric" />
            </div>
            <div className="el-field">
              <label className="el-field-label">Location</label>
              <input className="el-input" value={manual.location} onChange={updateManual("location")} placeholder="e.g. San Francisco, USA" />
            </div>
            <div className="el-field">
              <label className="el-field-label">Style (optional)</label>
              <input className="el-input" value={manual.style} onChange={updateManual("style")} placeholder="e.g. Art Deco" />
            </div>
            <div className="el-field full">
              <label className="el-field-label">Materials (optional, comma-separated)</label>
              <input className="el-input" value={manual.materials} onChange={updateManual("materials")} placeholder="e.g. steel, cable" />
            </div>
            <div className="el-field full">
              <label className="el-field-label">History / background (optional)</label>
              <textarea className="el-textarea" value={manual.notes} onChange={updateManual("notes")} placeholder="Architect, event, significance, anything you know…" />
            </div>
          </div>

          <div className="el-row">
            <button className="el-btn el-btn-primary" onClick={compose} disabled={!canCompose || isComposing}>
              {isComposing ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : null}
              {isComposing ? "Composing…" : analysis ? "Recompose" : "Compose"}
            </button>
            {music && (
              <button className="el-btn el-btn-primary" onClick={isPlaying ? stopPlayback : handlePlay}>
                {isPlaying ? <Square size={14} /> : <Play size={14} />}
                {isPlaying ? "Stop" : "Play score"}
              </button>
            )}
            <button className="el-btn" onClick={handleReset}>
              <RotateCcw size={14} />
              Start over
            </button>
          </div>

          {error && (
            <div className="el-error">
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: "1px" }} />
              <span>{error}</span>
            </div>
          )}

          {analysis && (
            <>
              <div className="el-callouts">
                <div className="el-callout">
                  <div className="el-callout-num">01 · FORM</div>
                  <div className="el-callout-label">Type &amp; style</div>
                  <div className="el-callout-value">{analysis.buildingType}, {analysis.styleLabel}</div>
                </div>
                <div className="el-callout">
                  <div className="el-callout-num">02 · ERA</div>
                  <div className="el-callout-label">Reading</div>
                  <div className="el-callout-value">{analysis.eraLabel}</div>
                </div>
                <div className="el-callout">
                  <div className="el-callout-num">03 · REGION</div>
                  <div className="el-callout-label">Reading</div>
                  <div className="el-callout-value">{analysis.regionGuess}</div>
                </div>
              </div>

              <p className="el-rhythm">"{analysis.structuralRhythm}"</p>
              {analysis.musicalReference && <span className="el-chip">{analysis.musicalReference}</span>}
              {analysis.historicalRationale && <p className="el-rationale">{analysis.historicalRationale}</p>}
              <p className="el-confidence">{analysis.confidenceNote}</p>
            </>
          )}
        </div>

        {music && analysis && (
          <div className="el-panel">
            <p className="el-panel-title">02 · The building becomes sound</p>
            <p className="el-score-sub">
              Each musical decision begins as an architectural fact. The translation below follows the
              path from what stands, through the rule that interprets it, to what finally sounds.
            </p>

            <div className="el-bridge" aria-label="Architecture to sound translation">
              <div className="el-bridge-stage">
                <div className="el-bridge-kicker">The structure</div>
                <div className="el-bridge-value">{analysis.buildingType}</div>
                <div className="el-bridge-note">{analysis.styleLabel} · {analysis.regionGuess}</div>
              </div>
              <div className="el-bridge-arrow">→</div>
              <div className="el-bridge-stage">
                <div className="el-bridge-kicker">The reading</div>
                <div className="el-bridge-value">{music.steps} repeating elements</div>
                <div className="el-bridge-note">{analysis.structuralRhythm}</div>
              </div>
              <div className="el-bridge-arrow">→</div>
              <div className="el-bridge-stage">
                <div className="el-bridge-kicker">The score</div>
                <div className="el-bridge-value">{music.rootName} {music.scale.name}</div>
                <div className="el-bridge-note">{music.palette.instruments}</div>
              </div>
            </div>

            <div className="el-trows">
              {translationRows.map((row) => (
                <div className="el-trow" key={row.label}>
                  <div className="el-trow-head">
                    <span className="el-trow-label">{row.label}</span>
                    <span className="el-trow-value">{row.value}</span>
                  </div>
                  {row.principle && <p className="el-trow-principle">{row.principle}</p>}
                  {row.detail && <p className="el-trow-detail">{row.detail}</p>}
                </div>
              ))}
            </div>

            <div className="el-chart-wrap">
              <div className="el-chart-label">Structure → melody</div>
              <svg viewBox={`0 0 ${CW} ${CH}`} style={{ width: "100%", height: "150px" }}>
                <polyline points={refPoints} fill="none" stroke="var(--patina)" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.55" />
                <path d={notePath} fill="none" stroke="var(--brass)" strokeWidth="2" />
                {notePoints.map(([x, y], idx) => (
                  <circle
                    key={idx}
                    cx={x}
                    cy={y}
                    r={idx === currentStep ? 7 : 4}
                    fill={idx === currentStep ? "var(--brass)" : "var(--ink)"}
                    opacity={idx === currentStep ? 1 : 0.85}
                  />
                ))}
              </svg>
              <p className="el-chart-caption">
                The dashed line is the structure's own arch — the shape used to read its repeating
                elements. The solid line is that same arch quantized into the chosen scale: the
                structure's silhouette, played as pitch.
              </p>
              {isPlaying && <p className="el-chart-now">now playing: {music.notes[currentStep] || "—"}</p>}
            </div>
          </div>
        )}

        {!analysis && (
          <div className="el-placeholder">Tempo and instruments come from era, scale from region, tone from material, rhythm and melody from what repeats.</div>
        )}

        <div className="el-footer">
          Every reading — era, region, material, rhythm, history — is an interpretive, creative estimate
          for this art project, not an authoritative architectural or musical identification.
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
