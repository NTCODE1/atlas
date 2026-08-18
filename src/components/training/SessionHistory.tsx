import { useState } from 'react'
import { ChevronDown, Pencil, Trash2 } from 'lucide-react'
import { sessionVolume, cardioTotals, type WorkoutSession } from '../../workouts'
import Collapsible from '../ui/Collapsible'

interface SessionHistoryProps {
  sessions: WorkoutSession[]
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

const formatTime = (isoDateTime: string) =>
  new Date(isoDateTime).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

/** History tab: past sessions newest-first with expandable set detail. */
export default function SessionHistory({ sessions, onEdit, onDelete }: SessionHistoryProps) {
  const [openId, setOpenId] = useState<string | null>(null)
  const sorted = [...sessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt))

  if (sorted.length === 0) {
    return (
      <p className="mt-6 text-center text-sm text-text-muted">
        No workouts logged yet — start one in the Log tab.
      </p>
    )
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      {sorted.map((session) => {
        const open = openId === session.id
        const volume = Math.round(sessionVolume(session))
        const summaryParts = [
          `${session.exercises.length} ${session.exercises.length === 1 ? 'exercise' : 'exercises'}`,
          session.durationMinutes != null ? `${session.durationMinutes} min` : 'in progress',
          ...(volume > 0 ? [`${volume.toLocaleString()} kg volume`] : []),
        ]
        return (
          <div key={session.id} className="glass rounded-[22px] px-4 py-3.5">
            <button
              type="button"
              onClick={() => setOpenId(open ? null : session.id)}
              aria-expanded={open}
              className="flex w-full items-center gap-3 text-left"
            >
              <div className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-text">
                  {formatDate(session.date)} · {formatTime(session.startedAt)}
                </span>
                <span className="text-xs text-text-muted">{summaryParts.join(' · ')}</span>
              </div>
              <ChevronDown
                size={16}
                strokeWidth={2}
                className={`shrink-0 text-text-muted transition-transform duration-300 ${
                  open ? 'rotate-180' : ''
                }`}
              />
            </button>

            <Collapsible open={open}>
              <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                {session.exercises.map((ex) => (
                  <div key={ex.id} className="text-sm">
                    <span className="font-medium text-text">{ex.exerciseName}</span>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-text-muted">
                      {ex.sets.length === 0 && <span>no sets</span>}
                      {ex.exerciseType === 'gym'
                        ? ex.sets.map((set, i) =>
                            set.kind === 'gym' ? (
                              <span key={i}>
                                {set.reps} × {set.weight} {set.unit}
                              </span>
                            ) : null,
                          )
                        : ex.sets.map((set, i) =>
                            set.kind === 'cardio' ? (
                              <span key={i}>
                                {set.distanceKm} km · {set.durationMinutes} min
                              </span>
                            ) : null,
                          )}
                    </div>
                    {ex.exerciseType === 'cardio' &&
                      (() => {
                        const totals = cardioTotals(ex)
                        return totals.distanceKm > 0 || totals.durationMinutes > 0 ? (
                          <span className="mt-0.5 block text-xs font-medium text-accent">
                            total {totals.distanceKm.toFixed(1)} km · {totals.durationMinutes} min
                          </span>
                        ) : null
                      })()}
                  </div>
                ))}

                <div className="mt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(session.id)}
                    className="press flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/20"
                  >
                    <Pencil size={12} strokeWidth={2.5} />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(session.id)}
                    className="press flex items-center gap-1.5 rounded-full border border-rose/40 bg-rose/10 px-3 py-1.5 text-xs font-semibold text-rose transition-colors hover:bg-rose/20"
                  >
                    <Trash2 size={12} strokeWidth={2.5} />
                    Delete
                  </button>
                </div>
              </div>
            </Collapsible>
          </div>
        )
      })}
    </div>
  )
}
