interface ProgressBarProps {
  /** 0–1; clamped. */
  value: number
  className?: string
}

/** Thin white bar with a soft glow on a dark track — the mockup's kcal / sessions bar. */
export default function ProgressBar({ value, className = '' }: ProgressBarProps) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100)
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-white/[0.08] ${className}`}>
      <div
        className="h-full rounded-full bg-accent-bright transition-[width] duration-700"
        style={{ width: `${pct}%`, boxShadow: '0 0 10px rgba(255,255,255,0.35)' }}
      />
    </div>
  )
}
