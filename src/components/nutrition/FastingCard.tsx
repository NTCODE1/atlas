import { useEffect, useState } from 'react'
import { Timer } from 'lucide-react'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import {
  clockFromMs,
  DEFAULT_FASTING,
  FASTING_PRESETS,
  fastingProgress,
  formatElapsed,
  elapsedHours,
  projectedEnd,
  type FastingState,
} from '../../fasting'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Progress ring geometry (monochrome donut, ring-arc idiom).
const SIZE = 132
const STROKE = 10
const RADIUS = (SIZE - STROKE) / 2
const CIRC = 2 * Math.PI * RADIUS

/** Intermittent-fasting timer: start/stop, live elapsed, editable target. */
export default function FastingCard() {
  const [state, setState] = useLocalStorage<FastingState>('atlas.fasting', DEFAULT_FASTING)
  const [now, setNow] = useState(Date.now())

  // Tick while a fast is running so the elapsed time and ring advance.
  useEffect(() => {
    if (!state.active) return
    const period = prefersReducedMotion() ? 60_000 : 1000
    const id = setInterval(() => setNow(Date.now()), period)
    return () => clearInterval(id)
  }, [state.active])

  const start = () => setState((s) => ({ ...s, active: true, startMs: Date.now() }))
  const stop = () => setState((s) => ({ ...s, active: false, startMs: null }))
  const setTarget = (targetHours: number) => setState((s) => ({ ...s, targetHours }))

  const elapsed = elapsedHours(state, now)
  const progress = fastingProgress(state, now)
  const targetOffset = CIRC * (1 - progress)
  const end = projectedEnd(state)
  const reached = progress >= 1

  return (
    <div className="glass mt-4 rounded-3xl px-5 py-5">
      <div className="flex items-center gap-1.5">
        <Timer size={13} strokeWidth={2.5} className="text-text-muted" />
        <span className="text-[11px] font-medium tracking-wider text-text-muted">FASTING</span>
      </div>

      {state.active ? (
        <div className="mt-3 flex items-center gap-5">
          {/* Progress ring with elapsed time in the centre */}
          <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
            <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90">
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
                stroke="var(--color-accent)"
                strokeWidth={STROKE}
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={targetOffset}
                style={{ strokeDashoffset: targetOffset, transition: 'stroke-dashoffset 0.9s var(--ease-out-soft)' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="num-glow font-display text-3xl font-bold leading-none text-text tabular-nums">
                {formatElapsed(elapsed)}
              </span>
              <span className="mt-1 text-[10px] font-medium tracking-wider text-text-muted">
                {reached ? 'GOAL MET' : `OF ${state.targetHours}H`}
              </span>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Started</span>
              <span className="font-medium text-text tabular-nums">
                {state.startMs != null ? clockFromMs(state.startMs) : '—'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Goal at</span>
              <span className="font-medium text-text tabular-nums">
                {end != null ? clockFromMs(end) : '—'}
              </span>
            </div>
            <button
              type="button"
              onClick={stop}
              className="press mt-1 rounded-full border border-border-strong bg-fill py-2.5 text-sm font-semibold text-text transition-colors hover:bg-fill-2"
            >
              End fast
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <div className="flex items-baseline gap-2">
            <span className="num-glow font-display text-4xl font-bold leading-none text-text">
              {state.targetHours}h
            </span>
            <span className="text-sm text-text-muted">fast · {24 - state.targetHours}h eating</span>
          </div>

          {/* Target presets */}
          <div className="mt-4 flex gap-2">
            {FASTING_PRESETS.map((h) => {
              const selected = h === state.targetHours
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => setTarget(h)}
                  aria-pressed={selected}
                  className={`press flex-1 rounded-full py-2 text-sm font-semibold transition-colors ${
                    selected
                      ? 'bg-accent/20 text-accent'
                      : 'border border-border bg-fill text-text-muted hover:text-text'
                  }`}
                >
                  {h}h
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={start}
            className="press mt-3 w-full rounded-full bg-accent py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
          >
            Start fast
          </button>
        </div>
      )}
    </div>
  )
}
