import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, Play, RotateCcw, Square } from "lucide-react";

import "./elevation.css";
import { composeScore, GeminiError, readStructure } from "./api/gemini";
import { usePlayback } from "./audio/usePlayback";
import { AnalysisSummary } from "./components/AnalysisSummary";
import { FactsForm } from "./components/FactsForm";
import { Header } from "./components/Header";
import { ImageUpload } from "./components/ImageUpload";
import { ScorePanel } from "./components/ScorePanel";
import { TranslationPanel } from "./components/TranslationPanel";
import { buildMusic, planMusic } from "./music/buildMusic";
import { buildLocalRiff, riffFromComposition } from "./music/riff";
import { EMPTY_MANUAL, type Analysis, type ManualFacts, type Music, type UploadedImage } from "./types";

const API_KEY_STORAGE = "elevation-gemini-key";

/** Short, human reason for a Gemini failure. */
function describe(err: unknown): string {
  if (err instanceof GeminiError) {
    if (err.status === 503) return "the model is overloaded right now";
    if (err.status === 429) return "rate limit or quota reached";
    if (err.status === 400 || err.status === 403) return err.message;
  }
  if (err instanceof SyntaxError) return "it returned malformed JSON";
  return err instanceof Error ? err.message : "unknown error";
}

export function Elevation() {
  const [imageData, setImageData] = useState<UploadedImage | null>(null);
  const [manual, setManual] = useState<ManualFacts>(EMPTY_MANUAL);
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [music, setMusic] = useState<Music | null>(null);
  const [phase, setPhase] = useState<null | "reading" | "composing">(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** Set while a busy Gemini is being retried, e.g. "2/4". */
  const [retrying, setRetrying] = useState<string | null>(null);
  /** Inputs behind the current reading: Recompose skips re-reading while they're unchanged. */
  const readingKeyRef = useRef<string | null>(null);
  const isComposing = phase !== null;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isPlaying, isLoading, currentEvent, play, stop } = usePlayback();

  const handlePlay = async (score: Music) => {
    setError(null);
    try {
      await play(score);
    } catch (err) {
      console.error(err);
      setError("Couldn't load the instrument samples — check your connection and try again.");
    }
  };

  // localStorage only exists in the browser, so restore the key after hydration.
  useEffect(() => {
    const saved = localStorage.getItem(API_KEY_STORAGE);
    if (saved) setGeminiApiKey(saved);
  }, []);

  const updateManual = (key: keyof ManualFacts, value: string) => setManual((m) => ({ ...m, [key]: value }));

  const handleFile = useCallback((file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [, mediaType, base64] = result.match(/^data:(.+);base64,(.*)$/) || [];
      setImageData({ base64, mediaType, url: result });
    };
    reader.onerror = () => setError("Could not read that file.");
    reader.readAsDataURL(file);
  }, []);

  const canCompose = !!imageData || manual.name.trim().length > 0;

  const readingKey = JSON.stringify(manual) + "|" + (imageData ? imageData.base64.length + imageData.base64.slice(0, 64) : "");

  const compose = async () => {
    if (!canCompose || isComposing) return;
    setError(null);
    setNotice(null);
    stop();

    const apiKey = geminiApiKey.trim();
    if (!apiKey) {
      setError("Please enter a Gemini API key.");
      return;
    }
    localStorage.setItem(API_KEY_STORAGE, apiKey);

    const onRetry = (attempt: number, max: number) => setRetrying(`${attempt}/${max}`);

    // 1. Reading: only when the photo or facts changed since the last one.
    let reading = analysis;
    if (!reading || readingKeyRef.current !== readingKey) {
      setPhase("reading");
      try {
        reading = await readStructure({ apiKey, manual, image: imageData, onRetry });
        readingKeyRef.current = readingKey;
        setAnalysis(reading);
      } catch (err) {
        console.error(err);
        setError(`Couldn't complete a reading: ${describe(err)}`);
        setPhase(null);
        setRetrying(null);
        return;
      }
    }

    // 2. Composition: a fresh Gemini take every time, guided by the GenerativeMusic skill.
    setPhase("composing");
    setRetrying(null);
    const plan = planMusic(reading);
    const variation = crypto.randomUUID().slice(0, 8);
    try {
      const composition = await composeScore({ apiKey, analysis: reading, plan, variation, onRetry });
      const riff = riffFromComposition(plan.score, composition, variation);
      if (riff.repairedBars.length) {
        console.info(`Repaired Gemini bars: ${riff.repairedBars.map((b) => b + 1).join(", ")}`);
      }
      setMusic(buildMusic(plan, riff));
    } catch (err) {
      console.error(err);
      setNotice(`Gemini couldn't compose this take (${describe(err)}), so the rule-based generator wrote it instead. Recompose to try Gemini again.`);
      setMusic(buildMusic(plan, buildLocalRiff(plan.score, variation)));
    } finally {
      setPhase(null);
      setRetrying(null);
    }
  };

  const handleReset = () => {
    stop();
    setImageData(null);
    setManual(EMPTY_MANUAL);
    setAnalysis(null);
    setMusic(null);
    setError(null);
    setNotice(null);
    readingKeyRef.current = null;
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="el-root">
      <div className="el-shell">
        <Header />

        <div className="el-panel">
          <p className="el-panel-title">01 · Structure</p>

          <ImageUpload image={imageData} inputRef={fileInputRef} onFile={handleFile} />

          <div className="el-divider">and / or tell it directly</div>

          <FactsForm
            apiKey={geminiApiKey}
            onApiKeyChange={setGeminiApiKey}
            manual={manual}
            onFieldChange={updateManual}
          />

          <div className="el-row">
            <button className="el-btn el-btn-primary" onClick={compose} disabled={!canCompose || isComposing}>
              {isComposing ? <Loader2 size={14} className="el-spin" /> : null}
              {retrying
                ? `Gemini busy — retry ${retrying}…`
                : phase === "reading"
                  ? "Reading…"
                  : phase === "composing"
                    ? "Composing…"
                    : analysis
                      ? "Recompose"
                      : "Compose"}
            </button>
            {music && (
              <button className="el-btn el-btn-primary" onClick={isPlaying || isLoading ? stop : () => handlePlay(music)}>
                {isLoading ? (
                  <Loader2 size={14} className="el-spin" />
                ) : isPlaying ? (
                  <Square size={14} />
                ) : (
                  <Play size={14} />
                )}
                {isLoading ? "Loading sounds…" : isPlaying ? "Stop" : "Play score"}
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

          {notice && <div className="el-notice">{notice}</div>}

          {analysis && <AnalysisSummary analysis={analysis} />}
        </div>

        {music && analysis && (
          <>
            <TranslationPanel analysis={analysis} music={music} currentEvent={currentEvent} isPlaying={isPlaying} />
            <ScorePanel analysis={analysis} music={music} currentEvent={currentEvent} />
          </>
        )}

        {!analysis && (
          <div className="el-placeholder">
            Tempo and instruments come from era, scale from region, tone from material, rhythm and melody
            from what repeats.
          </div>
        )}

        <div className="el-footer">
          Every reading — era, region, material, rhythm, history — is an interpretive, creative estimate
          for this art project, not an authoritative architectural or musical identification.
        </div>
      </div>
    </div>
  );
}
