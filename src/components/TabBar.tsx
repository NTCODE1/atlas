import { AtSign, BookOpen, Dumbbell, Home, Moon, Sparkles, Utensils, Wallet, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export type TabId =
  | 'home'
  | 'energy'
  | 'sleep'
  | 'training'
  | 'nutrition'
  | 'journal'
  | 'motivation'
  | 'finance'
  | 'social'

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'energy', label: 'Energy', icon: Zap },
  { id: 'sleep', label: 'Sleep', icon: Moon },
  { id: 'training', label: 'Training', icon: Dumbbell },
  { id: 'nutrition', label: 'Nutrition', icon: Utensils },
  { id: 'journal', label: 'Journal', icon: BookOpen },
  { id: 'motivation', label: 'Motivation', icon: Sparkles },
  { id: 'finance', label: 'Finance', icon: Wallet },
  { id: 'social', label: 'Social', icon: AtSign },
]

interface TabBarProps {
  active: TabId
  onChange: (id: TabId) => void
}

interface PillRect {
  x: number
  y: number
  w: number
  h: number
}

/**
 * Floating iOS "liquid glass" bottom nav with 9 destinations. Icon-only and
 * fully capsule-shaped (both the outer bar and the active-tab highlight use
 * rounded-full), matching Apple's actual Liquid Glass tab bar silhouette
 * rather than a rounded rectangle with labels. A single glass pill glides
 * behind the active tab with a spring — since each tab is a fixed square, the
 * pill reads as a glowing glass "blob" that slides between icons.
 */
export default function TabBar({ active, onChange }: TabBarProps) {
  const listRef = useRef<HTMLUListElement>(null)
  const btnRefs = useRef(new Map<TabId, HTMLButtonElement>())
  const [pill, setPill] = useState<PillRect | null>(null)

  // Measure the active tab and move the pill to it (before paint, no flicker).
  useLayoutEffect(() => {
    const measure = () => {
      const btn = btnRefs.current.get(active)
      if (!btn) return
      setPill({ x: btn.offsetLeft, y: btn.offsetTop, w: btn.offsetWidth, h: btn.offsetHeight })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [active])

  // With 9 tabs the bar scrolls; keep the active one in view.
  useEffect(() => {
    btnRefs.current.get(active)?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [active])

  return (
    <nav
      className="pointer-events-none absolute inset-x-0 bottom-0 z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="tabbar-glass pointer-events-auto relative mx-3 mb-3 overflow-hidden rounded-full">
        <ul ref={listRef} className="relative flex items-center overflow-x-auto no-scrollbar px-2 py-2">
          {/* Gliding liquid-glass pill behind the active tab. z-0 keeps it under
              the buttons (which are relative z-10). Kept a direct child of <ul>
              so offsetLeft/Top measure against the same box the pill sits in. */}
          {pill && (
            <div
              aria-hidden
              className="tab-pill pointer-events-none absolute left-0 top-0 z-0"
              style={{ transform: `translate(${pill.x}px, ${pill.y}px)`, width: pill.w, height: pill.h }}
            />
          )}

          {TABS.map(({ id, label, icon: Icon }) => {
            const isActive = id === active
            return (
              // NOTE: <li> must stay non-positioned so the button's offsetParent
              // is the <ul> — the pill's measurement reference. Layering is on
              // the button (relative z-10) instead.
              <li key={id} className="w-11 shrink-0">
                <button
                  ref={(el) => {
                    if (el) btnRefs.current.set(id, el)
                    else btnRefs.current.delete(id)
                  }}
                  type="button"
                  onClick={() => onChange(id)}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={label}
                  title={label}
                  className={`press relative z-10 flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-300 ${
                    isActive ? 'text-accent' : 'text-text-muted hover:text-text'
                  }`}
                >
                  <Icon size={21} strokeWidth={isActive ? 1.9 : 1.6} />
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
