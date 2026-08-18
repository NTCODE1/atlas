import type { EnergyForecast } from '../../energyForecast'
import { caffeine } from '../../caffeine'

interface EnergyForecastChartProps {
  forecast: EnergyForecast
  /** Current time in decimal hours. */
  nowHour: number
}

// viewBox geometry — mirrors CaffeineChart so the two charts line up.
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

const { dayStartHour: START, dayEndHour: END } = caffeine
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/**
 * Smooth SVG path through points via Catmull-Rom → cubic bézier. Control points
 * use a low tension (1/6) so the curve stays close to the data without ringing.
 */
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`
  }
  return d
}

/**
 * Predicted-energy curve across the day. Same axis and idiom as CaffeineChart:
 * filled area + line, a "now" marker, plus shaded best-focus window(s) and a
 * marker at the afternoon dip. Monochrome (theme-aware via CSS vars).
 */
export default function EnergyForecastChart({ forecast, nowHour }: EnergyForecastChartProps) {
  const { samples, focusWindows, dipHour } = forecast

  const xFor = (hour: number) =>
    PLOT_LEFT + ((hour - START) / (END - START)) * (PLOT_RIGHT - PLOT_LEFT)
  const yFor = (energy: number) => PLOT_BOTTOM - (energy / 100) * (PLOT_BOTTOM - PLOT_TOP)

  // Thin to ~1.5 h control points (plus the first & last) so the bézier flows
  // cleanly instead of tracing every fine sample's tiny wiggles.
  const CONTROL_STEP = 6 // 6 × 0.25 h = 1.5 h
  const control = samples.filter((_, i) => i % CONTROL_STEP === 0 || i === samples.length - 1)
  const curvePts = control.map((s) => ({ x: xFor(s.hour), y: yFor(s.energy) }))
  const linePath = smoothPath(curvePts)
  const areaPath =
    `M ${xFor(START).toFixed(1)},${PLOT_BOTTOM} ` +
    `L ${curvePts[0].x.toFixed(1)},${curvePts[0].y.toFixed(1)} ` +
    `${linePath.slice(linePath.indexOf('C'))} ` +
    `L ${xFor(END).toFixed(1)},${PLOT_BOTTOM} Z`

  const nowClamped = clamp(nowHour, START, END)
  const energyAtNow = samples[Math.round((nowClamped - START) / 0.25)]?.energy ?? 0
  const energyAtDip =
    dipHour != null ? (samples[Math.round((dipHour - START) / 0.25)]?.energy ?? 0) : 0

  const xTicks = [6, 9, 12, 15, 18, 21, 24]

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full overflow-visible"
      role="img"
      aria-label="Predicted energy over the day"
    >
      <defs>
        <linearGradient id="energy-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.32} />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* Best-focus window shading */}
      {focusWindows.map((win, i) => (
        <rect
          key={i}
          x={xFor(win.start)}
          y={PLOT_TOP}
          width={xFor(win.end) - xFor(win.start)}
          height={PLOT_BOTTOM - PLOT_TOP}
          fill="var(--color-accent)"
          opacity={0.08}
        />
      ))}

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
      <path d={areaPath} fill="url(#energy-area)" />
      <path
        d={linePath}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Afternoon dip marker */}
      {dipHour != null && (
        <>
          <circle
            cx={xFor(dipHour)}
            cy={yFor(energyAtDip)}
            r={3}
            fill="var(--color-surface)"
            stroke="var(--color-text-muted)"
            strokeWidth={1.5}
          />
          <text
            x={xFor(dipHour)}
            y={yFor(energyAtDip) + 14}
            fontSize={8}
            textAnchor="middle"
            fill="var(--color-text-muted)"
          >
            dip
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
        cy={yFor(energyAtNow)}
        r={4.5}
        fill="var(--color-accent)"
        stroke="var(--color-surface)"
        strokeWidth={2}
      />

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
