import { useState, type ReactNode } from 'react'
import { Coffee, Heart, Moon, Plus, Scale } from 'lucide-react'
import { readinessVerdict } from '../data'
import { useHealth } from '../api/healthContext'
import { useReadiness } from '../hooks/useReadiness'
import { useSettings } from '../settingsContext'
import ReadinessRing from '../components/home/ReadinessRing'
import ProgressTile from '../components/home/ProgressTile'
import WaterCard from '../components/WaterCard'
import BriefingCard from '../components/home/BriefingCard'
import TodayChecklist from '../components/home/TodayChecklist'
import QuickAddSheet, { type QuickAddTarget } from '../components/home/QuickAddSheet'
import Card from '../components/ui/Card'
import PageHeader from '../components/ui/PageHeader'
import { Eyebrow } from '../components/ui/SectionHeader'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { useWeightLog } from '../hooks/useWeightLog'
import { kgToDisplay } from '../settings'
import { latestEntry } from '../weightLog'
import { todayISO } from '../workouts'
import type { CaffeineDose } from '../caffeine'

interface HomeProps {
  /** Open the full Sleep screen (Sleep lives under More). */
  onOpenSleep: () => void
  /** Open the Body screen (weight trend + plan phase). */
  onOpenBody: () => void
  /** Quick-add hand-offs to the screen that owns each log. */
  onQuickAdd: (target: Exclude<QuickAddTarget, 'weight'>) => void
}

/** Time-of-day greeting for the header's light lead line. */
function greeting(now = new Date()): string {
  const h = now.getHours()
  if (h < 5) return 'Good night,'
  if (h < 12) return 'Good morning,'
  if (h < 18) return 'Good afternoon,'
  return 'Good evening,'
}

const formatDate = (d = new Date()) =>
  d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

export default function Home({ onOpenSleep, onOpenBody, onQuickAdd }: HomeProps) {
  const { health, loading } = useHealth()
  const { settings } = useSettings()
  const [weightEntries] = useWeightLog()
  // Read-only here: doses are owned by the Energy screen.
  const [caffeineDoses] = useLocalStorage<CaffeineDose[]>('atlas.caffeine.doses', [])
  const [quickAddOpen, setQuickAddOpen] = useState(false)

  const { readiness: readinessResult, readinessLabel } = useReadiness()
  const verdict = readinessVerdict(readinessResult)

  const today = todayISO()
  const caffeineMg = caffeineDoses.filter((d) => d.date === today).reduce((sum, d) => sum + (d.mg ?? 0), 0)

  // Today's weigh-in: the manual log for today, else today's scale reading.
  // An older weight shows its date instead of pretending to be today's.
  const latestManual = latestEntry(weightEntries)
  const weight =
    latestManual?.date === today
      ? { kg: latestManual.kg, sub: 'today' }
      : health.weightKg != null && health.weightDate === today
        ? { kg: health.weightKg, sub: 'today' }
        : latestManual
          ? { kg: latestManual.kg, sub: 'last logged' }
          : null

  const pickQuickAdd = (target: QuickAddTarget) => {
    setQuickAddOpen(false)
    if (target === 'weight') onOpenBody()
    else onQuickAdd(target)
  }

  return (
    <div className="flex-1 overflow-y-auto px-5 pb-nav">
      <PageHeader
        lead={greeting()}
        title={settings.name}
        subtitle={formatDate()}
        action={
          <button
            type="button"
            onClick={() => setQuickAddOpen(true)}
            aria-label="Quick add"
            className="press grid h-11 w-11 place-items-center rounded-full bg-accent-bright text-bg shadow-[0_0_18px_rgba(255,255,255,0.2)]"
          >
            <Plus size={22} strokeWidth={2.2} />
          </button>
        }
      />

      {/* Readiness hero */}
      <Card variant="hero" className="mt-5 px-5 pb-5 pt-6">
        <ReadinessRing score={readinessResult.score} label={readinessLabel} loading={loading} />
        <p className="mx-auto mt-4 max-w-[17rem] text-center text-[13px] leading-relaxed text-text-muted">
          {loading ? 'Loading your data…' : verdict}
        </p>
      </Card>

      {/* Sleep · HRV · Caffeine · Weight — "—" when there's no real reading. */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        <MiniStat
          icon={<Moon size={13} strokeWidth={1.9} />}
          label="Sleep"
          sub="total"
          onClick={onOpenSleep}
          value={
            health.sleepHours != null ? (
              <>
                {health.sleepHours}
                <Unit>h</Unit>
                {health.sleepMinutes ?? 0}
                <Unit>m</Unit>
              </>
            ) : (
              '—'
            )
          }
        />
        <MiniStat
          icon={<Heart size={13} strokeWidth={1.9} />}
          label="HRV"
          sub="avg"
          onClick={onOpenSleep}
          value={
            health.hrv != null ? (
              <>
                {Math.round(health.hrv)}
                <Unit>ms</Unit>
              </>
            ) : (
              '—'
            )
          }
        />
        <MiniStat
          icon={<Coffee size={13} strokeWidth={1.9} />}
          label="Caffeine"
          sub="today"
          onClick={() => onQuickAdd('caffeine')}
          value={
            <>
              {Math.round(caffeineMg)}
              <Unit>mg</Unit>
            </>
          }
        />
        <MiniStat
          icon={<Scale size={13} strokeWidth={1.9} />}
          label="Weight"
          sub={weight?.sub ?? 'tap to log'}
          onClick={onOpenBody}
          value={
            weight ? (
              <>
                {kgToDisplay(weight.kg, settings.weightUnit)}
                <Unit>{settings.weightUnit}</Unit>
              </>
            ) : (
              '—'
            )
          }
        />
      </div>

      {/* The plan's daily checklist */}
      <div className="mt-3">
        <TodayChecklist />
      </div>

      {/* Deep work + hydration */}
      <div className="mt-3 flex gap-3">
        <ProgressTile />
        <WaterCard compact />
      </div>

      {/* AI daily brief */}
      <div className="mt-3">
        <BriefingCard />
      </div>

      {quickAddOpen && <QuickAddSheet onPick={pickQuickAdd} onClose={() => setQuickAddOpen(false)} />}
    </div>
  )
}

function Unit({ children }: { children: ReactNode }) {
  return <span className="mr-0.5 text-[11px] font-normal text-text-muted">{children}</span>
}

/** Small tappable stat tile (icon, caps label, value, muted sub-label). */
function MiniStat({
  icon,
  label,
  value,
  sub,
  onClick,
}: {
  icon: ReactNode
  label: string
  value: ReactNode
  sub: string
  onClick: () => void
}) {
  return (
    <button type="button" onClick={onClick} className="glass press flex min-w-0 flex-col rounded-2xl px-2.5 py-3 text-left">
      <span className="text-text-muted">{icon}</span>
      <Eyebrow className="mt-1.5 truncate !text-[9.5px] !tracking-[0.1em]">{label}</Eyebrow>
      <span className="mt-1 truncate text-[17px] font-semibold leading-tight tracking-tight text-text tabular-nums">
        {value}
      </span>
      <span className="mt-0.5 truncate text-[11px] text-text-muted">{sub}</span>
    </button>
  )
}
