interface SleepStatProps {
  label: string
  value: string | number
  unit?: string
}

export default function SleepStat({ label, value, unit }: SleepStatProps) {
  return (
    <div className="flex flex-1 flex-col rounded-2xl border border-border bg-surface px-3 py-3">
      <span className="text-[10px] font-medium tracking-wider text-text-muted">{label}</span>
      <div className="mt-1.5 flex items-baseline gap-0.5">
        <span className="font-display text-base font-bold text-text">{value}</span>
        {unit && <span className="text-[11px] text-text-muted">{unit}</span>}
      </div>
    </div>
  )
}
