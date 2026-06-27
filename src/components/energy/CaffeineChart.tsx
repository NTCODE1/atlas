import {
  caffeine,
  caffeineLevelAt,
  timeToHours,
  type CaffeineDose,
} from '../../data'

interface CaffeineChartProps {
  doses: CaffeineDose[]
  /** Current time in decimal hours. */
  nowHour: number
}

// viewBox geometry — the SVG scales to the card width, keeping this aspect.
const W = 320
const H = 184
const PAD_L = 6
const PAD_R = 6
const PAD_T = 12
const PAD_B = 20

const PLOT_LEFT = PAD_L
const PLOT_RIGHT = W - PAD_R
const PLOT_TOP = PAD_T
const PLOT_BOTTOM = H - PAD_B

const { dayStartHour: START, dayEndHour: END, sleepThresholdMg: THRESHOLD } = caffeine

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

export default function CaffeineChart({ doses, nowHour }: CaffeineChartProps) {
  // Sample the decay curve every 15 minutes across the day.
  const samples: { hour: number; mg: number }[] = []
  for (let hour = START; hour <= END + 1e-6; hour += 0.25) {
    samples.push({ hour, mg: caffeineLevelAt(doses, hour) })
  }

  const peak = Math.max(...samples.map((s) => s.mg), THRESHOLD)
  const yMax = peak * 1.15 || 1

  const xFor = (hour: number) =>
    PLOT_LEFT + ((hour - START) / (END - START)) * (PLOT_RIGHT - PLOT_LEFT)
  const yFor = (mg: number) =>
    PLOT_BOTTOM - (mg / yMax) * (PLOT_BOTTOM - PLOT_TOP)

  const linePoints = samples.map((s) => `${xFor(s.hour).toFixed(1)},${yFor(s.mg).toFixed(1)}`)
  const areaPath =
    `M ${xFor(START).toFixed(1)},${PLOT_BOTTOM} ` +
    `L ${linePoints.join(' L ')} ` +
    `L ${xFor(END).toFixed(1)},${PLOT_BOTTOM} Z`

  const bedHour = timeToHours(caffeine.bedtime)
  const thresholdY = yFor(THRESHOLD)
  const nowClamped = clamp(nowHour, START, END)

  const xTicks = [6, 9, 12, 15, 18, 21, 24]

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full overflow-visible"
      role="img"
      aria-label="Caffeine level over the day"
    >
      <defs>
        <linearGradient id="caffeine-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-amber)" stopOpacity={0.35} />
          <stop offset="100%" stopColor="var(--color-amber)" stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* x-axis baseline */}
      <line
        x1={PLOT_LEFT}
        y1={PLOT_BOTTOM}
        x2={PLOT_RIGHT}
        y2={PLOT_BOTTOM}
        stroke="var(--color-border)"
        strokeWidth={1}
      />

      {/* Filled area + curve */}
      <path d={areaPath} fill="url(#caffeine-area)" />
      <polyline
        points={linePoints.join(' ')}
        fill="none"
        stroke="var(--color-amber)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* 50 mg sleep threshold */}
      <line
        x1={PLOT_LEFT}
        y1={thresholdY}
        x2={PLOT_RIGHT}
        y2={thresholdY}
        stroke="var(--color-rose)"
        strokeWidth={1}
        strokeDasharray="4 4"
        opacity={0.7}
      />
      <text
        x={PLOT_LEFT + 2}
        y={thresholdY - 4}
        fontSize={9}
        fill="var(--color-rose)"
        opacity={0.85}
      >
        50 mg · sleep
      </text>

      {/* Bedtime */}
      {bedHour >= START && bedHour <= END && (
        <>
          <line
            x1={xFor(bedHour)}
            y1={PLOT_TOP - 4}
            x2={xFor(bedHour)}
            y2={PLOT_BOTTOM}
            stroke="var(--color-indigo)"
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity={0.7}
          />
          <text
            x={xFor(bedHour) - 2}
            y={PLOT_TOP - 6}
            fontSize={9}
            textAnchor="end"
            fill="var(--color-indigo)"
            opacity={0.9}
          >
            Bed
          </text>
        </>
      )}

      {/* Now marker */}
      <line
        x1={xFor(nowClamped)}
        y1={PLOT_TOP - 4}
        x2={xFor(nowClamped)}
        y2={PLOT_BOTTOM}
        stroke="var(--color-text-muted)"
        strokeWidth={1}
        opacity={0.35}
      />
      <circle
        cx={xFor(nowClamped)}
        cy={yFor(caffeineLevelAt(doses, nowClamped))}
        r={4.5}
        fill="var(--color-amber)"
        stroke="var(--color-surface)"
        strokeWidth={2}
      />

      {/* Dose dots */}
      {doses.map((dose) => {
        const h = timeToHours(dose.time)
        if (h < START || h > END) return null
        return (
          <circle
            key={dose.id}
            cx={xFor(h)}
            cy={yFor(caffeineLevelAt(doses, h))}
            r={3}
            fill="var(--color-amber)"
            stroke="var(--color-surface)"
            strokeWidth={1.5}
          />
        )
      })}

      {/* x-axis labels */}
      {xTicks.map((h) => (
        <text
          key={h}
          x={xFor(h)}
          y={H - 6}
          fontSize={9}
          textAnchor="middle"
          fill="var(--color-text-muted)"
        >
          {String(h).padStart(2, '0')}
        </text>
      ))}
    </svg>
  )
}
