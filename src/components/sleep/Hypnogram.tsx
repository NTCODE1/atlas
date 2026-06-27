import { sleep, timeToHours, formatClock12, type SleepSegment, type SleepStage } from '../../data'

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
const PLOT_H = PLOT_BOTTOM - PLOT_TOP

// Top -> bottom row order, with each stage's height as a fraction of the plot
// (taller = more awake). The filled column for a segment rises to this level.
const ROWS: { stage: SleepStage; level: number }[] = [
  { stage: 'Awake', level: 1.0 },
  { stage: 'REM', level: 0.72 },
  { stage: 'Core', level: 0.46 },
  { stage: 'Deep', level: 0.18 },
]

const levelFor = (stage: SleepStage) =>
  ROWS.find((r) => r.stage === stage)!.level

// Clock fraction across the night (handles the post-midnight wrap).
const bedAbs = timeToHours(sleep.bedtime)
const wakeAbs = timeToHours(sleep.wakeTime) + 24
const MID_TICKS = ['02:00', '05:00'] // hard-coded to match the mockup

export default function Hypnogram({ segments }: HypnogramProps) {
  const total = segments.reduce((sum, s) => sum + s.minutes, 0) || 1

  const xForMinute = (minute: number) =>
    PLOT_LEFT + (minute / total) * (PLOT_RIGHT - PLOT_LEFT)
  const xForClock = (time: string) => {
    let abs = timeToHours(time)
    if (abs < bedAbs) abs += 24
    return PLOT_LEFT + ((abs - bedAbs) / (wakeAbs - bedAbs)) * (PLOT_RIGHT - PLOT_LEFT)
  }

  // Filled column per segment, baseline -> stage level.
  const columns: { x: number; w: number; y: number; h: number; stage: SleepStage }[] = []
  let cursor = 0
  for (const seg of segments) {
    const x = xForMinute(cursor)
    const w = xForMinute(cursor + seg.minutes) - x
    const h = levelFor(seg.stage) * PLOT_H
    columns.push({ x, w, y: PLOT_BOTTOM - h, h, stage: seg.stage })
    cursor += seg.minutes
  }

  const ticks = [
    { time: sleep.bedtime, anchor: 'start' as const },
    ...MID_TICKS.map((time) => ({ time, anchor: 'middle' as const })),
    { time: sleep.wakeTime, anchor: 'end' as const },
  ]

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full overflow-visible"
      role="img"
      aria-label="Sleep stages across the night"
    >
      <defs>
        <linearGradient id="hyp-indigo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-indigo)" stopOpacity={0.95} />
          <stop offset="100%" stopColor="var(--color-indigo)" stopOpacity={0.28} />
        </linearGradient>
        <linearGradient id="hyp-rose" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-rose)" stopOpacity={0.95} />
          <stop offset="100%" stopColor="var(--color-rose)" stopOpacity={0.4} />
        </linearGradient>
      </defs>

      {/* Row baselines + labels */}
      {ROWS.map(({ stage, level }) => {
        const y = PLOT_BOTTOM - level * PLOT_H
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

      {/* Filled stage columns */}
      {columns.map((c, i) => (
        <rect
          key={i}
          x={c.x}
          y={c.y}
          width={Math.max(c.w, 0.5)}
          height={c.h}
          rx={1.5}
          fill={c.stage === 'Awake' ? 'url(#hyp-rose)' : 'url(#hyp-indigo)'}
        />
      ))}

      {/* Time ticks */}
      {ticks.map(({ time, anchor }) => (
        <text
          key={time}
          x={xForClock(time)}
          y={H - 5}
          fontSize={9}
          textAnchor={anchor}
          fill="var(--color-text-muted)"
        >
          {formatClock12(time)}
        </text>
      ))}
    </svg>
  )
}
