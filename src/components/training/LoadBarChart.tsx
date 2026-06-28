import { ChevronDown } from 'lucide-react'
import type { TrainingDay } from '../../data'

const CHART_HEIGHT = 120
/** Min visible bar height so low/rest days still register. */
const MIN_BAR = 10

interface LoadBarChartProps {
  days: TrainingDay[]
}

/**
 * 7-day training-load bar chart (Mon–Sun). Bars scale to the week's peak load;
 * today's bar is mint with a soft glow and a chevron beneath, others are dimmed.
 */
export default function LoadBarChart({ days }: LoadBarChartProps) {
  const max = Math.max(...days.map((d) => d.load), 1)

  return (
    <div className="flex items-end justify-between gap-2" style={{ height: CHART_HEIGHT + 28 }}>
      {days.map((day, i) => {
        const h = Math.max((day.load / max) * CHART_HEIGHT, day.load > 0 ? MIN_BAR : 4)
        return (
          <div key={i} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-end justify-center" style={{ height: CHART_HEIGHT }}>
              <div
                className={`w-full max-w-[22px] rounded-md ${
                  day.isToday
                    ? 'bg-mint shadow-[0_0_16px_rgba(52,245,197,0.45)]'
                    : 'bg-white/10'
                }`}
                style={{ height: h }}
              />
            </div>
            <span
              className={`mt-2 text-[11px] font-medium ${
                day.isToday ? 'text-mint' : 'text-text-muted'
              }`}
            >
              {day.label}
            </span>
            {day.isToday ? (
              <ChevronDown size={12} strokeWidth={2.5} className="mt-0.5 text-mint" />
            ) : (
              <span className="mt-0.5 block h-3" />
            )}
          </div>
        )
      })}
    </div>
  )
}
