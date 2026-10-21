import { useMemo, useState } from 'react'
import { useCountUp } from '../hooks/useCountUp'
import { useWorkouts } from '../hooks/useWorkouts'
import { useWatchWorkouts } from '../api/workoutContext'
import { useHealth } from '../api/healthContext'
import { useSettings } from '../settingsContext'
import { useSyncedStorage } from '../hooks/useSyncedStorage'
import { Activity, Bike, Dumbbell, Footprints, Mountain, Waves } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { sessionVolume, todayISO, weeklyLoadDays, weeklyVolume, type WorkoutSession } from '../workouts'
import type { Workout, WorkoutType } from '../api/workoutMapper'
import type { WeightUnit } from '../settings'
import Card from '../components/ui/Card'
import PageHeader from '../components/ui/PageHeader'
import ProgressBar from '../components/ui/ProgressBar'
import type { Vo2MaxEntry } from '../vo2max'
import LoadBarChart from '../components/training/LoadBarChart'
import SessionLogger from '../components/training/SessionLogger'
import SessionHistory from '../components/training/SessionHistory'
import CardioHistory from '../components/training/CardioHistory'
import Vo2MaxCard from '../components/training/Vo2MaxCard'
import Vo2MaxSheet from '../components/training/Vo2MaxSheet'
import ExerciseProgress from '../components/training/ExerciseProgress'
import SegmentedControl from '../components/ui/SegmentedControl'

type Tab = 'log' | 'history' | 'cardio' | 'progress'

const TAB_OPTIONS: { id: Tab; label: string }[] = [
  { id: 'log', label: 'Log' },
  { id: 'history', label: 'History' },
  { id: 'cardio', label: 'Cardio' },
  { id: 'progress', label: 'Progress' },
]

const formatSessionLabel = (session: WorkoutSession) =>
  `${new Date(`${session.date}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} · ${new Date(
    session.startedAt,
  ).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`

/** Most recently started session that hasn't had a duration saved yet, if
 *  any — so returning to this tab (the whole screen remounts on tab switch)
 *  resumes an in-progress workout instead of losing track of it. */
const findOpenSessionId = (sessions: WorkoutSession[]): string | null => {
  const open = sessions.filter((s) => s.durationMinutes === null)
  if (open.length === 0) return null
  return [...open].sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0].id
}

type SessionKind = 'gym' | WorkoutType

const TYPE_META: Record<SessionKind, { label: string; icon: LucideIcon }> = {
  gym: { label: 'Gym', icon: Dumbbell },
  strength: { label: 'Strength', icon: Dumbbell },
  run: { label: 'Run', icon: Footprints },
  bike: { label: 'Bike', icon: Bike },
  swim: { label: 'Swim', icon: Waves },
  hike: { label: 'Hike', icon: Mountain },
  // Watch sessions HAE can't classify — skiing and trampoline land here today.
  other: { label: 'Other', icon: Activity },
}

/**
 * This week's (Mon–Sun) sessions: manually logged gym sessions plus watch
 * workouts, counted together and grouped by type for the hero's circles.
 */
function weekSessionSummary(sessions: WorkoutSession[], workouts: Workout[], unit: WeightUnit) {
  const monday = new Date()
  monday.setHours(0, 0, 0, 0)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  const from = todayISO(monday)

  const gym = sessions.filter((s) => s.date >= from && s.exercises.length > 0)
  const watch = workouts.filter((w) => w.date >= from)

  const types: { type: SessionKind; detail: string }[] = []
  if (gym.length > 0) {
    const kg = gym.reduce((sum, s) => sum + sessionVolume(s), 0)
    types.push({ type: 'gym', detail: `${Math.round(unit === 'kg' ? kg : kg / 0.45359237).toLocaleString()} ${unit}` })
  }
  const minutesByType = new Map<WorkoutType, number>()
  for (const w of watch) minutesByType.set(w.type, (minutesByType.get(w.type) ?? 0) + (w.durationMinutes ?? 0))
  for (const [type, minutes] of minutesByType) {
    const h = Math.floor(minutes / 60)
    types.push({ type, detail: h > 0 ? `${h}h ${Math.round(minutes % 60)}m` : `${Math.round(minutes)} min` })
  }

  return { total: gym.length + watch.length, types: types.slice(0, 8) }
}

export default function Training() {
  const { settings } = useSettings()
  const {
    exercises,
    sessions,
    addExercise,
    renameExercise,
    deleteExercise,
    upsertSession,
    deleteSession,
    startSession,
    saveSessionDuration,
    exerciseIndex,
  } = useWorkouts()

  const { workouts } = useWatchWorkouts()
  const { vo2MaxSeries } = useHealth()
  const [vo2MaxEntries, setVo2MaxEntries] = useSyncedStorage<Vo2MaxEntry[]>(
    'atlas.vo2max.entries',
    [],
    'vo2maxEntries',
  )

  const [tab, setTab] = useState<Tab>('log')
  // Which session the Log tab shows — an independent entry, not tied to "today".
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => findOpenSessionId(sessions))
  const [vo2MaxOpen, setVo2MaxOpen] = useState(false)

  const editingSession = sessions.find((s) => s.id === activeSessionId)
  const isFreshActive =
    editingSession?.date === todayISO() && editingSession?.durationMinutes === null

  const days = weeklyLoadDays(sessions)
  const week = useMemo(() => weekSessionSummary(sessions, workouts, settings.weightUnit), [sessions, workouts, settings.weightUnit])
  const volume = useCountUp(Math.round(weeklyVolume(sessions, settings.weightUnit)))

  const handleStart = () => setActiveSessionId(startSession().id)

  const editFromHistory = (id: string) => {
    setActiveSessionId(id)
    setTab('log')
  }

  const handleSaveDuration = (minutes: number) => {
    if (!editingSession) return
    saveSessionDuration(editingSession.id, minutes)
    setActiveSessionId(null)
  }

  const handleDeleteSession = (id: string) => {
    deleteSession(id)
    if (id === activeSessionId) setActiveSessionId(null)
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 pb-nav">
      <PageHeader title="Training" subtitle="This week" />

      {/* Sessions-this-week hero: count vs target, one circle per session type */}
      <Card variant="hero" className="mt-5 px-5 pb-5 pt-5">
        <div className="flex items-baseline gap-2">
          <span className="num-glow text-[40px] font-semibold leading-none tracking-tight text-text tabular-nums">
            {week.total}
          </span>
          <span className="text-base text-text-muted">/ {settings.weeklySessionTarget} sessions</span>
        </div>
        <ProgressBar value={week.total / settings.weeklySessionTarget} className="mt-3" />
        <span className="mt-2 block text-sm text-text-muted">
          {volume.toLocaleString()} {settings.weightUnit} lifted this week
        </span>

        {week.types.length > 0 ? (
          <div className="mt-5 grid grid-cols-4 gap-2">
            {week.types.map((t) => {
              const Icon = TYPE_META[t.type].icon
              return (
                <div key={t.type} className="flex min-w-0 flex-col items-center">
                  <span className="grid h-14 w-14 place-items-center rounded-full border border-white/[0.08] bg-white/[0.05] text-text shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                    <Icon size={22} strokeWidth={1.6} />
                  </span>
                  <span className="mt-2 truncate text-[13px] font-medium text-text">{TYPE_META[t.type].label}</span>
                  <span className="truncate text-[11px] text-text-muted">{t.detail}</span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="mt-4 text-sm text-text-muted">No sessions yet this week.</p>
        )}

        <div className="mt-5">
          <LoadBarChart days={days} />
        </div>
      </Card>

      {/* Log | History | Cardio | Progress */}
      <div className="mt-4">
        <SegmentedControl options={TAB_OPTIONS} value={tab} onChange={setTab} />
      </div>

      {tab === 'log' && editingSession && !isFreshActive && (
        <div className="glass-subtle mt-4 flex items-center justify-between rounded-2xl px-3.5 py-2.5">
          <span className="text-xs text-text-muted">
            Editing {formatSessionLabel(editingSession)} session
          </span>
          <button
            type="button"
            onClick={() => setActiveSessionId(null)}
            className="press text-xs font-semibold text-accent"
          >
            Close
          </button>
        </div>
      )}
      {tab === 'log' && (
        <SessionLogger
          key={editingSession?.id ?? 'empty'}
          session={editingSession}
          dateLabel="today"
          exercises={exercises}
          defaultUnit={settings.weightUnit}
          onStart={handleStart}
          onChange={upsertSession}
          onSaveDuration={handleSaveDuration}
          onCreateExercise={addExercise}
          onRenameExercise={renameExercise}
          onDeleteExercise={deleteExercise}
        />
      )}
      {tab === 'history' && (
        <SessionHistory sessions={sessions} onEdit={editFromHistory} onDelete={handleDeleteSession} />
      )}
      {tab === 'cardio' && (
        <div className="mt-4 flex flex-col gap-3">
          <Vo2MaxCard
            liveSeries={vo2MaxSeries}
            manualEntries={vo2MaxEntries}
            age={settings.age}
            sex={settings.sex}
            onLogClick={() => setVo2MaxOpen(true)}
          />
          <CardioHistory workouts={workouts} />
        </div>
      )}

      {vo2MaxOpen && (
        <Vo2MaxSheet
          entries={vo2MaxEntries}
          setEntries={setVo2MaxEntries}
          onClose={() => setVo2MaxOpen(false)}
        />
      )}
      {tab === 'progress' && (
        <ExerciseProgress exercises={exercises} exerciseIndex={exerciseIndex} unit={settings.weightUnit} />
      )}
    </div>
  )
}
