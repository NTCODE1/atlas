import { ChevronRight, X } from 'lucide-react'
import type { Meal } from '../../data'
import { MEAL_META } from './mealMeta'

interface MealsListProps {
  meals: Meal[]
  onDelete?: (id: string) => void
  /** Opens the nutrition history ("View all"). */
  onViewAll?: () => void
}

/** "Today's Meals" card — logged meals with icon, name, calories, delete. */
export default function MealsList({ meals, onDelete, onViewAll }: MealsListProps) {
  return (
    <div className="glass rounded-3xl px-5 py-5">
      <div className="flex items-center justify-between">
        <span className="font-display text-lg font-semibold text-text">Today&apos;s Meals</span>
        <button
          type="button"
          onClick={onViewAll}
          className="press flex items-center gap-0.5 text-sm text-text-muted transition-colors hover:text-text"
        >
          History
          <ChevronRight size={15} strokeWidth={2} />
        </button>
      </div>

      <ul className="mt-2 flex flex-col">
        {meals.length === 0 && (
          <li className="py-3 text-sm text-text-muted">No meals logged yet.</li>
        )}
        {meals.map((meal, i) => {
          const { icon: Icon, color, label } = MEAL_META[meal.type]
          return (
            <li
              key={meal.id}
              className={`flex items-center gap-3 py-3 ${i > 0 ? 'border-t border-border' : ''}`}
            >
              <Icon size={18} strokeWidth={2} className={`shrink-0 ${color}`} />
              <div className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-text">{label}</span>
                <span className="block truncate text-xs text-text-muted">{meal.name}</span>
                {(meal.protein != null || meal.carbs != null || meal.fat != null) && (
                  <span className="block truncate text-[11px] text-text-muted">
                    {[
                      meal.protein != null ? `P ${meal.protein}g` : null,
                      meal.carbs != null ? `C ${meal.carbs}g` : null,
                      meal.fat != null ? `F ${meal.fat}g` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                )}
              </div>
              <span className="shrink-0 font-display text-sm font-semibold text-text">
                {meal.kcal != null ? meal.kcal : '—'}
                <span className="ml-1 text-xs font-normal text-text-muted">kcal</span>
              </span>
              {onDelete ? (
                <button
                  type="button"
                  onClick={() => onDelete(meal.id)}
                  aria-label={`Delete ${meal.name}`}
                  className="press grid h-7 w-7 shrink-0 place-items-center rounded-lg text-text-muted transition-colors hover:bg-fill-2 hover:text-text"
                >
                  <X size={15} strokeWidth={2} />
                </button>
              ) : (
                <ChevronRight size={16} strokeWidth={2} className="shrink-0 text-text-muted" />
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
