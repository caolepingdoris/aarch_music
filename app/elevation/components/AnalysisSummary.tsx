import type { Analysis } from "../types";

export function AnalysisSummary({ analysis }: { analysis: Analysis }) {
  return (
    <>
      <div className="el-callouts">
        <div className="el-callout">
          <div className="el-callout-num">01 · FORM</div>
          <div className="el-callout-label">Type &amp; style</div>
          <div className="el-callout-value">
            {analysis.buildingType}, {analysis.styleLabel}
          </div>
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
  );
}
