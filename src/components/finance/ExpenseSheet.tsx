import { useState } from 'react'
import { Check, ChevronDown, Trash2 } from 'lucide-react'
import { newId, todayISO, type Expense } from '../../finance'
import Sheet from '../ui/Sheet'

interface ExpenseSheetProps {
  categories: string[]
  onAdd: (expense: Expense) => void
  onCategories: (categories: string[]) => void
  onClose: () => void
}

/** Add an expense (amount, category, date, note) + manage the category list. */
export default function ExpenseSheet({
  categories,
  onAdd,
  onCategories,
  onClose,
}: ExpenseSheetProps) {
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(categories[0] ?? 'Other')
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [manageOpen, setManageOpen] = useState(false)
  const [newCat, setNewCat] = useState('')

  const submit = () => {
    const value = Number(amount)
    if (!Number.isFinite(value) || value <= 0) return
    onAdd({
      id: newId(),
      amount: Math.round(value * 100) / 100,
      category,
      date,
      note: note.trim() || undefined,
    })
    onClose()
  }

  const addCategory = () => {
    const name = newCat.trim()
    if (!name || categories.includes(name)) return
    onCategories([...categories, name])
    setCategory(name)
    setNewCat('')
  }

  const deleteCategory = (name: string) => {
    if (categories.length <= 1) return
    const next = categories.filter((c) => c !== name)
    onCategories(next)
    if (category === name) setCategory(next[0])
  }

  return (
    <Sheet title="Add expense" maxHeight="tall" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-text-muted">Amount (€)</span>
          <input
            type="number"
            inputMode="decimal"
            autoFocus
            value={amount}
            placeholder="0.00"
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-accent/60 focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-text-muted">Category</span>
          <div className="relative">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full appearance-none rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text focus:border-accent/60 focus:outline-none [&>option]:bg-surface"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <ChevronDown
              size={16}
              strokeWidth={2}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
            />
          </div>
        </label>

        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-xs text-text-muted">Date</span>
            <input
              type="date"
              value={date}
              max={todayISO()}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text focus:border-accent/60 focus:outline-none"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-text-muted">Note (optional)</span>
          <input
            value={note}
            placeholder="e.g. groceries"
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-accent/60 focus:outline-none"
          />
        </label>

        <button
          type="button"
          onClick={submit}
          className="press mt-1 w-full rounded-full bg-accent py-2.5 text-sm font-semibold text-bg transition-opacity hover:opacity-90"
        >
          Add expense
        </button>

        {/* Manage categories */}
        <button
          type="button"
          onClick={() => setManageOpen((v) => !v)}
          className="press mt-2 flex items-center justify-between text-xs font-medium tracking-wider text-text-muted"
        >
          EDIT CATEGORIES
          <ChevronDown
            size={14}
            strokeWidth={2}
            className={`transition-transform ${manageOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {manageOpen && (
          <div className="glass-subtle flex flex-col gap-2 rounded-xl p-3">
            <div className="flex gap-2">
              <input
                value={newCat}
                placeholder="New category"
                onChange={(e) => setNewCat(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-2.5 py-1.5 text-sm text-text placeholder:text-text-muted focus:border-accent/60 focus:outline-none"
              />
              <button
                type="button"
                onClick={addCategory}
                aria-label="Add category"
                className="press grid w-9 shrink-0 place-items-center rounded-lg bg-accent text-bg"
              >
                <Check size={15} strokeWidth={2.5} />
              </button>
            </div>
            {categories.map((c) => (
              <div key={c} className="flex items-center justify-between py-0.5">
                <span className="text-sm text-text">{c}</span>
                <button
                  type="button"
                  onClick={() => deleteCategory(c)}
                  aria-label={`Delete ${c}`}
                  className="press grid h-7 w-7 place-items-center rounded-full text-text-muted transition-colors hover:bg-rose/10 hover:text-rose"
                >
                  <Trash2 size={13} strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  )
}
