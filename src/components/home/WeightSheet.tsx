import { useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { useSettings } from '../../settingsContext'
import { useHealth } from '../../api/healthContext'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { displayToKg, kgToDisplay } from '../../settings'
import { entriesToPoints, latestEntry, sortEntries, type WeightEntry } from '../../weightLog'
import { snapshotList, type DailySnapshot, type SnapshotStore } from '../../dailySnapshot'
import { dateISO } from '../../habits'
import { todayISO } from '../../workouts'
import Sheet from '../ui/Sheet'
import LineChart from '../ui/LineChart'

interface WeightSheetProps {
  entries: WeightEntry[]
  setEntries: React.Dispatch<React.SetStateAction<WeightEntry[]>>
  onClose: () => void
}

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

/** Body-weight log: current weight hero, trend chart, add form, recent list. */
export default function WeightSheet({ entries, setEntries, onClose }: WeightSheetProps) {
  const { settings } = useSettings()
  const { health } = useHealth()
  const unit = settings.weightUnit

  // Body composition synced from the scale via Apple Health (read-only).
  const hasBodyComp =
    health.weightKg != null ||
    health.bodyFatPercentage != null ||
    health.leanBodyMassKg != null ||
    health.bmi != null

  // Most recent prior day with a recorded weight → the "vs previous" baseline.
  const [snapshots] = useLocalStorage<SnapshotStore>('atlas.snapshots', {})
  const priorDays = snapshotList(snapshots).filter((s) => s.date < dateISO() && s.weightKg != null)
  const prior: DailySnapshot | undefined = priorDays[priorDays.length - 1]

  // Delta chip vs the prior reading, in the display unit for mass and % for the rest.
  const massDelta = (todayKg?: number | null, priorKg?: number | null): TileDelta | undefined => {
    if (todayKg == null || priorKg == null) return undefined
    const d = Math.round((kgToDisplay(todayKg, unit) - kgToDisplay(priorKg, unit)) * 10) / 10
    if (d === 0) return undefined
    return { dir: d > 0 ? 'up' : 'down', text: `${Math.abs(d).toFixed(1)} ${unit}` }
  }
  const scalarDelta = (
    today?: number | null,
    priorVal?: number | null,
    suffix = '',
  ): TileDelta | undefined => {
    if (today == null || priorVal == null) return undefined
    const d = Math.round((today - priorVal) * 10) / 10
    if (d === 0) return undefined
    return { dir: d > 0 ? 'up' : 'down', text: `${Math.abs(d).toFixed(1)}${suffix}` }
  }

  const [date, setDate] = useState(todayISO())
  const [value, setValue] = useState('')

  const latest = latestEntry(entries)
  const points = entriesToPoints(entries, unit)

  const add = () => {
    const v = Number(value)
    if (!Number.isFinite(v) || v <= 0) return
    const kg = displayToKg(v, unit)
    // One entry per date — logging the same day again overwrites it.
    setEntries((prev) => [...prev.filter((e) => e.date !== date), { date, kg }])
    setValue('')
  }

  const remove = (entryDate: string) =>
    setEntries((prev) => prev.filter((e) => e.date !== entryDate))

  const recent = sortEntries(entries).reverse().slice(0, 14)

  return (
    <Sheet title="Body weight" maxHeight="tall" onClose={onClose}>
      {/* Current weight */}
      <div className="flex items-baseline gap-1.5">
        <span className="num-glow font-display text-[44px] font-bold leading-none text-text">
          {latest ? kgToDisplay(latest.kg, unit) : '—'}
        </span>
        <span className="text-lg text-text-muted">{unit}</span>
        {latest && (
          <span className="ml-2 text-xs text-text-muted">last logged {formatDate(latest.date)}</span>
        )}
      </div>

      {/* Trend */}
      {points.length >= 2 && (
        <div className="glass-subtle mt-4 rounded-2xl px-3 py-3">
          <LineChart points={points} unit={unit} color="var(--color-sky)" />
        </div>
      )}

      {/* Body composition from the scale (Apple Health) */}
      {hasBodyComp && (
        <>
          <span className="mt-5 block text-[11px] font-medium tracking-wider text-text-muted">
            BODY COMPOSITION
            <span className="ml-1.5 font-normal normal-case tracking-normal">
              · Apple Health
              {health.weightDate && `, ${formatDate(health.weightDate)}`}
              {prior && ` · vs ${formatDate(prior.date)}`}
            </span>
          </span>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <BodyCompTile
              label="Weight"
              value={health.weightKg != null ? `${kgToDisplay(health.weightKg, unit)} ${unit}` : '—'}
              delta={massDelta(health.weightKg, prior?.weightKg)}
            />
            <BodyCompTile
              label="Body fat"
              value={health.bodyFatPercentage != null ? `${health.bodyFatPercentage.toFixed(1)}%` : '—'}
              delta={scalarDelta(health.bodyFatPercentage, prior?.bodyFatPercentage, '%')}
            />
            <BodyCompTile
              label="Lean mass"
              value={
                health.leanBodyMassKg != null
                  ? `${kgToDisplay(health.leanBodyMassKg, unit)} ${unit}`
                  : '—'
              }
              delta={massDelta(health.leanBodyMassKg, prior?.leanBodyMassKg)}
            />
            <BodyCompTile
              label="BMI"
              value={health.bmi != null ? health.bmi.toFixed(1) : '—'}
              delta={scalarDelta(health.bmi, prior?.bmi)}
            />
          </div>
        </>
      )}

      {/* Add entry */}
      <span className="mt-5 block text-[11px] font-medium tracking-wider text-text-muted">
        LOG WEIGHT
      </span>
      <div className="mt-2 flex gap-2">
        <input
          type="date"
          value={date}
          max={todayISO()}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent/60 focus:outline-none"
        />
        <div className="flex flex-1 items-center rounded-lg border border-border bg-bg px-3 focus-within:border-accent/60">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={0.1}
            value={value}
            placeholder="0.0"
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            className="w-full bg-transparent py-2 text-sm text-text placeholder:text-text-muted focus:outline-none"
          />
          <span className="text-xs text-text-muted">{unit}</span>
        </div>
        <button
          type="button"
          onClick={add}
          aria-label="Add weight entry"
          className="press grid w-11 place-items-center rounded-lg bg-accent text-bg transition-opacity hover:opacity-90"
        >
          <Plus size={17} strokeWidth={2.5} />
        </button>
      </div>

      {/* Recent entries */}
      {recent.length > 0 && (
        <>
          <span className="mt-5 block text-[11px] font-medium tracking-wider text-text-muted">
            RECENT
          </span>
          <ul className="mt-2 flex flex-col">
            {recent.map((entry, i) => (
              <li
                key={entry.date}
                className={`flex items-center gap-3 py-2.5 ${i > 0 ? 'border-t border-border' : ''}`}
              >
                <span className="flex-1 text-sm text-text">{formatDate(entry.date)}</span>
                <span className="font-display text-sm font-semibold text-text">
                  {kgToDisplay(entry.kg, unit)}
                  <span className="ml-0.5 text-xs font-normal text-text-muted">{unit}</span>
                </span>
                <button
                  type="button"
                  onClick={() => remove(entry.date)}
                  aria-label={`Delete entry for ${formatDate(entry.date)}`}
                  className="press grid h-7 w-7 place-items-center rounded-full text-text-muted transition-colors hover:bg-rose/10 hover:text-rose"
                >
                  <Trash2 size={14} strokeWidth={2} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Sheet>
  )
}

/** A "vs previous reading" change chip: arrow + magnitude, single accent color. */
interface TileDelta {
  dir: 'up' | 'down'
  text: string
}

/** Small read-only body-composition metric tile, with an optional change chip
 *  styled like the Home StatTile trend (sky arrow + value, no red/green). */
function BodyCompTile({ label, value, delta }: { label: string; value: string; delta?: TileDelta }) {
  const TrendIcon = delta?.dir === 'down' ? ArrowDown : ArrowUp
  return (
    <div className="glass-subtle rounded-2xl px-3.5 py-3">
      <span className="text-[11px] font-medium tracking-wider text-text-muted">
        {label.toUpperCase()}
      </span>
      <div className="mt-1 font-display text-lg font-semibold text-text">{value}</div>
      {delta && (
        <span className="mt-0.5 flex items-center gap-0.5 text-xs font-medium text-sky">
          <TrendIcon size={12} strokeWidth={2.5} />
          {delta.text}
        </span>
      )}
    </div>
  )
}
