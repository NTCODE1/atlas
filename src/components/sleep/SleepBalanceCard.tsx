import { MoonStar } from 'lucide-react'
import { sleepBalance } from '../../data'

/** "Sleep Balance" verdict card — label, title, blurb, and an indigo moon icon. */
export default function SleepBalanceCard() {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface px-4 py-4">
      <div className="min-w-0">
        <span className="text-[11px] font-semibold tracking-wider text-indigo">
          {sleepBalance.label}
        </span>
        <h3 className="mt-1 font-display text-xl font-bold text-text">{sleepBalance.title}</h3>
        <p className="mt-1 max-w-[15rem] text-sm leading-relaxed text-text-muted">
          {sleepBalance.text}
        </p>
      </div>

      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-indigo/10 text-indigo">
        <MoonStar size={26} strokeWidth={1.75} />
      </div>
    </div>
  )
}
