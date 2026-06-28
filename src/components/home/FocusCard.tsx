import { Footprints } from 'lucide-react'
import { focus } from '../../data'

/** Highlighted accent-tinted "Today's Focus" card. */
export default function FocusCard() {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-accent/25 bg-accent/[0.07] px-4 py-4">
      <div>
        <span className="text-[11px] font-semibold tracking-wider text-accent">
          TODAY'S FOCUS
        </span>
        <h3 className="mt-1 font-display text-xl font-bold text-text">{focus.title}</h3>
        <span className="mt-2 inline-block rounded-full bg-white/5 px-2.5 py-1 text-xs text-text-muted">
          {focus.tag}
        </span>
      </div>

      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">
        <Footprints size={22} strokeWidth={2} />
      </div>
    </div>
  )
}
