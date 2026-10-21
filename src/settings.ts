import { DEFAULT_DEEP_WORK_GOAL_MINUTES } from './deepWork'

export type WeightUnit = 'kg' | 'lb'
export type Theme = 'dark' | 'light'
export type Sex = 'male' | 'female'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type GoalType = 'cut' | 'maintain' | 'bulk'

export interface Settings {
  name: string
  age: number | null
  heightCm: number | null
  weightUnit: WeightUnit
  /** Unused since the redesign went dark-only; kept so already-synced settings still parse. */
  theme: Theme
  /** Sleep score (0–100) below which a "low sleep" notification fires. */
  sleepAlertThreshold: number
  waterGoalL: number
  /** Daily deep-work goal, in minutes. */
  deepWorkGoalMinutes: number
  /** Training sessions per week the Train hero counts toward (gym + watch workouts). */
  weeklySessionTarget: number
  /** Personal healthy HRV range (ms) — readiness/sleep score HRV components
   *  score 100 inside this band, falling off outside either bound. */
  hrvRangeLowMs: number
  hrvRangeHighMs: number
  notificationsEnabled: boolean
  /** In-app habit streak-at-risk reminders in the notification center. */
  habitRemindersEnabled: boolean
  /** Show the floating assistant button. Long-press it (3s) to hide; re-enable here. */
  showAssistantButton: boolean
  sex: Sex | null
  activityLevel: ActivityLevel | null
  goalType: GoalType | null
  weightKg: number | null
  /** Set once the first-launch onboarding flow finishes; gates it from reappearing. */
  onboardingComplete: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  name: 'Niila',
  age: null,
  heightCm: null,
  weightUnit: 'kg',
  theme: 'dark',
  sleepAlertThreshold: 60,
  waterGoalL: 2.5,
  deepWorkGoalMinutes: DEFAULT_DEEP_WORK_GOAL_MINUTES,
  weeklySessionTarget: 5,
  hrvRangeLowMs: 63,
  hrvRangeHighMs: 85,
  notificationsEnabled: false,
  habitRemindersEnabled: true,
  showAssistantButton: true,
  sex: null,
  activityLevel: null,
  goalType: null,
  weightKg: null,
  onboardingComplete: false,
}

const KG_PER_LB = 0.45359237

/** Convert stored kilograms into the display unit, rounded to one decimal. */
export function kgToDisplay(kg: number, unit: WeightUnit): number {
  const v = unit === 'kg' ? kg : kg / KG_PER_LB
  return Math.round(v * 10) / 10
}

/** Convert a value entered in the display unit back to kilograms. */
export function displayToKg(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value : value * KG_PER_LB
}
