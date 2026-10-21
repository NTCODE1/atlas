import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

interface ListRowProps {
  /** Leading visual — an icon disc, a check circle, etc. */
  leading?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  /** Right-side text/value (shown before the chevron). */
  trailing?: ReactNode
  /** Show a chevron — defaults to on when the row is tappable. */
  chevron?: boolean
  onClick?: () => void
  /** Dim the title (e.g. a ticked checklist item stays readable but quieter). */
  muted?: boolean
}

/** One list row: leading visual, title + subtitle, trailing value, chevron. */
export default function ListRow({ leading, title, subtitle, trailing, chevron, onClick, muted }: ListRowProps) {
  const showChevron = chevron ?? onClick !== undefined
  const body = (
    <>
      {leading && <span className="shrink-0">{leading}</span>}
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-[15px] ${muted ? 'text-text-muted' : 'text-text'}`}>{title}</span>
        {subtitle && <span className="block truncate text-xs text-text-muted">{subtitle}</span>}
      </span>
      {trailing && <span className="shrink-0 text-xs tabular-nums text-text-muted">{trailing}</span>}
      {showChevron && <ChevronRight size={17} strokeWidth={1.75} className="shrink-0 text-text-muted" />}
    </>
  )
  const cls = 'flex w-full items-center gap-3 px-4 py-3 text-left'
  return onClick ? (
    <button type="button" onClick={onClick} className={`${cls} transition-colors active:bg-fill`}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  )
}

/** Round icon disc used as a ListRow leading visual. */
export function IconDisc({ children }: { children: ReactNode }) {
  return (
    <span className="grid h-9 w-9 place-items-center rounded-full border border-white/[0.07] bg-white/[0.05] text-text">
      {children}
    </span>
  )
}
