import { RefreshCw, Sparkles } from 'lucide-react'
import { useDailyBriefing } from '../../hooks/useDailyBriefing'

/**
 * Daily AI brief on Home — a terse coach summary of today's metrics (readiness,
 * sleep, HRV, training load, macro gaps). Generated once per day (cached) with a
 * manual refresh button. Degrades gracefully when the AI is unreachable.
 */
export default function BriefingCard() {
  const { brief, loading, error, refresh } = useDailyBriefing()

  return (
    <div className="card-grad-glass rounded-3xl px-5 py-5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-medium tracking-wider text-text-muted">
          <Sparkles size={13} strokeWidth={2} />
          DAILY BRIEF
        </span>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          aria-label="Refresh briefing"
          className="press grid h-8 w-8 place-items-center rounded-full text-text-muted transition-colors hover:text-text disabled:opacity-50"
        >
          <RefreshCw size={16} strokeWidth={2} className={loading ? 'animate-spin' : undefined} />
        </button>
      </div>

      <div className="mt-2 min-h-[3rem]">
        {loading && !brief ? (
          <div className="space-y-2" aria-hidden>
            <div className="h-3.5 w-full animate-pulse rounded bg-fill-2" />
            <div className="h-3.5 w-11/12 animate-pulse rounded bg-fill-2" />
            <div className="h-3.5 w-2/3 animate-pulse rounded bg-fill-2" />
          </div>
        ) : brief ? (
          <p className="text-[15px] leading-relaxed text-text">{brief}</p>
        ) : (
          <p className="text-sm leading-relaxed text-text-muted">
            {error
              ? 'Briefing unavailable right now — tap ↻ to retry.'
              : 'No briefing yet — tap ↻ to generate one.'}
          </p>
        )}
      </div>
    </div>
  )
}
