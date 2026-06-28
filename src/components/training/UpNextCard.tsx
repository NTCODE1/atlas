import { ChevronRight, Heart, MapPin } from 'lucide-react'
import { upNext } from '../../data'

/** "Up next" prescribed-session card. */
export default function UpNextCard() {
  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-4">
      <span className="text-[11px] font-medium tracking-wider text-text-muted">UP NEXT</span>

      <div className="mt-3 flex items-center gap-4">
        {/* Mint session tile with a dark inner dot, mirroring the mockup */}
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-accent">
          <span className="block h-5 w-5 rounded-full bg-bg" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-2xl font-bold text-text">{upNext.name}</h3>
            <ChevronRight size={22} className="mt-1 shrink-0 text-text-muted" />
          </div>
          <p className="mt-0.5 text-sm text-text-muted">
            {upNext.durationMin} min · {upNext.intensity}
          </p>
        </div>
      </div>

      {/* Metrics row */}
      <div className="mt-4 flex items-center gap-6">
        <span className="flex items-center gap-1.5 text-sm text-accent">
          <MapPin size={15} strokeWidth={2} />
          {upNext.distance}
        </span>
        <span className="flex items-center gap-1.5 text-sm text-accent">
          <Heart size={15} strokeWidth={2} />
          <span>
            {upNext.heartRate}
            <span className="block text-xs text-text-muted">{upNext.zone}</span>
          </span>
        </span>
      </div>
    </div>
  )
}
