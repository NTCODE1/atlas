import { ArrowDown, ArrowUp } from 'lucide-react'
import type { Stat } from '../../data'

/** Maps spark values to an SVG polyline within a w×h box. */
function sparkPoints(spark: number[], w: number, h: number): string {
  const max = Math.max(...spark)
  const min = Math.min(...spark)
  const range = max - min || 1
  const step = spark.length > 1 ? w / (spark.length - 1) : 0
  return spark
    .map((v, i) => {
      const x = i * step
      const y = h - ((v - min) / range) * h
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

export default function StatTile({ stat }: { stat: Stat }) {
  const TrendIcon = stat.trendDir === 'down' ? ArrowDown : ArrowUp

  return (
    <div className="glass-subtle flex flex-1 flex-col rounded-2xl px-3 py-3">
      <span className="text-[11px] font-medium tracking-wider text-text-muted">
        {stat.label}
      </span>

      <div className="mt-1.5 flex items-baseline gap-0.5">
        <span className="font-display text-2xl font-bold text-text">{stat.value}</span>
        <span className="text-xs text-text-muted">{stat.unit}</span>
        {stat.value2 && (
          <>
            <span className="ml-1 font-display text-2xl font-bold text-text">
              {stat.value2}
            </span>
            <span className="text-xs text-text-muted">{stat.unit2}</span>
          </>
        )}
      </div>

      <div className="mt-1 flex items-center justify-between">
        {stat.trend ? (
          <span className="flex items-center gap-0.5 text-xs font-medium text-sky">
            <TrendIcon size={12} strokeWidth={2.5} />
            {stat.trend}
          </span>
        ) : (
          <span className="text-xs text-text-muted">{stat.sub}</span>
        )}

        <svg width="40" height="16" viewBox="0 0 40 16" className="overflow-visible">
          <polyline
            points={sparkPoints(stat.spark, 40, 16)}
            fill="none"
            stroke="var(--color-sky)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.8}
          />
        </svg>
      </div>
    </div>
  )
}
