import { Plus } from 'lucide-react'
import { sortGoals, type FinanceSavings, type Goal } from '../../goals'
import Sheet from '../ui/Sheet'
import GoalBar from './GoalBar'

interface GoalsListSheetProps {
  goals: Goal[]
  finance?: FinanceSavings
  onOpen: (goal: Goal) => void
  onAdd: () => void
  onClose: () => void
}

/** Full goals list behind "View All Goals". */
export default function GoalsListSheet({ goals, finance, onOpen, onAdd, onClose }: GoalsListSheetProps) {
  const sorted = sortGoals(goals, finance)

  return (
    <Sheet title="All goals" maxHeight="tall" onClose={onClose}>
      <button
        type="button"
        onClick={onAdd}
        className="press mb-3 flex w-full items-center justify-center gap-2 rounded-full bg-accent py-2.5 text-sm font-semibold text-bg"
      >
        <Plus size={16} strokeWidth={2.5} />
        Add goal
      </button>

      <div className="flex flex-col gap-2.5">
        {sorted.map((goal) => (
          <GoalBar key={goal.id} goal={goal} finance={finance} onOpen={onOpen} />
        ))}
        {sorted.length === 0 && (
          <p className="py-2 text-center text-sm text-text-muted">No goals yet.</p>
        )}
      </div>
    </Sheet>
  )
}
