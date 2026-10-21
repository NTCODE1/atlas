import { useCountUp } from '../../hooks/useCountUp'
import type { MacroColor } from '../../data'
import Ring from '../ui/Ring'

interface MacroRingProps {
  label: string
  grams: number
  target: number
  /** Unused since the shared Ring went single-style; kept so data.ts macros still type-check. */
  color?: MacroColor
}

/** Compact macro ring: grams in the centre, label + target beneath. */
export default function MacroRing({ label, grams, target }: MacroRingProps) {
  const count = useCountUp(grams, 1200)
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center">
      <Ring progress={target > 0 ? grams / target : 0} size={88} stroke={7}>
        <span className="text-lg font-semibold text-text tabular-nums">
          {count}
          <span className="text-xs font-normal text-text-muted">g</span>
        </span>
      </Ring>
      <span className="mt-2 text-sm font-medium text-text">{label}</span>
      <span className="text-xs text-text-muted">/{target}g</span>
    </div>
  )
}
