import type { Music } from "../types";

// Piano-roll view: each bar is one structural bay; the dashed line is the arch
// (the anchor pitch each bay's figure is built around), the bars are the riff.
const CW = 600;
const CH = 150;
const PAD_X = 12;
const PAD_Y = 14;

interface MelodyChartProps {
  music: Music;
  currentEvent: number;
  isPlaying: boolean;
}

export function MelodyChart({ music, currentEvent, isPlaying }: MelodyChartProps) {
  const pitches = [
    ...music.events.map((e) => e.midi),
    ...music.events.flatMap((e) => (e.grace ? [e.grace.midi] : [])),
    ...music.anchorMidis,
  ];
  const lo = Math.min(...pitches) - 1;
  const hi = Math.max(...pitches) + 1;

  const x = (t: number) => PAD_X + (t / music.totalLength) * (CW - PAD_X * 2);
  const y = (midi: number) => CH - PAD_Y - ((midi - lo) / Math.max(1, hi - lo)) * (CH - PAD_Y * 2);
  const barLength = music.meter.barLength;

  const archPoints = music.anchorMidis.map((m, b) => `${x((b + 0.5) * barLength)},${y(m)}`).join(" ");
  const current = music.events[currentEvent];

  return (
    <div className="el-chart-wrap">
      <div className="el-chart-label">Structure → melody</div>
      <svg viewBox={`0 0 ${CW} ${CH}`} style={{ width: "100%", height: "170px" }} role="img" aria-label="Melody piano roll">
        {Array.from({ length: music.steps + 1 }, (_, b) => (
          <line
            key={`bar-${b}`}
            x1={x(b * barLength)}
            x2={x(b * barLength)}
            y1={PAD_Y / 2}
            y2={CH - PAD_Y / 2}
            stroke="var(--ink)"
            strokeWidth="0.6"
            opacity="0.12"
          />
        ))}
        <polyline points={archPoints} fill="none" stroke="var(--patina)" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.6" />
        {music.events.map((e) => {
          const active = e.index === currentEvent;
          const x0 = x(e.start);
          const w = Math.max(2, x(e.start + e.dur) - x0 - 1.5);
          return (
            <g key={e.index}>
              {e.grace && (
                <>
                  <line x1={x0 + 2} y1={y(e.grace.midi)} x2={x0 + 5} y2={y(e.midi)} stroke="var(--patina)" strokeWidth="0.8" opacity="0.7" />
                  <circle cx={x0 + 2} cy={y(e.grace.midi)} r={active ? 3 : 2.2} fill="var(--patina)" />
                </>
              )}
              <rect
                x={x0}
                y={y(e.midi) - (active ? 3 : 2)}
                width={w}
                height={active ? 6 : 4}
                rx="1"
                fill={active ? "var(--brass)" : "var(--ink)"}
                opacity={active ? 1 : 0.82}
              />
            </g>
          );
        })}
      </svg>
      <p className="el-chart-caption">
        Each column is one bay. The dashed line is the structure's arch, the pitch each bay's figure is
        built around. The bars are the riff itself: their length is the note value, sparse and dotted at
        the edges, running sixteenths at the crown. Small teal dots are appoggiaturas leaning into the note.
      </p>
      {isPlaying && (
        <p className="el-chart-now">
          now playing: bay {current ? current.bar + 1 : "—"} · {current ? (current.grace ? `${current.grace.name} → ${current.name}` : current.name) : "—"}
        </p>
      )}
    </div>
  );
}
