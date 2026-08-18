/**
 * Validators for the assistant's tool-call inputs (see atlas-api's
 * ASSISTANT_TOOLS). Anthropic's structured tool-use already constrains the
 * shape via input_schema, but this is model-generated JSON crossing a network
 * boundary — validate defensively before it touches app state, same pattern as
 * calendarAI's toParsedEvent.
 */

import type { ProposedTargets } from './targetsAI'
import { toParsedEvent, type ParsedEvent } from './calendarAI'
import type { MealType } from '../data'

export interface LogMealInput {
  mealType: MealType
  name: string
  kcal: number
  protein: number
  carbs: number
  fat: number
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** Validate a `set_nutrition_targets` tool call's input. */
export function asProposedTargets(input: unknown): ProposedTargets | null {
  if (input === null || typeof input !== 'object') return null
  const o = input as Record<string, unknown>
  if (!isNum(o.calorieTarget) || !isNum(o.protein) || !isNum(o.carbs) || !isNum(o.fat)) return null
  return {
    calorieTarget: Math.round(o.calorieTarget),
    protein: Math.round(o.protein),
    carbs: Math.round(o.carbs),
    fat: Math.round(o.fat),
    goalLabel: typeof o.goalLabel === 'string' && o.goalLabel.trim() ? o.goalLabel.trim() : 'Custom goal',
    reasoning: typeof o.reasoning === 'string' ? o.reasoning : '',
    tips: Array.isArray(o.tips) ? o.tips.filter((t): t is string => typeof t === 'string' && t.trim() !== '') : [],
  }
}

/** Validate an `add_calendar_events` tool call's input. */
export function asCalendarEvents(input: unknown): ParsedEvent[] | null {
  if (input === null || typeof input !== 'object') return null
  const events = (input as Record<string, unknown>).events
  if (!Array.isArray(events)) return null
  const parsed = events.map(toParsedEvent).filter((e): e is ParsedEvent => e !== null)
  return parsed.length > 0 ? parsed : null
}

/** Validate a `set_hydration_goal` tool call's input. */
export function asHydrationLitres(input: unknown): number | null {
  if (input === null || typeof input !== 'object') return null
  const litres = (input as Record<string, unknown>).litres
  return isNum(litres) ? litres : null
}

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

/** Validate a `log_meal` tool call's input. */
export function asLogMeal(input: unknown): LogMealInput | null {
  if (input === null || typeof input !== 'object') return null
  const o = input as Record<string, unknown>
  const name = typeof o.name === 'string' ? o.name.trim() : ''
  if (!name || !isNum(o.kcal) || !isNum(o.protein) || !isNum(o.carbs) || !isNum(o.fat)) return null
  const mealType = MEAL_TYPES.includes(o.mealType as MealType) ? (o.mealType as MealType) : 'snack'
  return {
    mealType,
    name,
    kcal: Math.round(o.kcal),
    protein: Math.round(o.protein),
    carbs: Math.round(o.carbs),
    fat: Math.round(o.fat),
  }
}
