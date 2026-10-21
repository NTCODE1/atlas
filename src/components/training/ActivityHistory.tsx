import { Trash2 } from 'lucide-react'
import { ACTIVITY_META, RPE_LABEL, formatActivityMinutes, type ActivitySession } from '../../activities'
import Card from '../ui/Card'
import SectionHeader from '../ui/SectionHeader'

interface ActivityHistoryProps {
  title: string
  activities: ActivitySession[]
  onDelete: (id: string) => void
  /** Show the date on each row (off for a single-day list). */
  showDate?: boolean
}

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })

/** List of ski / trampoline / cardio sessions, newest first. Renders nothing when empty. */
export default function ActivityHistory({ title, activities, onDelete, showDate = true }: ActivityHistoryProps) {
  if (activities.length === 0) return null
  const sorted = [...activities].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  )

  return (
    <div className="mt-5">
      <SectionHeader title={title} />
      <Card className="mt-2 divide-y divide-white/[0.05] overflow-hidden">
        {sorted.map((a) => {
          const extra = [
            a.focus,
            formatActivityMinutes(a.durationMinutes),
            a.rpe ? `RPE ${a.rpe} · ${RPE_LABEL[a.rpe]}` : null,
            a.runs ? `${a.runs} runs` : null,
            a.distanceKm ? `${a.distanceKm} km` : null,
          ].filter(Boolean)
          return (
            <div key={a.id} className="flex items-start gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="text-[15px] text-text">
                  {ACTIVITY_META[a.kind].label}
                  {showDate && <span className="text-text-muted"> · {formatDate(a.date)}</span>}
                </div>
                <div className="truncate text-xs text-text-muted">{extra.join(' · ')}</div>
                {a.notes && <div className="mt-1 text-[13px] leading-snug text-text/80">{a.notes}</div>}
              </div>
              <button
                type="button"
                onClick={() => onDelete(a.id)}
                aria-label={`Delete ${ACTIVITY_META[a.kind].label} session`}
                className="press grid h-8 w-8 shrink-0 place-items-center rounded-full text-text-muted transition-colors hover:bg-white/[0.06] hover:text-text"
              >
                <Trash2 size={15} strokeWidth={1.8} />
              </button>
            </div>
          )
        })}
      </Card>
    </div>
  )
}
