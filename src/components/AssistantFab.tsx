import { useRef, useState } from 'react'
import { MessageCircleMore } from 'lucide-react'

interface AssistantFabProps {
  onClick: () => void
  /** Called after the 3-second hold completes and the button has animated out. */
  onHide: () => void
}

/** How long the user must hold to hide the button. */
const HOLD_MS = 3000

// Progress-ring geometry (matches the 56px button box).
const SIZE = 56
const STROKE = 3
const R = (SIZE - STROKE) / 2
const CIRC = 2 * Math.PI * R

/**
 * Floating glassy button, fixed bottom-right on every screen, that opens the
 * Assistant. A tap opens it; **holding for 3 seconds hides it** — a progress
 * ring fills and the button gently shrinks while held, then fades out. It's
 * turned back on from Settings. Sits above the bottom nav, below the
 * full-screen overlays.
 */
export default function AssistantFab({ onClick, onHide }: AssistantFabProps) {
  const [progress, setProgress] = useState(0) // 0..1 while holding
  const [leaving, setLeaving] = useState(false)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef(0)
  const suppressClick = useRef(false)

  const stopRaf = () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
  }

  const tick = () => {
    const p = Math.min(1, (performance.now() - startRef.current) / HOLD_MS)
    setProgress(p)
    if (p >= 1) {
      stopRaf()
      suppressClick.current = true // the pointerup will fire a click — swallow it
      setLeaving(true)
      window.setTimeout(onHide, 300) // let the exit transition play first
      return
    }
    rafRef.current = requestAnimationFrame(tick)
  }

  const beginHold = () => {
    if (leaving) return
    suppressClick.current = false
    startRef.current = performance.now()
    stopRaf()
    rafRef.current = requestAnimationFrame(tick)
  }

  const cancelHold = () => {
    stopRaf()
    setProgress(0) // springs the ring/shrink back (CSS transition below)
  }

  const handleClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    onClick()
  }

  const scale = leaving ? 0 : 1 - progress * 0.06

  return (
    <button
      type="button"
      onClick={handleClick}
      onPointerDown={beginHold}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      onPointerCancel={cancelHold}
      onContextMenu={(e) => e.preventDefault()}
      aria-label="Open assistant. Hold for 3 seconds to hide it."
      className="absolute right-4 z-30 grid h-14 w-14 touch-none select-none place-items-center rounded-full border border-white/20 text-white backdrop-blur-xl"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom) + 104px)',
        background: 'linear-gradient(160deg, rgba(255,255,255,0.22), rgba(255,255,255,0.08))',
        boxShadow: '0 8px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.25)',
        transform: `scale(${scale})`,
        opacity: leaving ? 0 : 1,
        transition: leaving
          ? 'transform 300ms cubic-bezier(0.4,0,0.2,1), opacity 300ms ease'
          : 'transform 180ms ease',
      }}
    >
      {/* Fill ring while holding */}
      {progress > 0 && !leaving && (
        <svg
          className="pointer-events-none absolute inset-0 -rotate-90"
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          aria-hidden
        >
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="rgba(255,255,255,0.95)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - progress)}
            style={{ transition: 'stroke-dashoffset 80ms linear' }}
          />
        </svg>
      )}
      <MessageCircleMore size={24} strokeWidth={2} />
    </button>
  )
}
