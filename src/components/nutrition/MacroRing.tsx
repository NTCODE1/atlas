import type { CSSProperties } from 'react'
import { useCountUp } from '../../hooks/useCountUp'
import type { MacroColor } from '../../data'

interface MacroRingProps {
  label: string
  grams: number
  target: number
  color: MacroColor
}

const SIZE = 104
const STROKE = 9
const RADIUS = (SIZE - STROKE) / 2
const CIRC = 2 * Math.PI * RADIUS

// Monochrome ramp — each macro gets a different brightness rather than a hue
// so the three rings stay distinguishable at a glance (labels confirm which).
const COLORS: Record<MacroColor, { stroke: string; glow: string }> = {
  mint: { stroke: 'var(--color-accent-bright)', glow: 'rgba(255,255,255,0.45)' },
  amber: { stroke: 'var(--color-sky)', glow: 'rgba(255,255,255,0.25)' },
  indigo: { stroke: 'var(--color-cyan)', glow: 'rgba(255,255,255,0.15)' },
}

/** Compact macro donut: grams in the centre, label + target beneath. */
export default function MacroRing({ label, grams, target, color }: MacroRingProps) {
  const count = useCountUp(grams, 1200)
  const pct = Math.min(grams / target, 1)
  const targetOffset = CIRC * (1 - pct)
  const { stroke, glow } = COLORS[color]

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center">
      {/* w-full + aspect-square lets the ring shrink to fit narrow screens (the
          SVG's viewBox scales its contents automatically); max-width caps it at
          the original 104px so nothing changes on wider screens. */}
      <div className="relative w-full aspect-square" style={{ maxWidth: SIZE }}>
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="-rotate-90 overflow-visible w-full h-full"
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--color-fill)"
            strokeWidth={STROKE}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={stroke}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            className="ring-arc"
            style={
              {
                '--target-offset': `${targetOffset}px`,
                '--circ': `${CIRC}px`,
                filter: `drop-shadow(0 0 4px ${glow}) drop-shadow(0 0 9px ${glow})`,
              } as CSSProperties
            }
          />
        </svg>

        <div className="absolute inset-0 grid place-items-center">
          <span className="num-glow font-display text-xl font-bold text-text">{count}g</span>
        </div>
      </div>

      <span className="mt-2 text-sm font-medium text-text">{label}</span>
      <span className="text-xs text-text-muted">/ {target}g</span>
    </div>
  )
}
