import { BookOpen, Dumbbell, Home, Moon, Utensils, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type TabId = 'home' | 'energy' | 'sleep' | 'training' | 'nutrition' | 'journal'

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'energy', label: 'Energy', icon: Zap },
  { id: 'sleep', label: 'Sleep', icon: Moon },
  { id: 'training', label: 'Training', icon: Dumbbell },
  { id: 'nutrition', label: 'Nutrition', icon: Utensils },
  { id: 'journal', label: 'Journal', icon: BookOpen },
]

interface TabBarProps {
  active: TabId
  onChange: (id: TabId) => void
}

/** Bottom tab bar with 5 destinations. Active tab renders in accent. */
export default function TabBar({ active, onChange }: TabBarProps) {
  return (
    <nav
      className="border-t border-border bg-bg/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="flex items-stretch overflow-x-auto no-scrollbar px-2 pt-2 pb-1">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = id === active
          return (
            <li key={id} className="w-[68px] shrink-0">
              <button
                type="button"
                onClick={() => onChange(id)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex w-full flex-col items-center gap-1 rounded-xl py-1.5 transition-colors ${
                  isActive ? 'text-accent' : 'text-text-muted hover:text-text'
                }`}
              >
                <Icon size={22} strokeWidth={isActive ? 2.25 : 1.75} />
                <span className="text-[11px] font-medium tracking-wide">{label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
