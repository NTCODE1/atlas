import { MoonStar } from 'lucide-react'
import type { SleepBalanceVerdict } from '../../data'

interface SleepBalanceCardProps {
  verdict: SleepBalanceVerdict
}

/** "Sleep Balance" verdict card — label, title, blurb, and an indigo moon icon.
 *  `verdict` is computed from tonight's real deep/REM split (see computeSleepBalance). */
export default function SleepBalanceCard({ verdict }: SleepBalanceCardProps) {
  return (
    <div className="glass flex items-center justify-between gap-4 rounded-2xl px-4 py-4">
      <div className="min-w-0">
        <span className="text-[11px] font-semibold tracking-wider text-indigo">
          {verdict.label}
        </span>
        <h3 className="mt-1 font-display text-xl font-bold text-text">{verdict.title}</h3>
        <p className="mt-1 max-w-[15rem] text-sm leading-relaxed text-text-muted">
          {verdict.text}
        </p>
      </div>

      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-indigo/10 text-indigo">
        <MoonStar size={26} strokeWidth={1.75} />
      </div>
    </div>
  )
}
