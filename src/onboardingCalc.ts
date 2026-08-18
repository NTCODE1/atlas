import type { ActivityLevel, GoalType, Sex } from './settings'

/** Multiplies BMR to estimate total daily energy expenditure. */
export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

/** Flat kcal/day adjustment applied to TDEE per goal. */
export const GOAL_ADJUSTMENT: Record<GoalType, number> = {
  cut: -500,
  maintain: 0,
  bulk: 300,
}

/** Default macro split (% of calories) per goal; each set sums to 100. */
export const DEFAULT_MACRO_SPLIT: Record<GoalType, { protein: number; carbs: number; fat: number }> = {
  cut: { protein: 40, carbs: 30, fat: 30 },
  maintain: { protein: 30, carbs: 40, fat: 30 },
  bulk: { protein: 30, carbs: 45, fat: 25 },
}

/** Mifflin-St Jeor basal metabolic rate (kcal/day). */
export function mifflinStJeorBmr(input: {
  sex: Sex
  weightKg: number
  heightCm: number
  age: number
}): number {
  const { sex, weightKg, heightCm, age } = input
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return sex === 'male' ? base + 5 : base - 161
}

/** BMR × activity multiplier + goal adjustment, rounded to the nearest 10 kcal. */
export function estimateCalorieGoal(input: {
  sex: Sex
  weightKg: number
  heightCm: number
  age: number
  activityLevel: ActivityLevel
  goalType: GoalType
}): number {
  const bmr = mifflinStJeorBmr(input)
  const tdee = bmr * ACTIVITY_MULTIPLIERS[input.activityLevel] + GOAL_ADJUSTMENT[input.goalType]
  return Math.round(tdee / 10) * 10
}

/** Converts a % macro split into grams for a given calorie target. */
export function macroGramsFromSplit(
  kcal: number,
  split: { protein: number; carbs: number; fat: number },
): { protein: number; carbs: number; fat: number } {
  return {
    protein: Math.round((kcal * (split.protein / 100)) / 4),
    carbs: Math.round((kcal * (split.carbs / 100)) / 4),
    fat: Math.round((kcal * (split.fat / 100)) / 9),
  }
}
