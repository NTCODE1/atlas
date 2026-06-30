import { useState } from 'react'
import {
  caffeine,
  caffeineClearsAt,
  caffeineLevelAt,
  hoursToTime,
  initialCaffeineDoses,
  type CaffeineDose,
} from '../caffeine'
import { formatToday } from '../data'
import { useCountUp } from '../hooks/useCountUp'
import CaffeineChart from '../components/energy/CaffeineChart'
import DoseList from '../components/energy/DoseList'

function currentHour(): number {
  const now = new Date()
  return now.getHours() + now.getMinutes() / 60
}

export default function Energy() {
  const [doses, setDoses] = useState<CaffeineDose[]>(initialCaffeineDoses)

  const nowHour = currentHour()
  // Caffeine in system right now: the decay curve summed across logged doses.
  const level = Math.round(caffeineLevelAt(doses, nowHour))
  const animatedLevel = useCountUp(level)

  const clearHour = caffeineClearsAt(doses)
  const clearsAt = level < caffeine.clearThresholdMg || clearHour === null
    ? null
    : hoursToTime(clearHour)

  const addDose = (dose: Omit<CaffeineDose, 'id'>) => {
    setDoses((prev) => [...prev, { ...dose, id: `d-${Date.now()}` }])
  }

  const updateDose = (dose: CaffeineDose) => {
    setDoses((prev) => prev.map((d) => (d.id === dose.id ? dose : d)))
  }

  const deleteDose = (id: string) => {
    setDoses((prev) => prev.filter((d) => d.id !== id))
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 pb-28">
      {/* Header */}
      <div className="pt-1">
        <h1 className="font-display text-[32px] font-bold leading-tight text-text">Energy</h1>
        <p className="mt-0.5 text-text-muted">{formatToday()}</p>
      </div>

      {/* Hero — caffeine in system */}
      <div className="card-grad mt-4 rounded-3xl border border-border bg-surface px-5 py-5">
        <span className="text-[11px] font-medium tracking-wider text-text-muted">
          CAFFEINE IN SYSTEM
        </span>
        <div className="mt-1 flex items-end justify-between">
          <div className="flex items-baseline gap-1">
            <span className="num-glow font-display text-[56px] font-bold leading-none text-accent">
              {animatedLevel}
            </span>
            <span className="text-lg text-text-muted">mg</span>
          </div>
          <div className="pb-1 text-right">
            {clearsAt ? (
              <>
                <p className="text-xs text-text-muted">clears at</p>
                <p className="font-display text-lg font-semibold text-text">{clearsAt}</p>
              </>
            ) : (
              <p className="font-display text-lg font-semibold text-accent">clear</p>
            )}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="mt-4 rounded-2xl border border-border bg-surface px-4 py-4">
        <CaffeineChart doses={doses} nowHour={nowHour} />
      </div>

      {/* Doses */}
      <div className="mt-4">
        <DoseList
          doses={doses}
          onAdd={addDose}
          onUpdate={updateDose}
          onDelete={deleteDose}
        />
      </div>
    </div>
  )
}
