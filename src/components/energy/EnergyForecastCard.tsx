import { Coffee, TrendingUp, Zap } from 'lucide-react'
import { hoursToTime, type CaffeineDose } from '../../caffeine'
import { computeEnergyForecast } from '../../energyForecast'
import { useCountUp } from '../../hooks/useCountUp'
import EnergyForecastChart from './EnergyForecastChart'

interface EnergyForecastCardProps {
  doses: CaffeineDose[]
  sleepScore: number
  recoveryScore: number
  activityScore: number
  steps: number
  activeKcal: number
  nowHour: number
  fastingHours?: number
  hydrationRatio?: number
}

/** Round a decimal hour to a clock label, e.g. 9.5 → "9:30", 11 → "11". */
const hourLabel = (h: number) => {
  const time = hoursToTime(h)
  return time.endsWith(':00') ? String(Number(time.slice(0, 2))) : time
}

/** Energy-forecast hero: predicted-now number, state, curve, and callouts. */
export default function EnergyForecastCard(props: EnergyForecastCardProps) {
  const forecast = computeEnergyForecast(props)
  const animated = useCountUp(forecast.nowEnergy)

  const focus = forecast.focusWindows[0]
  const focusLabel = focus ? `${hourLabel(focus.start)}–${hourLabel(focus.end)}` : null

  return (
    <div className="card-grad-glass mt-4 rounded-3xl px-5 py-5">
      <div className="flex items-center gap-1.5">
        <Zap size={13} strokeWidth={2.5} className="text-text-muted" />
        <span className="text-[11px] font-medium tracking-wider text-text-muted">
          ENERGY FORECAST
        </span>
      </div>

      <div className="mt-1 flex items-end justify-between">
        <div className="flex items-baseline gap-1">
          <span className="num-glow font-display text-[56px] font-bold leading-none text-accent">
            {animated}
          </span>
          <span className="text-lg text-text-muted">%</span>
        </div>
        <span className="pb-1 font-display text-lg font-semibold text-text">
          {forecast.nowState}
        </span>
      </div>

      <div className="mt-3">
        <EnergyForecastChart forecast={forecast} nowHour={props.nowHour} />
      </div>

      {/* Callouts */}
      <div className="mt-2 flex flex-wrap gap-2">
        {focusLabel && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-fill px-3 py-1.5 text-xs text-text">
            <TrendingUp size={13} strokeWidth={2} className="text-text-muted" />
            Best focus {focusLabel}
          </span>
        )}
        {forecast.caffeineCutoff && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-fill px-3 py-1.5 text-xs text-text">
            <Coffee size={13} strokeWidth={2} className="text-text-muted" />
            Caffeine by {forecast.caffeineCutoff}
          </span>
        )}
      </div>
    </div>
  )
}
