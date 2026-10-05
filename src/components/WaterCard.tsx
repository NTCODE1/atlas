import { useEffect, useState } from 'react'
import { useCountUp } from '../hooks/useCountUp'
import { useHydration, useHydrationGoal } from '../hooks/useHydration'
import { useHealth } from '../api/healthContext'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Two identical wave periods across a 1200-wide path → translateX(-50%) loops seamlessly. */
const WAVE_PATH =
  'M0 10 C 100 2 200 2 300 10 C 400 18 500 18 600 10 C 700 2 800 2 900 10 C 1000 18 1100 18 1200 10 L1200 30 L0 30 Z'

interface WaterCardProps {
  compact?: boolean
}

/**
 * Hydration as an animated water-fill box: the level rises to the intake percent
 * on mount with two looping wave layers, the percentage shown big on top.
 */
export default function WaterCard({ compact = false }: WaterCardProps) {
  const { health } = useHealth()
  // Single shared hydration source — the same `atlas.nutrition.hydration` log
  // used by the Nutrition screen, plus caffeinated drinks from Energy. Updates
  // here in real time as anything is logged (useLocalStorage broadcasts changes).
  const { totalMl } = useHydration()
  const { goalLitres } = useHydrationGoal()

  // In-app logged intake is primary; fall back to live health, else 0.
  const loggedLitres = totalMl / 1000
  const litres = loggedLitres > 0 ? loggedLitres : (health.hydrationLitres ?? 0)
  const percent = Math.max(0, Math.min(100, Math.round((litres / goalLitres) * 100)))
  const count = useCountUp(percent, 1200)
  const [level, setLevel] = useState(() => (prefersReducedMotion() ? percent : 0))

  useEffect(() => {
    if (prefersReducedMotion()) return
    const id = requestAnimationFrame(() => setLevel(percent))
    return () => cancelAnimationFrame(id)
  }, [percent])

  return (
    <div
      className={`glass relative flex-1 overflow-hidden rounded-3xl ${
        compact ? 'min-h-[150px]' : 'min-h-[160px]'
      }`}
    >
      {/* Water body (rises on mount) */}
      <div
        className="absolute inset-x-0 bottom-0 transition-[height] duration-1000 ease-out"
        style={{
          height: `${level}%`,
          background: 'linear-gradient(180deg,#5a5f68,#1c1e24 70%,#060709)',
        }}
      >
        <svg
          className="water-wave-slow absolute -top-4 left-0 h-5 w-[200%]"
          viewBox="0 0 1200 30"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path d={WAVE_PATH} fill="#9aa0ab" opacity={0.45} />
        </svg>
        <svg
          className="water-wave absolute -top-3 left-0 h-5 w-[200%]"
          viewBox="0 0 1200 30"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path d={WAVE_PATH} fill="#e3e5e9" opacity={0.9} />
        </svg>
      </div>

      {/* Overlay content */}
      <div className={`relative z-10 flex h-full flex-col ${compact ? 'px-4 py-4' : 'px-5 py-5'}`}>
        <span className="text-[11px] font-medium tracking-wider text-text-muted">HYDRATION</span>
        <div className="flex flex-1 flex-col items-start justify-center">
          <span
            className={`num-glow font-display font-bold leading-none text-text ${
              compact ? 'text-3xl' : 'text-4xl'
            }`}
          >
            {count}%
          </span>
        </div>
        <span className="text-xs text-text-muted">
          {litres.toFixed(1)} of {goalLitres} L
        </span>
      </div>
    </div>
  )
}
