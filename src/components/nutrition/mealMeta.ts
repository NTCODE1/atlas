import { Apple, Moon, Sun, SunDim } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { MealType } from '../../data'

interface MealMeta {
  label: string
  icon: LucideIcon
  /** Tailwind text-colour class for the icon in the meals list. */
  color: string
}

/** Single source of truth for meal-type icon, label, and colour. */
export const MEAL_META: Record<MealType, MealMeta> = {
  breakfast: { label: 'Breakfast', icon: Sun, color: 'text-amber' },
  lunch: { label: 'Lunch', icon: SunDim, color: 'text-amber' },
  dinner: { label: 'Dinner', icon: Moon, color: 'text-indigo' },
  snack: { label: 'Snack', icon: Apple, color: 'text-mint' },
}

export const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']
