import { RefreshCw, Sparkles } from 'lucide-react'
import { useNutritionGaps } from '../../hooks/useNutritionGaps'

/**
 * "Fuel Gaps" card — today's 2-3 largest intake-vs-target gaps with whole-food
 * suggestions, from the AI. Generated once per day (cached) once a meal is logged,
 * with a manual refresh. Degrades gracefully when the AI is unreachable.
 */
export default function NutritionGapCard() {
  const { gaps, loading, error, hasMeals, refresh } = useNutritionGaps()

  return (
    <div className="card-grad-glass rounded-3xl px-5 py-5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-medium tracking-wider text-text-muted">
          <Sparkles size={13} strokeWidth={2} />
          FUEL GAPS
        </span>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading || !hasMeals}
          aria-label="Refresh fuel gaps"
          className="press grid h-8 w-8 place-items-center rounded-full text-text-muted transition-colors hover:text-text disabled:opacity-40"
        >
          <RefreshCw size={16} strokeWidth={2} className={loading ? 'animate-spin' : undefined} />
        </button>
      </div>

      <div className="mt-3 min-h-[3rem]">
        {!hasMeals ? (
          <p className="text-sm leading-relaxed text-text-muted">
            Log a meal to see today's fuel gaps.
          </p>
        ) : loading && !gaps ? (
          <div className="space-y-3" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3.5 w-1/2 animate-pulse rounded bg-fill-2" />
                <div className="h-3 w-11/12 animate-pulse rounded bg-fill-2" />
              </div>
            ))}
          </div>
        ) : gaps && gaps.length > 0 ? (
          <ul className="space-y-3">
            {gaps.map((g, i) => (
              <li key={i}>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-text">{g.nutrient}</span>
                  {g.amountShort && (
                    <span className="text-xs text-text-muted">{g.amountShort}</span>
                  )}
                </div>
                {g.foodSuggestions.length > 0 && (
                  <p className="mt-0.5 text-sm leading-relaxed text-text-muted">
                    {g.foodSuggestions.join(' · ')}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : gaps && gaps.length === 0 ? (
          <p className="text-sm leading-relaxed text-text-muted">
            No major gaps right now — nicely balanced.
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-text-muted">
            {error
              ? "Couldn't load gaps — tap ↻ to retry."
              : "Tap ↻ to check today's fuel gaps."}
          </p>
        )}
      </div>
    </div>
  )
}
