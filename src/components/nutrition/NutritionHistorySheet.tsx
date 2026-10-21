import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronDown, Share } from 'lucide-react'
import type { Meal } from '../../data'
import { useMeals } from '../../hooks/useMeals'
import { useGoalHistory, useNutritionTargets, type MacroTargets } from '../../nutritionTargets'
import { mealTotals, type MacroTotals } from '../../nutrition'
import { pullSync } from '../../api/syncClient'
import { cutoffDateISO, RAW_RETENTION_DAYS } from '../../dailySnapshot'
import { todayISO } from '../../workouts'
import { PLAN } from '../../plan'
import { MEAL_META, MEAL_ORDER } from './mealMeta'
import Sheet from '../ui/Sheet'
import SegmentedControl from '../ui/SegmentedControl'
import ProgressBar from '../ui/ProgressBar'
import { Eyebrow } from '../ui/SectionHeader'

type Range = '7' | '14' | '30' | '90'

const RANGES: { id: Range; label: string }[] = [
  { id: '7', label: '7 days' },
  { id: '14', label: '14 days' },
  { id: '30', label: '30 days' },
  { id: '90', label: '90 days' },
]

interface DayRow {
  date: string
  meals: Meal[]
  totals: MacroTotals
  target: MacroTargets
  logged: boolean
  proteinHit: boolean
  kcalHit: boolean
}

const fmtDay = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
const r = (n: number) => Math.round(n)

/**
 * Day-by-day eating history for reviewing with the coach: per-day kcal and
 * macros against that day's target, averages and hit-rates for the range,
 * each day expandable to its meals, and a plain-text "Share with coach".
 *
 * Old meals: the phone historically kept only 7 days, but the Worker never
 * deleted older rows (nutritionSync.ts only replaces the last 7 days), so the
 * full history is on the server. It's fetched here read-only and merged with
 * the local log — local owns the recent window (so a just-deleted meal can't
 * reappear before its delete has synced), the server fills in everything older.
 */
export default function NutritionHistorySheet({ onClose }: { onClose: () => void }) {
  const { meals: localMeals } = useMeals()
  const { targets: currentTargets } = useNutritionTargets()
  const [goalHistory] = useGoalHistory()
  const [range, setRange] = useState<Range>('7')
  const [serverMeals, setServerMeals] = useState<Meal[] | null>(null)
  const [serverFailed, setServerFailed] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const [shared, setShared] = useState(false)

  useEffect(() => {
    let alive = true
    void pullSync<Meal[]>('meals').then((res) => {
      if (!alive) return
      if (res) setServerMeals(res.value)
      else setServerFailed(true)
    })
    return () => {
      alive = false
    }
  }, [])

  const today = todayISO()

  const allMeals = useMemo(() => {
    const localWindow = cutoffDateISO(today, RAW_RETENTION_DAYS)
    const byId = new Map<string, Meal>()
    for (const m of serverMeals ?? []) if (m.date && m.date < localWindow) byId.set(m.id, m)
    for (const m of localMeals) byId.set(m.id, m)
    return [...byId.values()].filter((m) => m.date)
  }, [serverMeals, localMeals, today])

  /** The target in force on `date`: the latest goal set on or before it, else today's. */
  const targetOn = useMemo(() => {
    const sorted = [...goalHistory].sort((a, b) => a.date.localeCompare(b.date))
    return (date: string): MacroTargets => {
      let t: MacroTargets = currentTargets
      for (const g of sorted) if (g.date <= date) t = { kcal: g.kcal, protein: g.protein, carbs: g.carbs, fat: g.fat }
      return t
    }
  }, [goalHistory, currentTargets])

  const days: DayRow[] = useMemo(() => {
    const n = Number(range)
    const out: DayRow[] = []
    for (let i = 0; i < n; i++) {
      const date = cutoffDateISO(today, i)
      const meals = allMeals.filter((m) => m.date === date)
      const totals = mealTotals(meals)
      const target = targetOn(date)
      out.push({
        date,
        meals,
        totals,
        target,
        logged: meals.length > 0,
        proteinHit: totals.protein >= target.protein,
        kcalHit: Math.abs(totals.kcal - target.kcal) <= PLAN.kcalToleranceKcal,
      })
    }
    return out
  }, [range, allMeals, targetOn, today])

  const logged = days.filter((d) => d.logged)
  const avg = (f: (d: DayRow) => number) => (logged.length ? logged.reduce((s, d) => s + f(d), 0) / logged.length : 0)
  const summary = {
    kcal: avg((d) => d.totals.kcal),
    protein: avg((d) => d.totals.protein),
    carbs: avg((d) => d.totals.carbs),
    fat: avg((d) => d.totals.fat),
    proteinDays: logged.filter((d) => d.proteinHit).length,
    kcalDays: logged.filter((d) => d.kcalHit).length,
  }

  const share = async () => {
    const first = days[days.length - 1].date
    const lines = [
      `Apex nutrition · ${fmtDay(first)} – ${fmtDay(today)}`,
      `Logged ${logged.length}/${days.length} days`,
      `Average ${r(summary.kcal).toLocaleString()} kcal · P ${r(summary.protein)} g · C ${r(summary.carbs)} g · F ${r(summary.fat)} g`,
      `Protein target hit ${summary.proteinDays}/${logged.length} days · calories within ±${PLAN.kcalToleranceKcal} ${summary.kcalDays}/${logged.length}`,
      '',
    ]
    for (const d of days) {
      if (!d.logged) {
        lines.push(`${fmtDay(d.date)}: nothing logged`)
        continue
      }
      lines.push(
        `${fmtDay(d.date)}: ${r(d.totals.kcal).toLocaleString()} / ${d.target.kcal.toLocaleString()} kcal · P ${r(d.totals.protein)} C ${r(d.totals.carbs)} F ${r(d.totals.fat)}`,
      )
      for (const m of sortMeals(d.meals)) {
        const macro = [m.kcal != null ? `${m.kcal} kcal` : null, m.protein != null ? `P ${m.protein}` : null]
          .filter(Boolean)
          .join(', ')
        lines.push(`  ${MEAL_META[m.type].label}: ${m.name}${macro ? ` (${macro})` : ''}`)
      }
    }
    const text = lines.join('\n')
    try {
      if (navigator.share) await navigator.share({ title: 'Apex nutrition', text })
      else await navigator.clipboard.writeText(text)
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    } catch {
      // Share sheet dismissed — nothing to do.
    }
  }

  return (
    <Sheet title="Nutrition history" maxHeight="tall" onClose={onClose}>
      <SegmentedControl options={RANGES} value={range} onChange={setRange} />

      {/* Range summary */}
      <div className="glass-subtle mt-4 rounded-2xl px-4 py-4">
        <div className="flex items-baseline justify-between">
          <Eyebrow>Daily average</Eyebrow>
          <span className="text-xs text-text-muted">
            {logged.length}/{days.length} days logged
          </span>
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-[32px] font-semibold leading-none tracking-tight text-text tabular-nums">
            {logged.length ? r(summary.kcal).toLocaleString() : '—'}
          </span>
          <span className="text-sm text-text-muted">kcal</span>
        </div>
        <div className="mt-1 text-[13px] text-text-muted tabular-nums">
          P {r(summary.protein)} g · C {r(summary.carbs)} g · F {r(summary.fat)} g
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <HitTile label="Protein target" hit={summary.proteinDays} of={logged.length} />
          <HitTile label={`Calories ±${PLAN.kcalToleranceKcal}`} hit={summary.kcalDays} of={logged.length} />
        </div>
      </div>

      {serverFailed && (
        <p className="mt-3 text-xs text-text-muted">
          Couldn't reach the server — showing only meals stored on this phone.
        </p>
      )}
      {serverMeals === null && !serverFailed && (
        <p className="mt-3 text-xs text-text-muted">Loading older meals…</p>
      )}

      {/* Day by day */}
      <ul className="mt-4 flex flex-col gap-2">
        {days.map((d) => {
          const expanded = open === d.date
          return (
            <li key={d.date} className="glass-subtle overflow-hidden rounded-2xl">
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : d.date)}
                disabled={!d.logged}
                aria-expanded={expanded}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={`text-[15px] ${d.logged ? 'text-text' : 'text-text-muted'}`}>
                      {d.date === today ? 'Today' : fmtDay(d.date)}
                    </span>
                    <span className="text-[13px] tabular-nums text-text-muted">
                      {d.logged ? (
                        <>
                          <span className="font-semibold text-text">{r(d.totals.kcal).toLocaleString()}</span> /{' '}
                          {d.target.kcal.toLocaleString()}
                        </>
                      ) : (
                        'nothing logged'
                      )}
                    </span>
                  </div>
                  {d.logged && (
                    <>
                      <ProgressBar value={d.target.kcal ? d.totals.kcal / d.target.kcal : 0} className="mt-2 !h-1" />
                      <div className="mt-1.5 flex items-center gap-2 text-[11px] tabular-nums text-text-muted">
                        <span className={d.proteinHit ? 'text-good' : ''}>P {r(d.totals.protein)}</span>
                        <span>C {r(d.totals.carbs)}</span>
                        <span>F {r(d.totals.fat)}</span>
                        <span className="ml-auto">{d.meals.length} meals</span>
                      </div>
                    </>
                  )}
                </div>
                {d.logged && (
                  <ChevronDown
                    size={16}
                    strokeWidth={1.8}
                    className={`shrink-0 text-text-muted transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
                  />
                )}
              </button>
              {expanded && (
                <ul className="border-t border-white/[0.05] px-4 pb-2">
                  {sortMeals(d.meals).map((m) => {
                    const { icon: Icon, label } = MEAL_META[m.type]
                    return (
                      <li key={m.id} className="flex items-start gap-2.5 py-2">
                        <Icon size={15} strokeWidth={1.8} className="mt-0.5 shrink-0 text-text-muted" />
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] text-text">{m.name}</div>
                          <div className="text-[11px] text-text-muted">
                            {label}
                            {m.protein != null && ` · P ${m.protein}g`}
                          </div>
                        </div>
                        <span className="shrink-0 text-[13px] tabular-nums text-text-muted">
                          {m.kcal != null ? `${m.kcal} kcal` : '—'}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </li>
          )
        })}
      </ul>

      <button
        type="button"
        onClick={share}
        className="press mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-accent-bright py-3 text-[15px] font-semibold text-bg shadow-[0_0_20px_rgba(255,255,255,0.18)]"
      >
        {shared ? <Check size={17} strokeWidth={2.6} className="tick-pop" /> : <Share size={17} strokeWidth={2.2} />}
        {shared ? 'Shared' : 'Share with coach'}
      </button>
    </Sheet>
  )
}

/** Meals in breakfast → snack order, then by log time. */
function sortMeals(meals: Meal[]): Meal[] {
  return [...meals].sort(
    (a, b) =>
      MEAL_ORDER.indexOf(a.type) - MEAL_ORDER.indexOf(b.type) || (a.createdAt ?? '').localeCompare(b.createdAt ?? ''),
  )
}

function HitTile({ label, hit, of }: { label: string; hit: number; of: number }) {
  return (
    <div className="rounded-xl bg-white/[0.04] px-3 py-2.5">
      <div className="text-[11px] text-text-muted">{label}</div>
      <div className="mt-0.5 text-[17px] font-semibold tabular-nums text-text">
        {hit}
        <span className="text-[13px] font-normal text-text-muted">/{of} days</span>
      </div>
    </div>
  )
}
