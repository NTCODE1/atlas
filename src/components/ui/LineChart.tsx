import { useId } from 'react'

export interface ChartPoint {
  /** ISO date (YYYY-MM-DD) the value belongs to. */
  t: string
  v: number
}

interface LineChartProps {
  points: ChartPoint[]
  unit?: string
  /** Stroke/area color; defaults to the accent blue. */
  color?: string
  height?: number
}

// viewBox geometry — scales to card width, mirrors CaffeineChart's approach.
const W = 320
const PAD_L = 34
const PAD_R = 10
const PAD_T = 12
const PAD_B = 20

const shortDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

/**
 * Generic time-series line chart: area gradient, dots, y-axis ticks and
 * sparse date labels. Points are spaced evenly by index (an entry log, not a
 * continuous time axis), which keeps sparse histories readable.
 */
export default function LineChart({
  points,
  unit,
  color = 'var(--color-accent)',
  height = 170,
}: LineChartProps) {
  const gradId = useId()
  if (points.length === 0) return null

  const H = height
  const plotRight = W - PAD_R
  const plotBottom = H - PAD_B

  const values = points.map((p) => p.v)
  const rawMin = Math.min(...values)
  const rawMax = Math.max(...values)
  const span = rawMax - rawMin || Math.abs(rawMax) * 0.1 || 1
  const yMin = rawMin - span * 0.15
  const yMax = rawMax + span * 0.15

  const xFor = (i: number) =>
    points.length === 1
      ? (PAD_L + plotRight) / 2
      : PAD_L + (i / (points.length - 1)) * (plotRight - PAD_L)
  const yFor = (v: number) => plotBottom - ((v - yMin) / (yMax - yMin)) * (plotBottom - PAD_T)

  const linePoints = points.map((p, i) => `${xFor(i).toFixed(1)},${yFor(p.v).toFixed(1)}`)
  const areaPath =
    `M ${xFor(0).toFixed(1)},${plotBottom} ` +
    `L ${linePoints.join(' L ')} ` +
    `L ${xFor(points.length - 1).toFixed(1)},${plotBottom} Z`

  // Up to 3 y ticks and ~4 sparse x labels.
  const yTicks = [rawMin, (rawMin + rawMax) / 2, rawMax]
  const labelEvery = Math.max(1, Math.ceil(points.length / 4))
  const xLabelIdx = points
    .map((_, i) => i)
    .filter((i) => i === 0 || i === points.length - 1 || i % labelEvery === 0)

  const fmt = (v: number) => (Math.abs(v) >= 1000 ? `${Math.round(v / 100) / 10}k` : `${Math.round(v * 10) / 10}`)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full overflow-visible" role="img" aria-label={`Chart${unit ? ` (${unit})` : ''}`}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* y ticks + gridlines */}
      {yTicks.map((v, i) => (
        <g key={i}>
          <line
            x1={PAD_L}
            y1={yFor(v)}
            x2={plotRight}
            y2={yFor(v)}
            stroke="var(--color-border)"
            strokeWidth={1}
            strokeDasharray={i === 0 ? undefined : '3 5'}
          />
          <text
            x={PAD_L - 5}
            y={yFor(v) + 3}
            fontSize={9}
            textAnchor="end"
            fill="var(--color-text-muted)"
          >
            {fmt(v)}
          </text>
        </g>
      ))}

      {/* area + line */}
      {points.length > 1 && <path d={areaPath} fill={`url(#${gradId})`} />}
      <polyline
        points={linePoints.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* dots */}
      {points.map((p, i) => (
        <circle
          key={p.t + i}
          cx={xFor(i)}
          cy={yFor(p.v)}
          r={points.length > 20 ? 2 : 3}
          fill={color}
          stroke="var(--color-surface)"
          strokeWidth={1.5}
        />
      ))}

      {/* sparse date labels */}
      {xLabelIdx.map((i) => (
        <text
          key={i}
          x={xFor(i)}
          y={H - 6}
          fontSize={9}
          textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}
          fill="var(--color-text-muted)"
        >
          {shortDate(points[i].t)}
        </text>
      ))}
    </svg>
  )
}
