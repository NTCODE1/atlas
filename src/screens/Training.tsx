import { ChevronDown } from 'lucide-react'
import { training } from '../data'
import { useCountUp } from '../hooks/useCountUp'
import LoadBarChart from '../components/training/LoadBarChart'
import UpNextCard from '../components/training/UpNextCard'
import TargetCard from '../components/training/TargetCard'
import SessionsSummary from '../components/training/SessionsSummary'

export default function Training() {
  const load = useCountUp(training.weeklyLoad)

  return (
    <div className="flex-1 overflow-y-auto px-6 pb-6">
      {/* Header */}
      <div className="pt-1">
        <h1 className="font-display text-[32px] font-bold leading-tight text-text">Training</h1>
        <p className="mt-0.5 flex items-center gap-1 text-text-muted">
          {training.period}
          <ChevronDown size={16} strokeWidth={2} />
        </p>
      </div>

      {/* Weekly load hero */}
      <div className="mt-4 rounded-3xl border border-border bg-surface px-5 py-5">
        <span className="text-[11px] font-medium tracking-wider text-text-muted">WEEKLY LOAD</span>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="font-display text-[56px] font-bold leading-none text-text">{load}</span>
          <span className="text-lg text-text-muted">{training.unit}</span>
        </div>
        <span className="mt-1 block font-display text-base font-semibold text-mint">
          {training.status}
        </span>

        <div className="mt-5">
          <LoadBarChart days={training.days} />
        </div>
      </div>

      <div className="mt-4">
        <UpNextCard />
      </div>

      <div className="mt-4">
        <TargetCard />
      </div>

      <div className="mt-4">
        <SessionsSummary />
      </div>
    </div>
  )
}
