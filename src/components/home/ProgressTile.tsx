import { Crosshair } from 'lucide-react'
import { useSettings } from '../../settingsContext'
import { useDeepWork } from '../../hooks/useDeepWork'
import { deepWorkProgress, formatDeepWorkMinutes } from '../../deepWork'

/** Tap to start/stop a deep-work session; the bar fills toward the daily goal. */
export default function ProgressTile() {
  const { settings } = useSettings()
  const { active, activeMinutes, todayMinutes, start, stop } = useDeepWork()
  const progress = deepWorkProgress(todayMinutes, settings.deepWorkGoalMinutes)

  return (
    <button
      type="button"
      onClick={active ? stop : start}
      aria-pressed={active}
      aria-label={active ? 'Stop deep work session' : 'Start deep work session'}
      className={`glass press flex flex-1 flex-col rounded-2xl px-4 py-4 text-left transition-colors ${
        active ? 'ring-1 ring-accent/60' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-medium tracking-wider text-text-muted">DEEP WORK</span>
        <span
          className={`grid h-7 w-7 place-items-center rounded-full transition-colors ${
            active ? 'bg-accent text-bg' : 'bg-fill text-text-muted'
          }`}
        >
          <Crosshair size={15} strokeWidth={2} />
        </span>
      </div>

      <div className="mt-2 flex items-baseline gap-1">
        <span className="num-glow font-display text-2xl font-bold tabular-nums text-text">
          {formatDeepWorkMinutes(todayMinutes)}
        </span>
      </div>
      <span className="mt-0.5 text-xs text-text-muted">
        {active
          ? `running · ${formatDeepWorkMinutes(activeMinutes)}`
          : `of ${formatDeepWorkMinutes(settings.deepWorkGoalMinutes)} goal`}
      </span>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-fill-2">
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{
            width: `${Math.round(progress * 100)}%`,
            background: 'linear-gradient(90deg, var(--color-accent), var(--color-sky))',
          }}
        />
      </div>
    </button>
  )
}
