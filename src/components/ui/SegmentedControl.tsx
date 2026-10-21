import { useLayoutEffect, useRef, useState } from 'react'

interface SegmentedControlProps<T extends string> {
  options: { id: T; label: string }[]
  value: T
  onChange: (id: T) => void
}

/**
 * iOS-style pill group: a graphite track with a lighter pill that glides to
 * the active option (measured like TabBar's pill, so labels of any width work).
 */
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const btnRefs = useRef(new Map<T, HTMLButtonElement>())
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null)

  useLayoutEffect(() => {
    const measure = () => {
      const btn = btnRefs.current.get(value)
      if (btn) setPill({ x: btn.offsetLeft, w: btn.offsetWidth })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [value])

  return (
    <div className="tabbar-glass liquid-rim relative flex gap-1 rounded-full p-1">
      {pill && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-1 left-0 rounded-full bg-white/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.3)] transition-[transform,width] duration-500 ease-[var(--ease-ios)]"
          style={{ transform: `translateX(${pill.x}px)`, width: pill.w }}
        />
      )}
      {options.map(({ id, label }) => {
        const active = id === value
        return (
          <button
            key={id}
            ref={(el) => {
              if (el) btnRefs.current.set(id, el)
              else btnRefs.current.delete(id)
            }}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={active}
            className={`relative z-10 flex-1 rounded-full py-1.5 text-[13px] font-semibold tracking-wide transition-colors duration-300 ${
              active ? 'text-text' : 'text-text-muted hover:text-text'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
