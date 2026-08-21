/**
 * DomainSync registration for Finance (src/finance.ts's FinanceData: assets,
 * liabilities, expenses, categories, savingsGoal). All five live under ONE
 * frontend localStorage key (`atlas.finance`), so — same precedent as
 * deepWorkSync.ts — this is one domain spanning five D1 tables rather than
 * five separate synced domains, matching the frontend's own grouping. Never
 * locally pruned, so a push is a true full replace across all five tables.
 * See ../sync.ts for the generic push/pull/LWW mechanics this plugs into.
 */

import type { DomainSync } from "../sync.ts";

interface LineItemRow {
  id: string;
  label: string;
  amount: number;
}

export interface LineItemValue {
  id: string;
  label: string;
  amount: number;
}

interface ExpenseRow {
  id: string;
  amount: number;
  category: string;
  date: string;
  note: string | null;
}

export interface ExpenseValue {
  id: string;
  amount: number;
  category: string;
  date: string;
  note?: string;
}

interface CategoryRow {
  name: string;
}

interface SavingsGoalRow {
  label: string;
  target: number;
  current: number;
}

export interface SavingsGoalValue {
  label: string;
  target: number;
  current: number;
}

export interface FinanceDataValue {
  assets: LineItemValue[];
  liabilities: LineItemValue[];
  expenses: ExpenseValue[];
  categories: string[];
  savingsGoal: SavingsGoalValue;
}

const EMPTY_FINANCE: FinanceDataValue = {
  assets: [],
  liabilities: [],
  expenses: [],
  categories: [],
  savingsGoal: { label: "Savings", target: 5000, current: 0 },
};

function lineItemStmts(db: D1Database, table: string, items: LineItemValue[], now: number): D1PreparedStatement[] {
  return items.map((it) =>
    db.prepare(`INSERT OR REPLACE INTO ${table} (id, label, amount, updated_at) VALUES (?, ?, ?, ?)`).bind(
      it.id,
      it.label,
      it.amount,
      now,
    ),
  );
}

export const financeSync: DomainSync<FinanceDataValue> = {
  empty: EMPTY_FINANCE,
  apply(db, data) {
    const now = Date.now();
    const stmts: D1PreparedStatement[] = [
      db.prepare("DELETE FROM finance_assets"),
      db.prepare("DELETE FROM finance_liabilities"),
      db.prepare("DELETE FROM finance_expenses"),
      db.prepare("DELETE FROM finance_categories"),
      ...lineItemStmts(db, "finance_assets", data.assets, now),
      ...lineItemStmts(db, "finance_liabilities", data.liabilities, now),
    ];
    for (const e of data.expenses) {
      stmts.push(
        db
          .prepare(
            "INSERT OR REPLACE INTO finance_expenses (id, amount, category, date, note, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
          )
          .bind(e.id, e.amount, e.category, e.date, e.note ?? null, now),
      );
    }
    data.categories.forEach((name, sortOrder) => {
      stmts.push(
        db
          .prepare("INSERT OR REPLACE INTO finance_categories (name, sort_order, updated_at) VALUES (?, ?, ?)")
          .bind(name, sortOrder, now),
      );
    });
    stmts.push(
      db
        .prepare(
          "INSERT INTO finance_savings_goal (id, label, target, current, updated_at) VALUES (1, ?, ?, ?, ?) " +
            "ON CONFLICT(id) DO UPDATE SET label = excluded.label, target = excluded.target, " +
            "current = excluded.current, updated_at = excluded.updated_at",
        )
        .bind(data.savingsGoal.label, data.savingsGoal.target, data.savingsGoal.current, now),
    );
    return stmts;
  },
  async read(db) {
    const [assets, liabilities, expenses, categories, savingsGoal] = await Promise.all([
      db.prepare("SELECT id, label, amount FROM finance_assets ORDER BY label").all<LineItemRow>(),
      db.prepare("SELECT id, label, amount FROM finance_liabilities ORDER BY label").all<LineItemRow>(),
      db.prepare("SELECT * FROM finance_expenses ORDER BY date DESC").all<ExpenseRow>(),
      db.prepare("SELECT name FROM finance_categories ORDER BY sort_order").all<CategoryRow>(),
      db.prepare("SELECT label, target, current FROM finance_savings_goal WHERE id = 1").first<SavingsGoalRow>(),
    ]);
    return {
      assets: assets.results,
      liabilities: liabilities.results,
      expenses: expenses.results.map((e) => ({
        id: e.id,
        amount: e.amount,
        category: e.category,
        date: e.date,
        ...(e.note != null ? { note: e.note } : {}),
      })),
      categories: categories.results.map((c) => c.name),
      savingsGoal: savingsGoal ?? EMPTY_FINANCE.savingsGoal,
    };
  },
};

/** Registered under this exact name — must match the frontend's useSyncedStorage domain argument. */
export const FINANCE_SYNC_REGISTRY: Record<string, DomainSync<unknown>> = {
  finance: financeSync as DomainSync<unknown>,
};
