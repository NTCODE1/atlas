import type { ReactNode } from 'react'

interface SleepStatProps {
  value: string
  unit?: string
  name: string
  accent?: 'indigo' | 'rose'
  percent?: number
  icon?: ReactNode
}

const accentColor = {
  indigo: 'var(--color-indigo)',
  rose: 'var(--color-rose)',
}

export default function SleepStat({
  value,
  unit,
  name,
  accent = 'indigo',
  percent,
  icon,
}: SleepStatProps) {
  return (
    <div className="glass-subtle flex flex-1 flex-col rounded-2xl px-3 py-3">
      <div className="flex items-baseline gap-0.5">
        <span className="font-display text-xl font-bold leading-none text-text">{value}</span>
        {unit && <span className="text-[11px] text-text-muted">{unit}</span>}
      </div>
      <span className="mt-1 text-xs text-text-muted">{name}</span>
      <div className="mt-1.5 flex h-3.5 items-center gap-1">
        {icon ? (
          icon
        ) : (
          <>
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: accentColor[accent] }}
            />
            <span className="text-[11px] text-text-muted">{percent}%</span>
          </>
        )}
      </div>
    </div>
  )
}
