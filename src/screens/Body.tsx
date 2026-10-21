import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Mountain, Scale, Target } from 'lucide-react'
import { useSettings } from '../settingsContext'
import { useWeightLog } from '../hooks/useWeightLog'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { kgToDisplay } from '../settings'
import { dailyWeights, entriesToPoints, sevenDayAverage } from '../weightLog'
import { cutoffDateISO, type SnapshotStore } from '../dailySnapshot'
import { todayISO } from '../workouts'
import { currentPhase, PLAN } from '../plan'
import WeightSheet from '../components/home/WeightSheet'
import LineChart from '../components/ui/LineChart'
import Card from '../components/ui/Card'
import PageHeader from '../components/ui/PageHeader'
import ActionButton from '../components/ui/ActionButton'
import ListRow, { IconDisc } from '../components/ui/ListRow'
import { Eyebrow } from '../components/ui/SectionHeader'

/** Plan phase, 7-day average weight and the weekly loss rate vs target. */
export default function Body() {
  const { settings } = useSettings()
  const unit = settings.weightUnit
  const [entries, setEntries] = useWeightLog()
  const [snapshots] = useLocalStorage<SnapshotStore>('atlas.snapshots', {})
  const [logOpen, setLogOpen] = useState(false)

  const today = todayISO()
  const phase = currentPhase(today)

  // One weight per day: manual weigh-ins first, scale readings from the daily snapshots otherwise.
  const series = useMemo(() => {
    const scale: Record<string, number | undefined> = {}
    for (const [date, snap] of Object.entries(snapshots)) scale[date] = snap.weightKg
    return dailyWeights(entries, scale)
  }, [entries, snapshots])

  const avgNow = sevenDayAverage(series, today)
  const avgPrev = sevenDayAverage(series, cutoffDateISO(today, 7))
  // Positive = lost weight over the week.
  const weeklyLoss = avgNow != null && avgPrev != null ? avgPrev - avgNow : null

  const last14 = series.filter((e) => e.date >= cutoffDateISO(today, 13))
  const points = entriesToPoints(last14, unit)

  const onTarget = weeklyLoss != null && weeklyLoss >= PLAN.rateLowKg && weeklyLoss <= PLAN.rateHighKg
  // Green only for the right direction during the cut (the one colour exception).
  const good = phase.id === 'cut' && weeklyLoss != null && weeklyLoss > 0
  const rateVerdict =
    weeklyLoss == null
      ? 'Needs two weeks of weigh-ins'
      : onTarget
        ? 'On target'
        : weeklyLoss > 0.7
          ? 'Too fast — eat at maintenance, tell your coach'
          : weeklyLoss > 0.6
            ? 'Fast — add ~150 kcal/day'
            : weeklyLoss > PLAN.rateHighKg
              ? 'Slightly fast — no change yet'
              : weeklyLoss < 0.2
              ? 'Slow — hold a second week before cutting kcal'
              : 'Slightly slow — no change yet'

  return (
    <div className="flex-1 overflow-y-auto px-5 pb-nav">
      <PageHeader title="Body" />

      {/* Plan phase */}
      <Card className="mt-5">
        <ListRow
          leading={
            <IconDisc>
              <Mountain size={17} strokeWidth={1.75} />
            </IconDisc>
          }
          title={
            <>
              <span className="text-[19px] font-semibold">{phase.label}</span>
              <span className="text-text-muted"> · {phase.detail}</span>
            </>
          }
          subtitle={phase.goal}
        />
      </Card>

      {/* 7-day average */}
      <Card variant="hero" className="mt-3 px-4 pb-4 pt-4">
        <div className="flex items-start justify-between">
          <div>
            <Eyebrow>7-day average</Eyebrow>
            <span className="mt-1 block text-[34px] font-semibold leading-none tracking-tight text-text tabular-nums">
              {avgNow != null ? kgToDisplay(avgNow, unit) : '—'}
              <span className="ml-1 text-base font-normal text-text-muted">{unit}</span>
            </span>
          </div>
          {weeklyLoss != null && weeklyLoss !== 0 && (
            <span
              className={`flex items-center gap-0.5 text-sm font-medium ${good ? 'text-good' : 'text-text-muted'}`}
            >
              {weeklyLoss > 0 ? <ArrowDown size={14} strokeWidth={2.4} /> : <ArrowUp size={14} strokeWidth={2.4} />}
              {kgToDisplay(Math.abs(weeklyLoss), unit)} {unit}
              <span className="ml-1 font-normal text-text-muted">vs last week</span>
            </span>
          )}
        </div>

        {points.length >= 2 ? (
          <div className="mt-4">
            <LineChart points={points} unit={unit} color="var(--color-accent-bright)" height={150} />
          </div>
        ) : (
          <p className="mt-4 text-sm text-text-muted">
            Weigh in each morning — the trend appears after two days. Only the 7-day average counts.
          </p>
        )}
      </Card>

      {/* Weekly rate vs plan */}
      <Card className="mt-3">
        <ListRow
          leading={
            <IconDisc>
              <Target size={17} strokeWidth={1.75} />
            </IconDisc>
          }
          title={
            <>
              Target rate{' '}
              <span className="font-semibold">
                {PLAN.rateLowKg}–{PLAN.rateHighKg}
              </span>{' '}
              <span className="text-text-muted">kg/week</span>
            </>
          }
          subtitle={rateVerdict}
        />
      </Card>

      <div className="mt-4">
        <ActionButton icon={<Scale size={18} strokeWidth={1.75} />} label="Log weight" onClick={() => setLogOpen(true)} />
      </div>

      {logOpen && <WeightSheet entries={entries} setEntries={setEntries} onClose={() => setLogOpen(false)} />}
    </div>
  )
}
