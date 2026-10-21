import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface SheetProps {
  title?: ReactNode
  /** 'tall' pins the sheet to ~88% of the viewport with internal scrolling. */
  maxHeight?: 'auto' | 'tall'
  onClose: () => void
  children: ReactNode
}

/** Drag further than this, or flick faster than DISMISS_VELOCITY, to close. */
const DISMISS_DISTANCE = 110
const DISMISS_VELOCITY = 0.6 // px/ms
/** Matches .sheet-leave's transition in index.css. */
const LEAVE_MS = 300

/**
 * iOS-style bottom sheet: dimmed scrim (tap to close) + a liquid-glass panel
 * that slides up on the iOS sheet curve. Grab the handle/title strip and
 * swipe down to dismiss — it follows your finger, then either springs back
 * or slides away. Every close path animates out before `onClose` fires.
 *
 * Rendered through a portal to <body> so `position: fixed` is relative to the
 * viewport — a transformed/blurred ancestor would otherwise become the
 * containing block and trap the sheet inside a card.
 */
export default function Sheet({ title, maxHeight = 'auto', onClose, children }: SheetProps) {
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [closing, setClosing] = useState(false)
  const start = useRef<{ y: number; t: number } | null>(null)

  // While open, flag <body> so the app shell shrinks back behind the sheet
  // (.app-shell in index.css). A count, not a boolean, so a sheet opened from
  // another sheet doesn't un-shrink the app when the inner one closes.
  const pushed = useRef(false)
  const releasePush = () => {
    if (!pushed.current) return
    pushed.current = false
    const n = Number(document.body.dataset.sheets ?? '1') - 1
    if (n > 0) document.body.dataset.sheets = String(n)
    else delete document.body.dataset.sheets
  }
  useEffect(() => {
    pushed.current = true
    document.body.dataset.sheets = String(Number(document.body.dataset.sheets ?? '0') + 1)
    return releasePush
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const requestClose = () => {
    if (closing) return
    setClosing(true)
    // Let the app grow back in step with the sheet sliding away.
    releasePush()
    setTimeout(onClose, LEAVE_MS)
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    // Let taps on the close button through as normal clicks.
    if ((e.target as HTMLElement).closest('button')) return
    e.currentTarget.setPointerCapture(e.pointerId)
    start.current = { y: e.clientY, t: performance.now() }
    setDragging(true)
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!start.current) return
    // Downward only; a little resistance upward would feel stuck, so just clamp.
    setDragY(Math.max(0, e.clientY - start.current.y))
  }
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!start.current) return
    const dy = Math.max(0, e.clientY - start.current.y)
    const velocity = dy / Math.max(1, performance.now() - start.current.t)
    start.current = null
    setDragging(false)
    if (dy > DISMISS_DISTANCE || velocity > DISMISS_VELOCITY) requestClose()
    else setDragY(0)
  }

  if (typeof document === 'undefined') return null
  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-end justify-center bg-black/55 ${closing ? 'backdrop-leave' : 'backdrop-enter'}`}
      style={dragY > 0 && !closing ? { opacity: Math.max(0.35, 1 - dragY / 400) } : undefined}
      onClick={requestClose}
    >
      <div
        className={`sheet-glass liquid-rim relative flex w-full max-w-[420px] flex-col overflow-hidden rounded-t-[28px] ${
          closing ? 'sheet-leave' : 'sheet-enter'
        } ${maxHeight === 'tall' ? 'h-[88dvh]' : 'max-h-[88dvh]'}`}
        style={{
          transform: dragY > 0 ? `translateY(${dragY}px)` : undefined,
          // Track the finger 1:1 while dragging; spring back otherwise.
          transition: dragging ? 'none' : 'transform 0.4s var(--ease-ios)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grab strip: handle + title. touch-none so the drag isn't stolen by scrolling. */}
        <div
          className="shrink-0 cursor-grab touch-none select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div className="mx-auto mt-2.5 h-[5px] w-10 rounded-full bg-white/25" />
          {title !== undefined ? (
            <div className="flex items-center justify-between px-5 pb-1 pt-3">
              <h2 className="text-xl font-semibold text-text">{title}</h2>
              <button
                type="button"
                onClick={requestClose}
                aria-label="Close"
                className="press grid h-8 w-8 place-items-center rounded-full bg-white/[0.08] text-text-muted hover:text-text"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
          ) : (
            <div className="h-3" />
          )}
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-3"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.75rem)' }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}
