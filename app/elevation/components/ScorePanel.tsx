import { useEffect, useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toLilyPond, toScoreData } from "../../../src/services/LilyPondService";
import { ERA_VOICES } from "../audio/voices";
import type { Analysis, Music } from "../types";

interface ScorePanelProps {
  analysis: Analysis;
  music: Music;
  currentEvent: number;
}

type Engraving = { status: "loading" } | { status: "ready"; svg: string } | { status: "error"; message: string };

function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "score";

export function ScorePanel({ analysis, music, currentEvent }: ScorePanelProps) {
  const scoreData = useMemo(() => {
    const v = ERA_VOICES[music.palette.key];
    return toScoreData(music, { lead: v.lead.instrument, pad: v.pad.instrument, perc: v.perc.instrument });
  }, [music]);
  const source = useMemo(() => toLilyPond(scoreData), [scoreData]);
  const [engraving, setEngraving] = useState<Engraving>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    setEngraving({ status: "loading" });
    fetch("/api/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(scoreData),
      signal: controller.signal,
    })
      .then(async (res) => {
        const body = await res.text();
        if (!res.ok) throw new Error(body || `Engraving failed (${res.status})`);
        setEngraving({ status: "ready", svg: body });
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        setEngraving({ status: "error", message: err instanceof Error ? err.message : "Engraving failed" });
      });
    return () => controller.abort();
  }, [scoreData]);

  const name = slug(analysis.buildingType);
  const meter = `${music.meter.num}/${music.meter.den}`;

  return (
    <div className="el-panel">
      <p className="el-panel-title">
        03 · The score
        <span className="el-composer">{music.source === "gemini" ? "composed by Gemini" : "rule-based fallback"}</span>
      </p>
      <p className="el-score-sub">
        Engraved with LilyPond: {music.steps} bars of {meter} in {music.rootName} {music.scale.name}, one bar for
        each bay. Bay numbers are marked in brass, appoggiaturas in patina; the note sounding now lights up.
      </p>

      <div className="el-sheet">
        <span className="el-corner tl" />
        <span className="el-corner tr" />
        <span className="el-corner bl" />
        <span className="el-corner br" />
        {engraving.status === "loading" && (
          <div className="el-sheet-status">
            <Loader2 size={16} className="el-spin" /> Engraving…
          </div>
        )}
        {engraving.status === "error" && <div className="el-sheet-status el-sheet-error">{engraving.message}</div>}
        {engraving.status === "ready" && (
          <div className="el-sheet-scroll">
            {currentEvent >= 0 && <style>{`.el-sheet-svg [data-ev="${currentEvent}"] { color: var(--brass); filter: drop-shadow(0 0 0.35px var(--brass)); }`}</style>}
            <div className="el-sheet-svg" dangerouslySetInnerHTML={{ __html: engraving.svg }} />
          </div>
        )}
      </div>

      <div className="el-row">
        <button className="el-btn" onClick={() => download(`${name}.ly`, source, "text/x-lilypond")}>
          <Download size={14} /> LilyPond source
        </button>
        <button
          className="el-btn"
          disabled={engraving.status !== "ready"}
          onClick={() => engraving.status === "ready" && download(`${name}.svg`, engraving.svg, "image/svg+xml")}
        >
          <Download size={14} /> SVG
        </button>
      </div>

      <details className="el-source">
        <summary>View LilyPond source</summary>
        <pre>{source}</pre>
      </details>
    </div>
  );
}
