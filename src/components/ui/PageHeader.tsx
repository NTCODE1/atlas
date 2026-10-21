import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: ReactNode
  /** Light-weight line above the bold title ("Good morning,"). */
  lead?: ReactNode
  subtitle?: ReactNode
  /** Right-aligned control (e.g. Today's quick-add button). */
  action?: ReactNode
}

/** Screen title block: optional light lead line, bold title, muted subtitle. */
export default function PageHeader({ title, lead, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3 pt-1">
      <div className="min-w-0">
        {lead && <p className="text-[30px] font-light leading-[1.1] tracking-tight text-text">{lead}</p>}
        <h1 className="text-[32px] font-semibold leading-[1.1] tracking-tight text-text">{title}</h1>
        {subtitle && <div className="mt-1 text-[15px] text-text-muted">{subtitle}</div>}
      </div>
      {action && <div className="shrink-0 pt-1">{action}</div>}
    </div>
  )
}
