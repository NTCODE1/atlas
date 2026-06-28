import { ChevronRight } from 'lucide-react'
import { todaysTarget } from '../../data'

const SIZE = 64
const STROKE = 6
const RADIUS = (SIZE - STROKE) / 2
const CIRC = 2 * Math.PI * RADIUS

/** Compact readiness ring + "Today's target" explainer card. */
export default function TargetCard() {
  const offset = CIRC * (1 - todaysTarget.score / 100)

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface px-4 py-4">
      {/* Compact mint ring */}
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={STROKE}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--color-mint)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-lg font-bold leading-none text-text">
            {todaysTarget.score}
          </span>
          <span className="mt-0.5 text-[8px] font-semibold tracking-[0.15em] text-mint">
            {todaysTarget.label}
          </span>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <span className="text-[11px] font-semibold tracking-wider text-mint">TODAY'S TARGET</span>
        <h3 className="mt-0.5 font-display text-base font-bold text-text">{todaysTarget.title}</h3>
        <p className="mt-1 text-xs leading-snug text-text-muted">{todaysTarget.text}</p>
      </div>

      <ChevronRight size={20} className="shrink-0 text-text-muted" />
    </div>
  )
}
