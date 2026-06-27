import { sleep, timeToHours, formatClock12, type SleepSegment, type SleepStage } from '../../data'

interface HypnogramProps {
  segments: SleepSegment[]
}

// viewBox geometry — the SVG scales to the card width, keeping this aspect.
const W = 320
const H = 150
const GUTTER_L = 40 // room for row labels
const PAD_R = 6

const PLOT_LEFT = GUTTER_L
const PLOT_RIGHT = W - PAD_R
const PLOT_TOP = 14 // top (Awake) row centre
const PLOT_BOTTOM = 124 // bottom (Deep) row centre

const BAR = 9 // capsule thickness
const RISER = 2.5 // connector thickness

// Top -> bottom row order; the ribbon sits AT each stage's row.
const ROWS: SleepStage[] = ['Awake', 'REM', 'Core', 'Deep']
const rowY = (stage: SleepStage) =>
  PLOT_TOP + (ROWS.indexOf(stage) / (ROWS.length - 1)) * (PLOT_BOTTOM - PLOT_TOP)

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

  // Bars (one capsule per segment) and risers (transitions between segments).
  const bars: { x: number; w: number; y: number; stage: SleepStage }[] = []
  const risers: { x: number; y1: number; y2: number }[] = []
  let cursor = 0
  segments.forEach((seg, i) => {
    const x = xForMinute(cursor)
    const w = xForMinute(cursor + seg.minutes) - x
    bars.push({ x, w, y: rowY(seg.stage), stage: seg.stage })
    if (i > 0) {
      risers.push({ x, y1: rowY(segments[i - 1].stage), y2: rowY(seg.stage) })
    }
    cursor += seg.minutes
  })

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
        {/* Vertical gradient: colour follows the row (Awake red -> Deep blue). */}
        <linearGradient
          id="hyp-stage"
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1={PLOT_TOP}
          x2="0"
          y2={PLOT_BOTTOM}
        >
          <stop offset="0%" stopColor="#ff6b81" />
          <stop offset="30%" stopColor="#c86bff" />
          <stop offset="60%" stopColor="#7a82ff" />
          <stop offset="100%" stopColor="#5f9bff" />
        </linearGradient>
      </defs>

      {/* Subtle plot frame */}
      <rect
        x={PLOT_LEFT - 3}
        y={4}
        width={PLOT_RIGHT - PLOT_LEFT + 6}
        height={128}
        rx={12}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth={1}
        opacity={0.6}
      />

      {/* Dashed vertical gridlines at the mid ticks */}
      {MID_TICKS.map((time) => (
        <line
          key={time}
          x1={xForClock(time)}
          y1={8}
          x2={xForClock(time)}
          y2={128}
          stroke="var(--color-text-muted)"
          strokeWidth={1}
          strokeDasharray="3 4"
          opacity={0.2}
        />
      ))}

      {/* Row labels */}
      {ROWS.map((stage) => (
        <text
          key={stage}
          x={PLOT_LEFT - 12}
          y={rowY(stage) + 3}
          fontSize={9}
          textAnchor="end"
          fill="var(--color-text-muted)"
        >
          {stage}
        </text>
      ))}

      {/* Ribbon: risers under bars, with a neon glow */}
      <g
        style={{
          filter:
            'drop-shadow(0 0 3px rgba(150,120,255,0.5)) drop-shadow(0 0 7px rgba(150,120,255,0.3))',
        }}
      >
        {risers.map((r, i) => (
          <line
            key={i}
            x1={r.x}
            y1={r.y1}
            x2={r.x}
            y2={r.y2}
            stroke="url(#hyp-stage)"
            strokeWidth={RISER}
            strokeLinecap="round"
          />
        ))}
        {bars.map((b, i) => (
          <rect
            key={i}
            x={b.x}
            y={b.y - BAR / 2}
            width={Math.max(b.w, 2)}
            height={BAR}
            rx={BAR / 2}
            fill="url(#hyp-stage)"
          />
        ))}
      </g>

      {/* Time ticks */}
      {ticks.map(({ time, anchor }) => (
        <text
          key={time}
          x={xForClock(time)}
          y={H - 4}
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
