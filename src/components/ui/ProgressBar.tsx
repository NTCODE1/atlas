import { useEffect, useState } from 'react'

interface ProgressBarProps {
  /** 0–1; clamped. */
  value: number
  className?: string
}

/**
 * Thin white bar with a soft glow on a dark track — the mockup's kcal /
 * sessions bar. Fills from empty on mount (one frame at 0, then glides to the
 * value) and glides on every change after. Animates `transform: scaleX`
 * rather than width, so it runs on the GPU without re-laying-out the card.
 */
export default function ProgressBar({ value, className = '' }: ProgressBarProps) {
  const target = Math.max(0, Math.min(1, value))
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(target))
    return () => cancelAnimationFrame(id)
  }, [target])

  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-white/[0.08] ${className}`}>
      <div
        className="h-full w-full origin-left rounded-full bg-accent-bright"
        style={{
          transform: `scaleX(${shown})`,
          transition: 'transform 1s var(--ease-ios)',
          boxShadow: '0 0 10px rgba(255,255,255,0.35)',
        }}
      />
    </div>
  )
}
