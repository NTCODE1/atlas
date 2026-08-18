import { useState } from 'react'
import type { SavingsGoal } from '../../finance'
import Sheet from '../ui/Sheet'

interface SavingsGoalSheetProps {
  goal: SavingsGoal
  onSave: (goal: SavingsGoal) => void
  onClose: () => void
}

/** Edit the single savings goal: label, target, current. */
export default function SavingsGoalSheet({ goal, onSave, onClose }: SavingsGoalSheetProps) {
  const [label, setLabel] = useState(goal.label)
  const [target, setTarget] = useState(String(goal.target || ''))
  const [current, setCurrent] = useState(String(goal.current || ''))

  const save = () => {
    onSave({
      label: label.trim() || 'Savings',
      target: Math.max(0, Number(target) || 0),
      current: Math.max(0, Number(current) || 0),
    })
    onClose()
  }

  return (
    <Sheet title="Savings goal" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-text-muted">Label</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text focus:border-accent/60 focus:outline-none"
          />
        </label>
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-xs text-text-muted">Saved (€)</span>
            <input
              type="number"
              inputMode="decimal"
              value={current}
              placeholder="0"
              onChange={(e) => setCurrent(e.target.value)}
              className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-accent/60 focus:outline-none"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-xs text-text-muted">Target (€)</span>
            <input
              type="number"
              inputMode="decimal"
              value={target}
              placeholder="0"
              onChange={(e) => setTarget(e.target.value)}
              className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-accent/60 focus:outline-none"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={save}
          className="press mt-1 w-full rounded-full bg-accent py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
        >
          Save
        </button>
      </div>
    </Sheet>
  )
}
