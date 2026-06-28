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

/**
 * Floating iOS "liquid glass" bottom nav with 6 destinations. The bar is a
 * translucent, heavily blurred pane (content scrolls/blurs beneath it); the
 * active tab gets a soft pill and renders in accent.
 */
export default function TabBar({ active, onChange }: TabBarProps) {
  return (
    <nav
      className="pointer-events-none absolute inset-x-0 bottom-0 z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="pointer-events-auto relative mx-3 mb-3 overflow-hidden rounded-[26px] border-t border-white/15 bg-[rgba(16,18,26,0.55)] shadow-[0_8px_30px_rgba(0,0,0,0.45)] ring-1 ring-white/10 backdrop-blur-2xl backdrop-saturate-150">
        {/* Top sheen for the glass highlight */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/[0.06] to-transparent"
        />

        <ul className="relative flex items-stretch overflow-x-auto no-scrollbar px-2 py-2">
          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = id === active
            return (
              <li key={id} className="w-[68px] shrink-0">
                <button
                  type="button"
                  onClick={() => onChange(id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex w-full flex-col items-center gap-1 rounded-2xl py-1.5 transition-colors ${
                    isActive ? 'bg-white/10 text-accent' : 'text-text-muted hover:text-text'
                  }`}
                >
                  <Icon size={22} strokeWidth={isActive ? 2.25 : 1.75} />
                  <span className="text-[11px] font-medium tracking-wide">{label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
