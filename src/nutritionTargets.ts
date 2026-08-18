import { useLocalStorage } from './hooks/useLocalStorage'
import { nutrition } from './data'

/**
 * User's daily calorie + macro targets. Historically these were bundled
 * constants in data.ts; the AI goal-setting flow makes them editable, so they
 * now live in localStorage (the app has no user-writable KV). Every target
 * reader — the Nutrition screen, the daily briefing, and the nutrition-gap
 * coach (via useTodaySnapshot) — reads through here, so a saved goal updates
 * them everywhere. Goal history is logged alongside for the Settings view.
 */

export interface MacroTargets {
  kcal: number
  protein: number
  carbs: number
  fat: number
}

const TARGETS_KEY = 'atlas.nutrition.targets'
const HISTORY_KEY = 'atlas.goals.targets.log'

const macroTarget = (label: string, fallback: number): number =>
  nutrition.macros.find((m) => m.label === label)?.target ?? fallback

/** Bundled defaults, used until the user sets a goal. */
export const DEFAULT_TARGETS: MacroTargets = {
  kcal: nutrition.target,
  protein: macroTarget('Protein', 150),
  carbs: macroTarget('Carbs', 220),
  fat: macroTarget('Fat', 70),
}

/** Read/write the daily targets. Merged over defaults so older stores gain fields. */
export function useNutritionTargets(): {
  targets: MacroTargets
  setTargets: (t: MacroTargets) => void
} {
  const [stored, setStored] = useLocalStorage<MacroTargets>(TARGETS_KEY, DEFAULT_TARGETS)
  return { targets: { ...DEFAULT_TARGETS, ...stored }, setTargets: setStored }
}

/** One logged goal + the targets it set, for the Settings history view. */
export interface GoalTargetEntry {
  id: string
  /** YYYY-MM-DD the goal was set. */
  date: string
  /** The user's stated goal text (e.g. "I want to lose fat"). */
  goal: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  reasoning?: string
}

/** Read/write the goal history log (newest handling is up to callers). */
export function useGoalHistory(): [
  GoalTargetEntry[],
  React.Dispatch<React.SetStateAction<GoalTargetEntry[]>>,
] {
  return useLocalStorage<GoalTargetEntry[]>(HISTORY_KEY, [])
}
