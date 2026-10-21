import { CalendarDays, Dumbbell, House, LayoutGrid, Utensils } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useLayoutEffect, useRef, useState } from 'react'

/** The five primary destinations. Everything else (Sleep, Energy, Motivation,
 *  Finance, Social) lives one level down under More — see screens/More.tsx. */
export type TabId = 'today' | 'train' | 'food' | 'plan' | 'more'

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'today', label: 'Today', icon: House },
  { id: 'train', label: 'Train', icon: Dumbbell },
  { id: 'food', label: 'Food', icon: Utensils },
  { id: 'plan', label: 'Plan', icon: CalendarDays },
  { id: 'more', label: 'More', icon: LayoutGrid },
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
 * Floating iOS "liquid glass" bottom nav with 5 destinations. Icon-only and
 * fully capsule-shaped (both the outer bar and the active-tab highlight use
 * rounded-full), matching Apple's actual Liquid Glass tab bar silhouette
 * rather than a rounded rectangle with labels. A single glass pill glides
 * behind the active tab with a spring — a short glass capsule (each tab is a
 * fixed 56×44 hit area) that lenses the icon under it, as in iOS 26.
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

  return (
    <nav
      className="pointer-events-none absolute inset-x-0 bottom-0 z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* iOS-style scrim: content dims as it scrolls down under the glass. */}
      <div aria-hidden className="nav-scrim pointer-events-none absolute inset-x-0 bottom-0 h-28" />
      <div className="tabbar-glass liquid-rim pointer-events-auto relative mx-3 mb-3 overflow-hidden rounded-full">
        <ul ref={listRef} className="relative flex items-center px-2 py-2">
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
              // Equal shares so five tabs spread across the full bar.
              <li key={id} className="flex flex-1 justify-center">
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
                  className={`press relative z-10 flex h-11 w-14 items-center justify-center rounded-full transition-colors duration-300 ${
                    isActive ? 'text-accent-bright' : 'text-text-muted hover:text-text'
                  }`}
                >
                  <Icon
                    size={21}
                    strokeWidth={isActive ? 2 : 1.6}
                    className={isActive ? 'drop-shadow-[0_0_6px_rgba(255,255,255,0.55)]' : ''}
                  />
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
