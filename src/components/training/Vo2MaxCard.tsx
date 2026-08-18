import type { MetricPoint } from '../../api/healthMapper'
import type { Sex } from '../../settings'
import {
  mergeVo2MaxSeries,
  vo2MaxCategory,
  vo2MaxGaugePercent,
  FITNESS_CATEGORY_LABEL,
  type Vo2MaxEntry,
} from '../../vo2max'
import LineChart from '../ui/LineChart'
import Vo2MaxRing from './Vo2MaxRing'

interface Vo2MaxCardProps {
  /** From Apple Health, via useHealth() — empty for a COROS-only setup, since
   *  COROS has no way to write VO2 max back to HealthKit. Kept so this
   *  self-heals if that ever changes; the manual log is the primary source. */
  liveSeries: MetricPoint[]
  manualEntries: Vo2MaxEntry[]
  age: number | null
  sex: Sex | null
  onLogClick: () => void
}

/** Trend direction vs. the earliest point in the series, for a plain-language delta. */
function trendLabel(series: MetricPoint[]): string | null {
  if (series.length < 2) return null
  const delta = series[series.length - 1].v - series[0].v
  if (Math.abs(delta) < 0.5) return 'stable'
  return delta > 0 ? `up ${delta.toFixed(1)}` : `down ${Math.abs(delta).toFixed(1)}`
}

/** Cardio tab: VO2 max trend + an age/sex fitness-tier rating, backed by a
 *  manual log (see Vo2MaxSheet) merged with any live Apple Health reading. */
export default function Vo2MaxCard({ liveSeries, manualEntries, age, sex, onLogClick }: Vo2MaxCardProps) {
  const series = mergeVo2MaxSeries(liveSeries, manualEntries)
  const current = series.length > 0 ? series[series.length - 1].v : null
  const trend = trendLabel(series)
  const category = current !== null && age != null && sex != null ? vo2MaxCategory(current, age, sex) : null
  const gaugePercent =
    current !== null && age != null && sex != null ? vo2MaxGaugePercent(current, age, sex) : 0

  return (
    <div className="glass rounded-[22px] px-4 py-4">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-medium tracking-wider text-text-muted">VO2 MAX</span>
        <div className="flex items-center gap-3">
          {trend && <span className="text-xs text-text-muted">{trend} ml/kg/min</span>}
          <button
            type="button"
            onClick={onLogClick}
            aria-label="Log VO2 max"
            className="press text-xs font-semibold text-accent"
          >
            Log
          </button>
        </div>
      </div>

      {current === null ? (
        <p className="mt-2 text-sm text-text-muted">
          No VO2 max yet — check your COROS app (Training Status → VO2max) and tap Log to add it.
        </p>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-4">
            <Vo2MaxRing value={current} percent={gaugePercent} />
            <div className="min-w-0 flex-1">
              {category ? (
                <>
                  <span className="font-display text-lg font-semibold text-text">
                    {FITNESS_CATEGORY_LABEL[category]}
                  </span>
                  <p className="mt-0.5 text-xs leading-relaxed text-text-muted">
                    For your age and sex, based on standard cardio-fitness norms.
                  </p>
                </>
              ) : (
                <p className="text-xs leading-relaxed text-text-muted">
                  Add your age and sex in Settings to see a fitness rating.
                </p>
              )}
            </div>
          </div>
          {series.length >= 2 && (
            <div className="mt-4">
              <LineChart points={series} unit="ml/kg/min" />
            </div>
          )}
        </>
      )}
    </div>
  )
}
