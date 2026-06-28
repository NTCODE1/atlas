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
  breakfast: { label: 'Breakfast', icon: Sun, color: 'text-text-muted' },
  lunch: { label: 'Lunch', icon: SunDim, color: 'text-text-muted' },
  dinner: { label: 'Dinner', icon: Moon, color: 'text-text-muted' },
  snack: { label: 'Snack', icon: Apple, color: 'text-text-muted' },
}

export const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']
