// --- Goals ------------------------------------------------------------------
//
// Aspirational goals shown at the top of the Motivation tab. Two kinds:
//   • milestone — checkable steps; progress = done / total
//   • numeric   — a running value toward a target (money, distance, books…),
//                 optionally mirroring the Finance tab's savings goal.

import type { IconId } from './icons'
import { formatEuro } from './finance'

export interface Milestone {
  id: string
  label: string
  done: boolean
}

export type GoalType = 'milestone' | 'numeric'

export interface Goal {
  id: string
  title: string
  icon: IconId
  type: GoalType
  // milestone
  milestones?: Milestone[]
  // numeric
  current?: number
  target?: number
  unit?: string
  unitPosition?: 'prefix' | 'suffix'
  /** numeric only: mirror the Finance savings goal instead of manual values. */
  linkFinanceSavings?: boolean
  /** YYYY-MM-DD, optional. */
  deadline?: string
  createdAt: string
}

export type GoalStatus = 'completed' | 'deadline-soon' | 'in-progress'

/** The Finance savings values a linked goal mirrors. */
export interface FinanceSavings {
  current: number
  target: number
}

export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `g-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

/** Numeric values resolved against the Finance link when present. */
export function resolvedNumeric(
  goal: Goal,
  finance?: FinanceSavings,
): { current: number; target: number; unit: string; unitPosition: 'prefix' | 'suffix' } {
  if (goal.linkFinanceSavings && finance) {
    return { current: finance.current, target: finance.target, unit: '€', unitPosition: 'prefix' }
  }
  return {
    current: goal.current ?? 0,
    target: goal.target ?? 0,
    unit: goal.unit ?? '',
    unitPosition: goal.unitPosition ?? 'suffix',
  }
}

/** Progress 0–1. */
export function goalProgress(goal: Goal, finance?: FinanceSavings): number {
  if (goal.type === 'milestone') {
    const ms = goal.milestones ?? []
    if (ms.length === 0) return 0
    return clamp01(ms.filter((m) => m.done).length / ms.length)
  }
  const { current, target } = resolvedNumeric(goal, finance)
  return target > 0 ? clamp01(current / target) : 0
}

const DAY = 86_400_000

export function goalStatus(goal: Goal, progress: number): GoalStatus {
  if (progress >= 1) return 'completed'
  if (goal.deadline) {
    const days = (new Date(`${goal.deadline}T00:00:00`).getTime() - Date.now()) / DAY
    if (days <= 7) return 'deadline-soon'
  }
  return 'in-progress'
}

export const STATUS_LABEL: Record<GoalStatus, string> = {
  completed: 'Completed',
  'deadline-soon': 'Deadline soon',
  'in-progress': 'In progress',
}

const withUnit = (value: number, unit: string, position: 'prefix' | 'suffix') => {
  const n = value.toLocaleString()
  if (!unit) return n
  return position === 'prefix' ? `${unit}${n}` : `${n} ${unit}`
}

/** Right-hand detail text: "3/4 milestones" or "€6,000/€10,000". */
export function progressDetail(goal: Goal, finance?: FinanceSavings): string {
  if (goal.type === 'milestone') {
    const ms = goal.milestones ?? []
    const done = ms.filter((m) => m.done).length
    return `${done}/${ms.length} milestone${ms.length === 1 ? '' : 's'}`
  }
  const { current, target, unit, unitPosition } = resolvedNumeric(goal, finance)
  if (goal.linkFinanceSavings) return `${formatEuro(current)}/${formatEuro(target)}`
  // Suffix units read cleaner said once at the end ("12/24 books"); prefix units
  // (currencies) repeat on both ("€6,000/€10,000").
  if (unitPosition === 'suffix') {
    const pair = `${current.toLocaleString()}/${target.toLocaleString()}`
    return unit ? `${pair} ${unit}` : pair
  }
  return `${withUnit(current, unit, 'prefix')}/${withUnit(target, unit, 'prefix')}`
}

/** Not-completed first, then newest — for the section preview + list order. */
export function sortGoals(goals: Goal[], finance?: FinanceSavings): Goal[] {
  return [...goals].sort((a, b) => {
    const ca = goalProgress(a, finance) >= 1 ? 1 : 0
    const cb = goalProgress(b, finance) >= 1 ? 1 : 0
    if (ca !== cb) return ca - cb
    return b.createdAt.localeCompare(a.createdAt)
  })
}
