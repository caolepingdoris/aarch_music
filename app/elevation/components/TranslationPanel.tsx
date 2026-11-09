import type { Analysis, Music } from "../types";
import { MelodyChart } from "./MelodyChart";

interface TranslationRow {
  label: string;
  value: string;
  principle: string;
  detail: string;
}

function buildTranslationRows(music: Music, analysis: Analysis): TranslationRow[] {
  return [
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
      principle: `The era reading picks the instrument family, played from General MIDI soundfont samples; ${music.materialLabel}.`,
      detail: "Instrument choice is the bridge between history and timbre: the sound carries both the period's musical practice and the material's imagined resonance.",
    },
    {
      label: "Space",
      value: `size ${Math.round(music.mix.size * 100)}% · ${music.mix.decay.toFixed(1)}s tail · ${Math.round(music.mix.preDelay * 1000)} ms pre-delay · ${Math.round(music.mix.dryWet * 100)}% wet`,
      principle: `Building type, era and materials imagine the room: ${music.mix.spaceLabel}. Reverb sends — lead ${Math.round(music.mix.sends.lead * 100)}%, pad ${Math.round(music.mix.sends.pad * 100)}%, percussion ${Math.round(music.mix.sends.perc * 100)}%.`,
      detail: "The reverb is the building heard from inside: hard stone and vast volumes ring longer and further away, wood and small rooms keep the sound close and dry.",
    },
    {
      label: "Historical fit",
      value: analysis.musicalReference || "—",
      principle: analysis.historicalRationale || "",
      detail: "Historical context keeps the composition situated in a real time and place. It is a listening reference, not an authenticated reconstruction.",
    },
    {
      label: "Rhythm & contour",
      value: `${music.steps} bars of ${music.meter.num}/${music.meter.den} · ${music.events.length} notes · ${music.graceCount} appoggiaturas`,
      principle: `${music.source === "gemini" ? "Composed by Gemini from the GenerativeMusic skill" : "Written by the rule-based fallback"}: “${music.figureLabel}”. One bar per repeating bay; the arch sets each bay's pitch and density, dotted values at the edges and running sixteenths at the crown, with appoggiaturas leaning into the peak and the final cadence.${music.repairedBars.length ? ` The app repaired bar ${music.repairedBars.map((n) => n + 1).join(", ")} so every bar adds up.` : ""}`,
      detail: "Repeated bays, columns, arches, or roof tiers become bars. Their rise and fall becomes contour, and the era's ornament becomes the rhythm, so the riff behaves like the building's silhouette.",
    },
  ];
}

interface TranslationPanelProps {
  analysis: Analysis;
  music: Music;
  currentEvent: number;
  isPlaying: boolean;
}

export function TranslationPanel({ analysis, music, currentEvent, isPlaying }: TranslationPanelProps) {
  const rows = buildTranslationRows(music, analysis);

  return (
    <div className="el-panel">
      <p className="el-panel-title">02 · The building becomes sound</p>
      <p className="el-score-sub">
        Each musical decision begins as an architectural fact. The translation below follows the path
        from what stands, through the rule that interprets it, to what finally sounds.
      </p>

      <div className="el-bridge" aria-label="Architecture to sound translation">
        <div className="el-bridge-stage">
          <div className="el-bridge-kicker">The structure</div>
          <div className="el-bridge-value">{analysis.buildingType}</div>
          <div className="el-bridge-note">
            {analysis.styleLabel} · {analysis.regionGuess}
          </div>
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
          <div className="el-bridge-value">
            {music.rootName} {music.scale.name}
          </div>
          <div className="el-bridge-note">{music.palette.instruments}</div>
        </div>
      </div>

      <div className="el-trows">
        {rows.map((row) => (
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

      <MelodyChart music={music} currentEvent={currentEvent} isPlaying={isPlaying} />
    </div>
  );
}
