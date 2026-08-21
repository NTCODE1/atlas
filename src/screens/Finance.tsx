import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useSyncedStorage } from '../hooks/useSyncedStorage'
import { useCountUp } from '../hooks/useCountUp'
import {
  DEFAULT_FINANCE,
  formatEuro,
  monthExpenses,
  netWorth,
  spendingByCategory,
  sumItems,
  type Expense,
  type FinanceData,
  type LineItem,
  type SavingsGoal,
} from '../finance'
import CategoryBarChart from '../components/finance/CategoryBarChart'
import NetWorthSheet from '../components/finance/NetWorthSheet'
import ExpenseSheet from '../components/finance/ExpenseSheet'
import SavingsGoalSheet from '../components/finance/SavingsGoalSheet'

type Sheet = 'networth' | 'expense' | 'savings' | null

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

export default function Finance() {
  const [data, setData] = useSyncedStorage<FinanceData>('atlas.finance', DEFAULT_FINANCE, 'finance')
  const [sheet, setSheet] = useState<Sheet>(null)

  const patch = (fields: Partial<FinanceData>) => setData((prev) => ({ ...prev, ...fields }))

  const worth = netWorth(data)
  const animatedWorth = useCountUp(Math.round(worth), 1000)
  const thisMonth = monthExpenses(data)
  const byCategory = spendingByCategory(thisMonth)
  const monthTotal = thisMonth.reduce((s, e) => s + e.amount, 0)

  const goal = data.savingsGoal
  const goalPct = goal.target > 0 ? Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0

  const addExpense = (expense: Expense) =>
    patch({ expenses: [expense, ...data.expenses] })
  const deleteExpense = (id: string) =>
    patch({ expenses: data.expenses.filter((e) => e.id !== id) })

  const recentExpenses = [...data.expenses]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 8)

  return (
    <div className="flex-1 overflow-y-auto px-6 pb-28">
      {/* Header */}
      <div className="pt-1">
        <h1 className="font-display text-[32px] font-bold leading-tight text-text">Finance</h1>
        <p className="mt-0.5 text-text-muted">Your money, tracked by hand</p>
      </div>

      {/* Net worth hero */}
      <div className="card-grad-glass mt-4 rounded-3xl px-5 py-5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium tracking-wider text-text-muted">NET WORTH</span>
          <button
            type="button"
            onClick={() => setSheet('networth')}
            aria-label="Edit net worth"
            className="press grid h-8 w-8 place-items-center rounded-full border border-border bg-fill text-text-muted hover:text-text"
          >
            <Pencil size={14} strokeWidth={2} />
          </button>
        </div>
        <div className="mt-1 num-glow font-display text-[44px] font-bold leading-none text-text tabular-nums">
          {formatEuro(animatedWorth)}
        </div>
        <div className="mt-3 flex gap-6">
          <div>
            <span className="text-xs text-text-muted">Assets</span>
            <p className="font-display text-sm font-semibold text-text tabular-nums">
              {formatEuro(sumItems(data.assets))}
            </p>
          </div>
          <div>
            <span className="text-xs text-text-muted">Liabilities</span>
            <p className="font-display text-sm font-semibold text-text tabular-nums">
              {formatEuro(sumItems(data.liabilities))}
            </p>
          </div>
        </div>
      </div>

      {/* Expenses */}
      <div className="glass mt-4 rounded-3xl px-5 py-5">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium tracking-wider text-text-muted">EXPENSES</span>
            <p className="mt-0.5 text-sm text-text-muted">
              <span className="font-display text-lg font-bold text-text tabular-nums">
                {formatEuro(monthTotal)}
              </span>{' '}
              this month
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSheet('expense')}
            aria-label="Add expense"
            className="press grid h-8 w-8 place-items-center rounded-full border border-accent/40 bg-accent/10 text-accent transition-colors hover:bg-accent/20"
          >
            <Plus size={16} strokeWidth={2.5} />
          </button>
        </div>

        {recentExpenses.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">No expenses yet — tap + to add one.</p>
        ) : (
          <ul className="mt-3 flex flex-col">
            {recentExpenses.map((e, i) => (
              <li
                key={e.id}
                className={`flex items-center gap-3 py-2.5 ${i > 0 ? 'border-t border-border' : ''}`}
              >
                <div className="min-w-0 flex-1">
                  <span className="inline-flex items-center gap-2">
                    <span className="rounded-full bg-fill px-2.5 py-0.5 text-xs font-medium text-text">
                      {e.category}
                    </span>
                    {e.note && <span className="truncate text-sm text-text-muted">{e.note}</span>}
                  </span>
                  <p className="mt-0.5 text-xs text-text-muted">{formatDate(e.date)}</p>
                </div>
                <span className="font-display text-sm font-semibold text-text tabular-nums">
                  {formatEuro(e.amount, 2)}
                </span>
                <button
                  type="button"
                  onClick={() => deleteExpense(e.id)}
                  aria-label="Delete expense"
                  className="press grid h-7 w-7 shrink-0 place-items-center rounded-full text-text-muted transition-colors hover:bg-rose/10 hover:text-rose"
                >
                  <Trash2 size={14} strokeWidth={2} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Spending by category */}
      <div className="glass mt-4 rounded-3xl px-5 py-5">
        <span className="text-[11px] font-medium tracking-wider text-text-muted">
          SPENDING BY CATEGORY · THIS MONTH
        </span>
        <CategoryBarChart data={byCategory} />
      </div>

      {/* Savings goal */}
      <div className="glass mt-4 rounded-3xl px-5 py-5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium tracking-wider text-text-muted">
            {goal.label.toUpperCase()}
          </span>
          <button
            type="button"
            onClick={() => setSheet('savings')}
            aria-label="Edit savings goal"
            className="press grid h-8 w-8 place-items-center rounded-full border border-border bg-fill text-text-muted hover:text-text"
          >
            <Pencil size={14} strokeWidth={2} />
          </button>
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="num-glow font-display text-3xl font-bold text-text tabular-nums">
            {formatEuro(goal.current)}
          </span>
          <span className="text-sm text-text-muted">/ {formatEuro(goal.target)}</span>
        </div>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-fill">
          <div className="h-full rounded-full bg-accent" style={{ width: `${goalPct}%` }} />
        </div>
        <span className="mt-2 block text-sm text-text-muted">{goalPct}% of goal</span>
      </div>

      {/* Sheets */}
      {sheet === 'networth' && (
        <NetWorthSheet
          assets={data.assets}
          liabilities={data.liabilities}
          onChange={(fields: { assets?: LineItem[]; liabilities?: LineItem[] }) => patch(fields)}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'expense' && (
        <ExpenseSheet
          categories={data.categories}
          onAdd={addExpense}
          onCategories={(categories) => patch({ categories })}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'savings' && (
        <SavingsGoalSheet
          goal={goal}
          onSave={(savingsGoal: SavingsGoal) => patch({ savingsGoal })}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  )
}
