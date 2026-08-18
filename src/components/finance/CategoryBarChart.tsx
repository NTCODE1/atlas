import { formatEuro } from '../../finance'

interface CategoryBarChartProps {
  data: { category: string; total: number }[]
}

/** Horizontal monochrome bars — spending per category, largest first. */
export default function CategoryBarChart({ data }: CategoryBarChartProps) {
  if (data.length === 0) {
    return <p className="mt-3 text-sm text-text-muted">No spending logged this month yet.</p>
  }

  const max = Math.max(...data.map((d) => d.total), 1)

  return (
    <div className="mt-3 flex flex-col gap-3">
      {data.map((d) => (
        <div key={d.category}>
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-text">{d.category}</span>
            <span className="font-display text-sm font-semibold text-text tabular-nums">
              {formatEuro(d.total)}
            </span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-fill">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${Math.max((d.total / max) * 100, 3)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
