import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface SheetProps {
  title?: ReactNode
  /** 'tall' pins the sheet to ~88% of the viewport with internal scrolling. */
  maxHeight?: 'auto' | 'tall'
  onClose: () => void
  children: ReactNode
}

/**
 * Bottom-sheet shell: dimmed scrim (tap to close) + a glass panel that springs
 * up from the bottom. Content scrolls internally when taller than the panel.
 *
 * Rendered through a portal to <body> so `position: fixed` is relative to the
 * viewport — a `.glass`/`backdrop-filter` ancestor would otherwise become the
 * containing block and trap the sheet inside a card (and nest blur-in-blur).
 */
export default function Sheet({ title, maxHeight = 'auto', onClose, children }: SheetProps) {
  if (typeof document === 'undefined') return null
  return createPortal(
    <div
      className="backdrop-enter fixed inset-0 z-50 flex items-end justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className={`sheet-enter glass-strong flex w-full max-w-[420px] flex-col overflow-hidden rounded-t-3xl !border-x-0 !border-b-0 ${
          maxHeight === 'tall' ? 'h-[88dvh]' : 'max-h-[88dvh]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {title !== undefined && (
          <div className="flex items-center justify-between px-5 pt-5">
            <h2 className="font-display text-xl font-bold text-text">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="press grid h-8 w-8 place-items-center rounded-full bg-fill text-text-muted hover:text-text"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>
        )}
        <div
          className="min-h-0 flex-1 overflow-y-auto px-5 pt-4"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.75rem)' }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
