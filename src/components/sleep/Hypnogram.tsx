import { sleep, type SleepSegment, type SleepStage } from '../../data'

interface HypnogramProps {
  segments: SleepSegment[]
}

// viewBox geometry — the SVG scales to the card width, keeping this aspect.
const W = 320
const H = 150
const GUTTER_L = 40 // room for row labels
const PAD_R = 6
const PAD_T = 8
const PAD_B = 18 // room for the time labels

const PLOT_LEFT = GUTTER_L
const PLOT_RIGHT = W - PAD_R
const PLOT_TOP = PAD_T
const PLOT_BOTTOM = H - PAD_B

// Top -> bottom row order.
const ROWS: SleepStage[] = ['Awake', 'REM', 'Core', 'Deep']

export default function Hypnogram({ segments }: HypnogramProps) {
  const total = segments.reduce((sum, s) => sum + s.minutes, 0) || 1

  const rowY = (stage: SleepStage) => {
    const i = ROWS.indexOf(stage)
    return PLOT_TOP + (i / (ROWS.length - 1)) * (PLOT_BOTTOM - PLOT_TOP)
  }
  const xFor = (minute: number) =>
    PLOT_LEFT + (minute / total) * (PLOT_RIGHT - PLOT_LEFT)

  // Build the stepped polyline: two points per segment at its row height.
  const points: string[] = []
  let cursor = 0
  for (const seg of segments) {
    const y = rowY(seg.stage).toFixed(1)
    points.push(`${xFor(cursor).toFixed(1)},${y}`)
    cursor += seg.minutes
    points.push(`${xFor(cursor).toFixed(1)},${y}`)
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full overflow-visible"
      role="img"
      aria-label="Sleep stages across the night"
    >
      {/* Row baselines + labels */}
      {ROWS.map((stage) => {
        const y = rowY(stage)
        return (
          <g key={stage}>
            <line
              x1={PLOT_LEFT}
              y1={y}
              x2={PLOT_RIGHT}
              y2={y}
              stroke="var(--color-border)"
              strokeWidth={1}
            />
            <text
              x={PLOT_LEFT - 8}
              y={y + 3}
              fontSize={9}
              textAnchor="end"
              fill="var(--color-text-muted)"
            >
              {stage}
            </text>
          </g>
        )
      })}

      {/* Stepped stage line */}
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke="var(--color-indigo)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Time labels */}
      <text
        x={PLOT_LEFT}
        y={H - 5}
        fontSize={9}
        textAnchor="start"
        fill="var(--color-text-muted)"
      >
        {sleep.bedtime}
      </text>
      <text
        x={PLOT_RIGHT}
        y={H - 5}
        fontSize={9}
        textAnchor="end"
        fill="var(--color-text-muted)"
      >
        {sleep.wakeTime}
      </text>
    </svg>
  )
}
