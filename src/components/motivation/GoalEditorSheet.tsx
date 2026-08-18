import { useState } from 'react'
import { Check, Plus, Trash2 } from 'lucide-react'
import { newId, type Goal, type GoalType, type Milestone } from '../../goals'
import type { IconId } from '../../icons'
import Sheet from '../ui/Sheet'
import IconPicker from '../ui/IconPicker'
import SegmentedControl from '../ui/SegmentedControl'

interface GoalEditorSheetProps {
  /** Existing goal to edit, or undefined to create a new one. */
  goal?: Goal
  onSave: (goal: Goal) => void
  onDelete: (id: string) => void
  onClose: () => void
}

export default function GoalEditorSheet({ goal, onSave, onDelete, onClose }: GoalEditorSheetProps) {
  const [title, setTitle] = useState(goal?.title ?? '')
  const [icon, setIcon] = useState<IconId>(goal?.icon ?? 'star')
  const [type, setType] = useState<GoalType>(goal?.type ?? 'milestone')
  const [milestones, setMilestones] = useState<Milestone[]>(goal?.milestones ?? [])
  const [current, setCurrent] = useState(String(goal?.current ?? ''))
  const [target, setTarget] = useState(String(goal?.target ?? ''))
  const [unit, setUnit] = useState(goal?.unit ?? '')
  const [unitPosition, setUnitPosition] = useState<'prefix' | 'suffix'>(goal?.unitPosition ?? 'suffix')
  const [linkFinance, setLinkFinance] = useState(goal?.linkFinanceSavings ?? false)
  const [deadline, setDeadline] = useState(goal?.deadline ?? '')

  const addMilestone = () =>
    setMilestones((prev) => [...prev, { id: newId(), label: '', done: false }])
  const patchMilestone = (id: string, fields: Partial<Milestone>) =>
    setMilestones((prev) => prev.map((m) => (m.id === id ? { ...m, ...fields } : m)))
  const removeMilestone = (id: string) =>
    setMilestones((prev) => prev.filter((m) => m.id !== id))

  const save = () => {
    if (!title.trim()) return
    const base: Goal = {
      id: goal?.id ?? newId(),
      title: title.trim(),
      icon,
      type,
      createdAt: goal?.createdAt ?? new Date().toISOString(),
      deadline: deadline || undefined,
    }
    if (type === 'milestone') {
      base.milestones = milestones.filter((m) => m.label.trim()).map((m) => ({ ...m, label: m.label.trim() }))
    } else {
      base.linkFinanceSavings = linkFinance
      if (!linkFinance) {
        base.current = Math.max(0, Number(current) || 0)
        base.target = Math.max(0, Number(target) || 0)
        base.unit = unit.trim()
        base.unitPosition = unitPosition
      }
    }
    onSave(base)
    onClose()
  }

  return (
    <Sheet title={goal ? 'Edit goal' : 'New goal'} maxHeight="tall" onClose={onClose}>
      <div className="flex flex-col gap-4">
        {/* Title */}
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-text-muted">Title</span>
          <input
            value={title}
            autoFocus
            placeholder="e.g. Launch SoloRise"
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-accent/60 focus:outline-none"
          />
        </label>

        {/* Icon */}
        <div>
          <span className="mb-2 block text-xs text-text-muted">Icon</span>
          <div className="glass-subtle rounded-2xl p-3">
            <IconPicker value={icon} onChange={(id) => id && setIcon(id)} />
          </div>
        </div>

        {/* Type */}
        <div>
          <span className="mb-2 block text-xs text-text-muted">Type</span>
          <SegmentedControl
            options={[
              { id: 'milestone', label: 'Milestones' },
              { id: 'numeric', label: 'Number' },
            ]}
            value={type}
            onChange={setType}
          />
        </div>

        {/* Milestone editor */}
        {type === 'milestone' && (
          <div className="flex flex-col gap-2">
            {milestones.map((m) => (
              <div key={m.id} className="glass-subtle flex items-center gap-2 rounded-xl px-2.5 py-2">
                <button
                  type="button"
                  onClick={() => patchMilestone(m.id, { done: !m.done })}
                  aria-label={m.done ? 'Mark undone' : 'Mark done'}
                  aria-pressed={m.done}
                  className={`press grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                    m.done ? 'border-accent bg-accent text-bg' : 'border-border-strong text-transparent'
                  }`}
                >
                  <Check size={13} strokeWidth={3} />
                </button>
                <input
                  value={m.label}
                  placeholder="Step"
                  onChange={(e) => patchMilestone(m.id, { label: e.target.value })}
                  className="min-w-0 flex-1 bg-transparent text-sm text-text placeholder:text-text-muted focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeMilestone(m.id)}
                  aria-label="Delete step"
                  className="press grid h-7 w-7 shrink-0 place-items-center rounded-full text-text-muted transition-colors hover:bg-rose/10 hover:text-rose"
                >
                  <Trash2 size={13} strokeWidth={2} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addMilestone}
              className="press flex items-center gap-1.5 self-start rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/20"
            >
              <Plus size={13} strokeWidth={2.5} />
              Add step
            </button>
          </div>
        )}

        {/* Numeric editor */}
        {type === 'numeric' && (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setLinkFinance((v) => !v)}
              aria-pressed={linkFinance}
              className={`press flex items-center justify-between rounded-xl border px-3.5 py-3 text-left transition-colors ${
                linkFinance ? 'border-accent/40 bg-accent/10' : 'border-border bg-fill'
              }`}
            >
              <span className={`text-sm font-medium ${linkFinance ? 'text-accent' : 'text-text'}`}>
                Link to Finance savings
              </span>
              <span className="text-xs text-text-muted">{linkFinance ? 'On' : 'Off'}</span>
            </button>

            {linkFinance ? (
              <p className="text-xs leading-relaxed text-text-muted">
                Uses your Finance tab savings goal — its saved / target amount drives this bar.
              </p>
            ) : (
              <>
                <div className="flex gap-3">
                  <label className="flex flex-1 flex-col gap-1.5">
                    <span className="text-xs text-text-muted">Current</span>
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
                    <span className="text-xs text-text-muted">Target</span>
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
                <div className="flex items-end gap-3">
                  <label className="flex flex-1 flex-col gap-1.5">
                    <span className="text-xs text-text-muted">Unit (e.g. €, km, books)</span>
                    <input
                      value={unit}
                      placeholder="books"
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-accent/60 focus:outline-none"
                    />
                  </label>
                  <div className="flex-1">
                    <SegmentedControl
                      options={[
                        { id: 'prefix', label: 'Before' },
                        { id: 'suffix', label: 'After' },
                      ]}
                      value={unitPosition}
                      onChange={setUnitPosition}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Deadline */}
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-text-muted">Deadline (optional)</span>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text focus:border-accent/60 focus:outline-none"
          />
        </label>

        {/* Actions */}
        <div className="mt-1 flex gap-2">
          <button
            type="button"
            onClick={save}
            disabled={!title.trim()}
            className="press flex-1 rounded-full bg-accent py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Save
          </button>
          {goal && (
            <button
              type="button"
              onClick={() => {
                onDelete(goal.id)
                onClose()
              }}
              aria-label="Delete goal"
              className="press grid w-12 place-items-center rounded-full border border-rose/40 bg-rose/10 text-rose transition-colors hover:bg-rose/20"
            >
              <Trash2 size={17} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    </Sheet>
  )
}
