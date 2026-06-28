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

const COLORS: Record<MacroColor, { stroke: string; glow: string }> = {
  mint: { stroke: '#34f5c5', glow: 'rgba(52,245,197,0.5)' },
  amber: { stroke: '#ffb155', glow: 'rgba(255,177,85,0.5)' },
  indigo: { stroke: '#8a93ff', glow: 'rgba(138,147,255,0.5)' },
}

/** Compact macro donut: grams in the centre, label + target beneath. */
export default function MacroRing({ label, grams, target, color }: MacroRingProps) {
  const count = useCountUp(grams, 1200)
  const pct = Math.min(grams / target, 1)
  const targetOffset = CIRC * (1 - pct)
  const { stroke, glow } = COLORS[color]

  return (
    <div className="flex flex-1 flex-col items-center">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="-rotate-90 overflow-visible"
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
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
