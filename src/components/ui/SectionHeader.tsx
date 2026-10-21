import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

interface SectionHeaderProps {
  title: ReactNode
  /** Small caps eyebrow above the title (e.g. "TODAY"). */
  eyebrow?: ReactNode
  /** Optional trailing link ("View all ›"). */
  action?: { label: string; onClick: () => void }
  className?: string
}

/** Section title row with an optional "View all ›" style link. */
export default function SectionHeader({ title, eyebrow, action, className = '' }: SectionHeaderProps) {
  return (
    <div className={`flex items-end justify-between ${className}`}>
      <div>
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2 className="text-[17px] font-semibold text-text">{title}</h2>
      </div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="press flex items-center gap-0.5 text-xs font-medium text-text-muted transition-colors hover:text-text"
        >
          {action.label}
          <ChevronRight size={14} strokeWidth={1.9} />
        </button>
      )}
    </div>
  )
}

/** Tiny spaced-caps label ("SLEEP STAGES"). */
export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`block text-[10.5px] font-medium uppercase tracking-[0.14em] text-text-muted ${className}`}>
      {children}
    </span>
  )
}
