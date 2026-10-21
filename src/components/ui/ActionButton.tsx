import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

interface ActionButtonProps {
  icon: ReactNode
  label: string
  onClick: () => void
}

/** The screen's primary action as a full-width pill — "Track your meal ›". */
export default function ActionButton({ icon, label, onClick }: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="glass press flex w-full items-center gap-3 rounded-full py-2 pl-2 pr-4 text-left"
    >
      <span className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.08] text-text">{icon}</span>
      <span className="flex-1 text-[15px] font-medium text-text">{label}</span>
      <ChevronRight size={18} strokeWidth={1.75} className="text-text-muted" />
    </button>
  )
}
