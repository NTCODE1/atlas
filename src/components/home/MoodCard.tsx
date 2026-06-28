import { Smile } from 'lucide-react'
import { mood } from '../../data'

/** Current Mood card: label, accent value, a decorative wavy line, and an emoji button. */
export default function MoodCard() {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-4">
      <div className="min-w-0">
        <span className="text-[11px] font-medium tracking-wider text-text-muted">
          {mood.label}
        </span>
        <h3 className="mt-1 font-display text-xl font-bold text-accent">{mood.value}</h3>
      </div>

      {/* Wavy line filling the middle space */}
      <svg
        className="mx-3 h-8 flex-1"
        viewBox="0 0 160 32"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M0 18 C 20 6, 40 6, 60 16 S 100 30, 120 16 S 150 8, 160 14"
          stroke="var(--color-accent)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity={0.85}
        />
      </svg>

      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/5 text-text-muted">
        <Smile size={20} strokeWidth={1.75} />
      </span>
    </div>
  )
}
