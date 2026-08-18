// --- Finance ----------------------------------------------------------------
//
// A manual money tracker: net worth (assets − liabilities), an expense log with
// editable categories, current-month spending by category, and one savings
// goal. All entries are user-entered — no bank linking. Pure module.

export interface LineItem {
  id: string
  label: string
  amount: number
}

export interface Expense {
  id: string
  amount: number
  category: string
  /** YYYY-MM-DD */
  date: string
  note?: string
}

export interface SavingsGoal {
  label: string
  target: number
  current: number
}

export interface FinanceData {
  assets: LineItem[]
  liabilities: LineItem[]
  expenses: Expense[]
  categories: string[]
  savingsGoal: SavingsGoal
}

export const DEFAULT_FINANCE: FinanceData = {
  assets: [],
  liabilities: [],
  expenses: [],
  categories: ['Food', 'Transport', 'Housing', 'Health', 'Fun', 'Other'],
  savingsGoal: { label: 'Savings', target: 5000, current: 0 },
}

export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `f-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export const sumItems = (items: LineItem[]): number =>
  items.reduce((sum, i) => sum + (Number.isFinite(i.amount) ? i.amount : 0), 0)

export const netWorth = (data: FinanceData): number =>
  sumItems(data.assets) - sumItems(data.liabilities)

export const todayISO = (d = new Date()): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Expenses within the same calendar month as `ref`. */
export function monthExpenses(data: FinanceData, ref = new Date()): Expense[] {
  const prefix = `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`
  return data.expenses.filter((e) => e.date.startsWith(prefix))
}

/** Totals per category, highest first. */
export function spendingByCategory(expenses: Expense[]): { category: string; total: number }[] {
  const totals = new Map<string, number>()
  for (const e of expenses) totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount)
  return [...totals.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)
}

const euro = new Intl.NumberFormat('fi-FI', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})
const euro2 = new Intl.NumberFormat('fi-FI', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export const formatEuro = (n: number, decimals: 0 | 2 = 0): string =>
  (decimals === 2 ? euro2 : euro).format(Number.isFinite(n) ? n : 0)
