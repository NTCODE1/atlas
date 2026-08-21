import { useState } from 'react'
import { Plus, Target } from 'lucide-react'
import { useLocalStorage } from '../../hooks/useLocalStorage'
import { useSyncedStorage } from '../../hooks/useSyncedStorage'
import { sortGoals, type FinanceSavings, type Goal } from '../../goals'
import { DEFAULT_FINANCE, type FinanceData } from '../../finance'
import GoalBar from './GoalBar'
import GoalsListSheet from './GoalsListSheet'
import GoalEditorSheet from './GoalEditorSheet'

const PREVIEW_COUNT = 3

/** Goals card at the top of the Motivation tab: milestone + numeric goals. */
export default function GoalsSection() {
  const [goals, setGoals] = useSyncedStorage<Goal[]>('atlas.goals', [], 'goals')
  // Read-only mirror of the Finance savings goal (owned by the Finance tab).
  const [finance] = useLocalStorage<FinanceData>('atlas.finance', DEFAULT_FINANCE)
  const financeSavings: FinanceSavings = {
    current: finance.savingsGoal.current,
    target: finance.savingsGoal.target,
  }

  const [listOpen, setListOpen] = useState(false)
  // undefined = closed; null = new goal; Goal = editing that goal.
  const [editing, setEditing] = useState<Goal | null | undefined>(undefined)

  const upsert = (goal: Goal) =>
    setGoals((prev) => {
      const exists = prev.some((g) => g.id === goal.id)
      return exists ? prev.map((g) => (g.id === goal.id ? goal : g)) : [goal, ...prev]
    })
  const remove = (id: string) => setGoals((prev) => prev.filter((g) => g.id !== id))

  const sorted = sortGoals(goals, financeSavings)
  const preview = sorted.slice(0, PREVIEW_COUNT)

  return (
    <div className="glass mt-4 rounded-3xl px-5 py-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Target size={13} strokeWidth={2.5} className="text-text-muted" />
          <span className="text-[11px] font-medium tracking-wider text-text-muted">GOALS</span>
        </div>
        <button
          type="button"
          onClick={() => setEditing(null)}
          aria-label="Add goal"
          className="press grid h-8 w-8 place-items-center rounded-full border border-accent/40 bg-accent/10 text-accent transition-colors hover:bg-accent/20"
        >
          <Plus size={16} strokeWidth={2.5} />
        </button>
      </div>

      {goals.length === 0 ? (
        <p className="mt-3 text-sm text-text-muted">
          No goals yet — tap + to set one you're working toward.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-2.5">
          {preview.map((goal) => (
            <GoalBar key={goal.id} goal={goal} finance={financeSavings} onOpen={setEditing} />
          ))}
          {goals.length > PREVIEW_COUNT && (
            <button
              type="button"
              onClick={() => setListOpen(true)}
              className="press mt-0.5 self-center text-sm font-semibold text-accent"
            >
              View all goals ({goals.length})
            </button>
          )}
        </div>
      )}

      {listOpen && (
        <GoalsListSheet
          goals={goals}
          finance={financeSavings}
          onOpen={(g) => {
            setListOpen(false)
            setEditing(g)
          }}
          onAdd={() => {
            setListOpen(false)
            setEditing(null)
          }}
          onClose={() => setListOpen(false)}
        />
      )}

      {editing !== undefined && (
        <GoalEditorSheet
          goal={editing ?? undefined}
          onSave={upsert}
          onDelete={remove}
          onClose={() => setEditing(undefined)}
        />
      )}
    </div>
  )
}
