import { useEffect, useState } from 'react'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Counts from 0 up to `target` over `durationMs` using requestAnimationFrame.
 * Respects prefers-reduced-motion by jumping straight to the target.
 */
export function useCountUp(target: number, durationMs = 1200): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0))

  useEffect(() => {
    if (prefersReducedMotion()) {
      setValue(target)
      return
    }

    let raf = 0
    let start: number | null = null
    const tick = (now: number) => {
      if (start === null) start = now
      const t = Math.min((now - start) / durationMs, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(eased * target))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, durationMs])

  return value
}
