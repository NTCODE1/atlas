import { Check, ListChecks } from 'lucide-react'
import { useHealth } from '../../api/healthContext'
import { useSettings } from '../../settingsContext'
import { useSyncedStorage } from '../../hooks/useSyncedStorage'
import { useWeightLog } from '../../hooks/useWeightLog'
import { useMeals } from '../../hooks/useMeals'
import { useDeepWork } from '../../hooks/useDeepWork'
import { useNutritionTargets } from '../../nutritionTargets'
import { readJournalDay } from '../../hooks/useJournalMonth'
import { mealTotals } from '../../nutrition'
import { minutesFromNoon } from '../../dailySnapshot'
import { dateISO, type HabitChecks } from '../../habits'
import { PLAN } from '../../plan'
import Card from '../ui/Card'
import { Eyebrow } from '../ui/SectionHeader'

/**
 * Manual checklist ticks ride on the existing synced habit-checks store
 * (date → ids) under their own `plan-*` ids. HabitTracker only renders ids
 * that have a HabitDef, so these never show up as habits there — this keeps
 * the checklist synced across devices with no new Worker domain.
 */
const MANUAL = {
  breakfast: 'plan-breakfast-before-phone',
  phoneOut: 'plan-phone-out',
} as const

interface Item {
  id: string
  label: string
  /** Right-side hint: a time, a count, "all day". */
  hint: string
  done: boolean
  /** Present for manual items — tapping toggles the tick. */
  onToggle?: () => void
}

/** The plan's daily checklist (section 8): auto-ticks from data where possible. */
export default function TodayChecklist() {
  const { health } = useHealth()
  const { settings } = useSettings()
  const [weights] = useWeightLog()
  const { todayMeals } = useMeals()
  const { todayMinutes } = useDeepWork()
  const { targets } = useNutritionTargets()
  const [checks, setChecks] = useSyncedStorage<HabitChecks>('atlas.habits.checks', {}, 'habitChecks')

  const today = dateISO()
  const todayChecks = checks[today] ?? []
  const toggle = (id: string) =>
    setChecks((prev) => {
      const current = prev[today] ?? []
      return {
        ...prev,
        [today]: current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
      }
    })

  const totals = mealTotals(todayMeals)
  const weighed = weights.some((w) => w.date === today) || health.weightDate === today

  const blockTarget = Math.max(1, Math.floor(settings.deepWorkGoalMinutes / PLAN.focusBlockMinutes))
  const blocks = Math.floor(todayMinutes / PLAN.focusBlockMinutes)

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowTasks = (readJournalDay(tomorrow).record?.entries ?? []).filter((e) => e.kind === 'task').length

  // Last night's bedtime from Apple Health — the only lights-out we can know.
  const bed = health.inBedStart ?? health.sleepStart
  const bedMin = bed ? minutesFromNoon(bed) : null
  const lightsOutMin = minutesFromNoon(PLAN.lightsOut)
  const lightsOutKept = bedMin != null && lightsOutMin != null && bedMin <= lightsOutMin + PLAN.lightsOutGraceMin

  const items: Item[] = [
    { id: 'weighed', label: 'Weighed in', hint: '07:00', done: weighed },
    {
      id: MANUAL.breakfast,
      label: 'Breakfast before phone',
      hint: '07:00',
      done: todayChecks.includes(MANUAL.breakfast),
      onToggle: () => toggle(MANUAL.breakfast),
    },
    {
      id: 'protein',
      label: `Protein ${targets.protein} g`,
      hint: `${Math.round(totals.protein)} g`,
      done: totals.protein >= targets.protein,
    },
    {
      id: 'kcal',
      label: `Calories ±${PLAN.kcalToleranceKcal}`,
      hint: `${Math.round(totals.kcal).toLocaleString()} / ${targets.kcal.toLocaleString()}`,
      done: Math.abs(totals.kcal - targets.kcal) <= PLAN.kcalToleranceKcal,
    },
    {
      id: 'focus',
      label: `Focus blocks ${Math.min(blocks, blockTarget)}/${blockTarget}`,
      hint: '90 min',
      done: blocks >= blockTarget,
    },
    {
      id: 'tomorrow',
      label: 'Tomorrow planned',
      hint: `${Math.min(tomorrowTasks, 3)}/3 tasks`,
      done: tomorrowTasks >= 3,
    },
    {
      id: MANUAL.phoneOut,
      label: 'Phone out of bedroom',
      hint: PLAN.phoneOut,
      done: todayChecks.includes(MANUAL.phoneOut),
      onToggle: () => toggle(MANUAL.phoneOut),
    },
    {
      id: 'lights',
      label: `Lights out ${PLAN.lightsOut}`,
      hint: bed ? `last night ${bed}` : PLAN.lightsOut,
      done: lightsOutKept,
    },
  ]

  const doneCount = items.filter((i) => i.done).length

  return (
    <Card className="px-4 pb-2 pt-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <ListChecks size={18} strokeWidth={1.75} className="text-text-muted" />
          <div>
            <Eyebrow>Today</Eyebrow>
            <h2 className="text-[17px] font-semibold leading-tight text-text">Checklist</h2>
          </div>
        </div>
        <span className="text-sm tabular-nums text-text-muted">
          <span className="font-semibold text-text">{doneCount}</span>/{items.length}
        </span>
      </div>

      <ul className="mt-2">
        {items.map((item) => (
          <li key={item.id}>
            <ChecklistRow item={item} />
          </li>
        ))}
      </ul>
    </Card>
  )
}

function ChecklistRow({ item }: { item: Item }) {
  const body = (
    <>
      <span
        className={`grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border transition-[background-color,border-color,box-shadow] duration-300 ${
          item.done
            ? 'border-transparent bg-accent-bright text-bg shadow-[0_0_10px_rgba(255,255,255,0.35)]'
            : 'border-white/25'
        }`}
      >
        {item.done && <Check size={13} strokeWidth={3} className="tick-pop" />}
      </span>
      <span className={`flex-1 text-[15px] ${item.done ? 'text-text' : 'text-text/80'}`}>{item.label}</span>
      <span className="text-xs tabular-nums text-text-muted">{item.hint}</span>
    </>
  )
  const cls = 'flex w-full items-center gap-3 border-t border-white/[0.05] py-2.5 text-left'
  // Auto items aren't tappable — they tick themselves from your data.
  return item.onToggle ? (
    <button type="button" onClick={item.onToggle} aria-pressed={item.done} className={`press ${cls}`}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  )
}
