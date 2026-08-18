import type { CSSProperties } from 'react'
import { Droplet } from 'lucide-react'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { useHydration, useHydrationGoal } from '../../hooks/useHydration'
import { useHealth } from '../../api/healthContext'
import { dateISO } from '../../habits'
import type { SnapshotStore } from '../../dailySnapshot'

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

// % ring geometry.
const R_SIZE = 54
const R_STROKE = 6
const R_RADIUS = (R_SIZE - R_STROKE) / 2
const R_CIRC = 2 * Math.PI * R_RADIUS

/** Monochrome hydration widget: today + % ring, weekly bars, daily average. */
export default function HydrationAverageCard() {
  const { health } = useHealth()
  const { totalMl, drinks } = useHydration()
  const { goalLitres: goal } = useHydrationGoal()
  const [snapshots] = useLocalStorage<SnapshotStore>('atlas.snapshots', {})

  // In-app logged intake is primary; fall back to live health, else 0.
  const loggedLitres = totalMl / 1000
  const todayLitres = loggedLitres > 0 ? loggedLitres : (health.hydrationLitres ?? 0)

  // Real litres logged on a given day, summed from the drinks list (ml → L).
  const litresLoggedOn = (key: string) =>
    drinks.filter((dr) => dr.date === key).reduce((sum, dr) => sum + dr.ml, 0) / 1000

  // Current week Mon→Sun. Today is live; past days use real logged drinks, then
  // a stored snapshot, else 0 — no seeded/fake numbers.
  const monday = new Date()
  monday.setHours(0, 0, 0, 0)
  const weekday = (monday.getDay() + 6) % 7 // Mon = 0
  monday.setDate(monday.getDate() - weekday)
  const todayKey = dateISO()

  const week = DAY_LABELS.map((label, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const key = dateISO(d)
    const isToday = key === todayKey
    const litres = isToday
      ? todayLitres
      : litresLoggedOn(key) || (snapshots[key]?.hydrationLitres ?? 0)
    return { label, litres, isToday }
  })

  // Average over elapsed days only (Mon..today) so future days don't drag it down.
  const elapsed = week.slice(0, weekday + 1)
  const average = elapsed.reduce((sum, d) => sum + d.litres, 0) / elapsed.length
  const pct = Math.max(0, Math.min(100, Math.round((todayLitres / goal) * 100)))
  const ringOffset = R_CIRC * (1 - pct / 100)
  const barMax = Math.max(goal, ...week.map((d) => d.litres)) * 1.05

  return (
    <div className="glass mt-4 rounded-3xl px-5 py-5">
      {/* Today + % ring */}
      <div className="flex items-start justify-between">
        <div className="flex items-baseline gap-1.5">
          <span className="num-glow font-display text-4xl font-bold leading-none text-text">
            {todayLitres.toFixed(1)}
          </span>
          <span className="text-lg text-text-muted">L today</span>
        </div>
        <div className="relative shrink-0" style={{ width: R_SIZE, height: R_SIZE }}>
          <svg width={R_SIZE} height={R_SIZE} viewBox={`0 0 ${R_SIZE} ${R_SIZE}`} className="-rotate-90">
            <circle
              cx={R_SIZE / 2}
              cy={R_SIZE / 2}
              r={R_RADIUS}
              fill="none"
              stroke="var(--color-fill)"
              strokeWidth={R_STROKE}
            />
            <circle
              cx={R_SIZE / 2}
              cy={R_SIZE / 2}
              r={R_RADIUS}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth={R_STROKE}
              strokeLinecap="round"
              strokeDasharray={R_CIRC}
              strokeDashoffset={ringOffset}
            />
          </svg>
          <span className="absolute inset-0 grid place-items-center text-xs font-semibold text-text tabular-nums">
            {pct}%
          </span>
        </div>
      </div>

      {/* Goal row */}
      <div className="mt-4 flex items-center justify-between border-b border-border pb-2">
        <span className="text-[11px] font-medium tracking-wider text-text-muted">GOAL</span>
        <span className="font-display text-sm font-semibold text-text">{goal}L</span>
      </div>

      {/* Weekly bars */}
      <div className="mt-4 flex items-end justify-between gap-2" style={{ height: 96 }}>
        {week.map((d, i) => {
          const h = Math.max((d.litres / barMax) * 84, 6)
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex w-full flex-1 items-end justify-center">
                <div
                  className={`w-full max-w-[26px] rounded-md ${d.isToday ? 'bg-accent' : 'bg-fill-2'}`}
                  style={
                    {
                      height: h,
                      backgroundImage: d.isToday
                        ? undefined
                        : 'linear-gradient(180deg, var(--color-fill-2), var(--color-fill))',
                    } as CSSProperties
                  }
                />
              </div>
              <span
                className={`text-[11px] font-medium ${
                  d.isToday ? 'text-accent' : 'text-text-muted'
                }`}
              >
                {d.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Average */}
      <div className="mt-3 flex items-center gap-1.5 border-t border-border pt-3">
        <Droplet size={13} strokeWidth={2} className="text-text-muted" />
        <span className="font-display text-sm font-semibold text-text">{average.toFixed(1)}</span>
        <span className="text-[11px] font-medium tracking-wider text-text-muted">L/DAY AVERAGE</span>
      </div>
    </div>
  )
}
