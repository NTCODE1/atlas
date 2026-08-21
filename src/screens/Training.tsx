import { useMemo, useState } from 'react'
import { useCountUp } from '../hooks/useCountUp'
import { useWorkouts } from '../hooks/useWorkouts'
import { useWatchWorkouts } from '../api/workoutContext'
import { useHealth } from '../api/healthContext'
import { useSettings } from '../settingsContext'
import { useSyncedStorage } from '../hooks/useSyncedStorage'
import { todayISO, weeklyLoadDays, weeklyVolume, type WorkoutSession } from '../workouts'
import { weeklyCardioStats, weeklyCardioDays } from '../api/workoutMapper'
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
  const volume = useCountUp(Math.round(weeklyVolume(sessions, settings.weightUnit)))
  const cardio = useMemo(() => weeklyCardioStats(workouts), [workouts])
  const cardioDays = useMemo(() => weeklyCardioDays(workouts), [workouts])

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
    <div className="flex-1 overflow-y-auto px-6 pb-28">
      {/* Header */}
      <div className="pt-1">
        <h1 className="font-display text-[32px] font-bold leading-tight text-text">Training</h1>
        <p className="mt-0.5 text-text-muted">This week</p>
      </div>

      {/* Weekly load hero — driven by real logged volume */}
      <div className="card-grad-glass mt-4 rounded-[28px] px-5 py-5">
        <span className="text-[11px] font-medium tracking-wider text-text-muted">WEEKLY VOLUME</span>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="num-glow font-display text-[56px] font-bold leading-none text-text">
            {volume.toLocaleString()}
          </span>
          <span className="text-lg text-text-muted">{settings.weightUnit}</span>
        </div>
        <span className="mt-1 block font-display text-base font-semibold text-sky">
          {sessions.length === 0 ? 'log your first workout' : `${sessions.length} sessions logged`}
        </span>

        <div className="mt-5">
          <LoadBarChart days={days} />
        </div>
      </div>

      {/* Weekly cardio — the watch-import counterpart to weekly gym volume above.
          Distance (km) is the standard running-volume unit, so it gets the same
          bar-chart treatment as gym load, just plotting real km instead of au. */}
      {cardio.sessions > 0 && (
        <div className="glass-subtle mt-3 rounded-2xl px-4 py-3">
          <div>
            <span className="text-[11px] font-medium tracking-wider text-text-muted">
              WEEKLY CARDIO
            </span>
            <span className="mt-0.5 block text-sm font-semibold text-text">
              {cardio.sessions} {cardio.sessions === 1 ? 'session' : 'sessions'}
              {cardio.distanceKm > 0 ? ` · ${cardio.distanceKm.toFixed(1)} km` : ''}
              {cardio.durationMinutes > 0 ? ` · ${cardio.durationMinutes} min` : ''}
            </span>
          </div>
          {cardio.distanceKm > 0 && (
            <div className="mt-4">
              <LoadBarChart days={cardioDays} />
            </div>
          )}
        </div>
      )}

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
