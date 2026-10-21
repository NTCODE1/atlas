import { useState, type ReactNode } from 'react'
import { Check } from 'lucide-react'
import { ACTIVITY_META, RPE_LABEL, newActivityId, type ActivityKind, type ActivitySession } from '../../activities'
import { todayISO } from '../../workouts'
import Card from '../ui/Card'
import { Eyebrow } from '../ui/SectionHeader'

interface ActivityLoggerProps {
  kind: ActivityKind
  onSave: (a: ActivitySession) => void
}

const DURATION_PRESETS = [30, 45, 60, 90, 120, 180]

const inputCls =
  'w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-[15px] text-text placeholder:text-text-muted focus:border-white/25 focus:outline-none'

/**
 * Log one ski / trampoline / cardio session: focus, duration, how hard it
 * felt (session RPE 1–10), a kind-specific number (ski runs / cardio km) and
 * a note. Everything but duration is optional so logging stays a few taps.
 */
export default function ActivityLogger({ kind, onSave }: ActivityLoggerProps) {
  const meta = ACTIVITY_META[kind]
  const [date, setDate] = useState(todayISO())
  const [focus, setFocus] = useState<string | null>(null)
  const [minutes, setMinutes] = useState('')
  const [rpe, setRpe] = useState<number | null>(null)
  const [runs, setRuns] = useState('')
  const [distance, setDistance] = useState('')
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState(false)

  const durationMinutes = Number(minutes)
  const canSave = Number.isFinite(durationMinutes) && durationMinutes > 0

  const save = () => {
    if (!canSave) return
    const runsN = Number(runs)
    const kmN = Number(distance)
    onSave({
      id: newActivityId(),
      date,
      kind,
      focus,
      startTime: null,
      durationMinutes: Math.round(durationMinutes),
      rpe,
      runs: kind === 'ski' && runs && Number.isFinite(runsN) ? Math.round(runsN) : null,
      distanceKm: kind === 'cardio' && distance && Number.isFinite(kmN) ? kmN : null,
      notes: notes.trim() || null,
      createdAt: new Date().toISOString(),
    })
    setFocus(null)
    setMinutes('')
    setRpe(null)
    setRuns('')
    setDistance('')
    setNotes('')
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  return (
    <Card className="mt-4 px-4 pb-4 pt-4">
      {/* Focus */}
      <Eyebrow>Focus</Eyebrow>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {meta.focuses.map((f) => (
          <Chip key={f} active={focus === f} onClick={() => setFocus(focus === f ? null : f)}>
            {f}
          </Chip>
        ))}
      </div>

      {/* Duration */}
      <Eyebrow className="mt-5">Duration</Eyebrow>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {DURATION_PRESETS.map((m) => (
          <Chip key={m} active={Number(minutes) === m} onClick={() => setMinutes(String(m))}>
            {m >= 60 ? `${m / 60}h` : `${m}m`}
          </Chip>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={1}
          placeholder="Minutes"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          className={inputCls}
        />
        <input
          type="date"
          value={date}
          max={todayISO()}
          onChange={(e) => setDate(e.target.value)}
          className={`${inputCls} !w-auto`}
        />
      </div>

      {/* RPE */}
      <div className="mt-5 flex items-baseline justify-between">
        <Eyebrow>How hard · RPE</Eyebrow>
        <span className="text-xs text-text-muted">{rpe ? RPE_LABEL[rpe] : 'tap 1–10'}</span>
      </div>
      <div className="mt-2 grid grid-cols-10 gap-1">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRpe(rpe === n ? null : n)}
            aria-pressed={rpe === n}
            className={`press aspect-square rounded-full text-[13px] font-semibold tabular-nums transition-colors duration-200 ${
              rpe === n
                ? 'bg-accent-bright text-bg shadow-[0_0_12px_rgba(255,255,255,0.35)]'
                : rpe != null && n < rpe
                  ? 'bg-white/[0.14] text-text'
                  : 'bg-white/[0.05] text-text-muted'
            }`}
          >
            {n}
          </button>
        ))}
      </div>

      {/* Kind-specific number */}
      {kind === 'ski' && (
        <>
          <Eyebrow className="mt-5">Runs / laps</Eyebrow>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Optional"
            value={runs}
            onChange={(e) => setRuns(e.target.value)}
            className={`${inputCls} mt-2`}
          />
        </>
      )}
      {kind === 'cardio' && (
        <>
          <Eyebrow className="mt-5">Distance (km)</Eyebrow>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={0.1}
            placeholder="Optional"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            className={`${inputCls} mt-2`}
          />
        </>
      )}

      {/* Notes */}
      <Eyebrow className="mt-5">Notes</Eyebrow>
      <textarea
        rows={2}
        placeholder={meta.notesHint}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className={`${inputCls} mt-2 resize-none`}
      />

      <button
        type="button"
        onClick={save}
        disabled={!canSave}
        className="press mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-accent-bright py-3 text-[15px] font-semibold text-bg shadow-[0_0_20px_rgba(255,255,255,0.18)] transition-opacity disabled:opacity-35"
      >
        {saved ? (
          <>
            <Check size={17} strokeWidth={2.6} className="tick-pop" /> Saved
          </>
        ) : (
          `Save ${meta.label.toLowerCase()} session`
        )}
      </button>
    </Card>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`press rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors duration-200 ${
        active
          ? 'border-transparent bg-accent-bright text-bg'
          : 'border-white/[0.08] bg-white/[0.05] text-text-muted hover:text-text'
      }`}
    >
      {children}
    </button>
  )
}
