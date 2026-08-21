/**
 * DomainSync registrations for Habits: habit definitions and daily check-ins
 * (src/habits.ts's HabitDef / HabitChecks). See ../sync.ts for the generic
 * push/pull/LWW mechanics these plug into.
 */

import { field, type DomainSync } from "../sync.ts";

// --- Habit definitions ---------------------------------------------------

interface HabitDefRow {
  id: string;
  name: string;
  icon: string;
  preset: number | null;
}

export interface HabitDefValue {
  id: string;
  name: string;
  icon: string;
  preset?: boolean;
}

export const habitDefsSync: DomainSync<HabitDefValue[]> = {
  empty: [],
  apply(db, defs) {
    const stmts: D1PreparedStatement[] = [db.prepare("DELETE FROM habit_defs")];
    for (const h of defs) {
      stmts.push(
        db
          .prepare("INSERT OR REPLACE INTO habit_defs (id, name, icon, preset, updated_at) VALUES (?, ?, ?, ?, ?)")
          .bind(h.id, h.name, h.icon, h.preset == null ? null : h.preset ? 1 : 0, Date.now()),
      );
    }
    return stmts;
  },
  async read(db) {
    const { results } = await db.prepare("SELECT * FROM habit_defs").all<HabitDefRow>();
    return results.map(
      (r): HabitDefValue => ({
        id: r.id,
        name: r.name,
        icon: r.icon,
        ...field("preset", r.preset == null ? null : r.preset === 1),
      }),
    );
  },
};

// --- Habit checks (Record<date, habitId[]>, flattened to (date, habit_id) rows) ---

interface HabitCheckRow {
  date: string;
  habit_id: string;
}

/** date -> checked habit ids, matching HabitChecks exactly. */
export type HabitChecksValue = Record<string, string[]>;

export const habitChecksSync: DomainSync<HabitChecksValue> = {
  empty: {},
  apply(db, checks) {
    const stmts: D1PreparedStatement[] = [db.prepare("DELETE FROM habit_checks")];
    for (const [date, habitIds] of Object.entries(checks)) {
      for (const habitId of habitIds) {
        stmts.push(
          db
            .prepare("INSERT OR REPLACE INTO habit_checks (date, habit_id, updated_at) VALUES (?, ?, ?)")
            .bind(date, habitId, Date.now()),
        );
      }
    }
    return stmts;
  },
  async read(db) {
    // Checks are an unordered set per day (isChecked only ever does an
    // .includes() lookup — see habits.ts) — ordered here just for a
    // deterministic read, not because push order means anything.
    const { results } = await db.prepare("SELECT date, habit_id FROM habit_checks ORDER BY date, habit_id").all<HabitCheckRow>();
    const checks: HabitChecksValue = {};
    for (const r of results) {
      const list = checks[r.date] ?? (checks[r.date] = []);
      list.push(r.habit_id);
    }
    return checks;
  },
};

/** Registered under these exact names — must match the frontend's useSyncedStorage domain arguments. */
export const HABITS_SYNC_REGISTRY: Record<string, DomainSync<unknown>> = {
  habitDefs: habitDefsSync as DomainSync<unknown>,
  habitChecks: habitChecksSync as DomainSync<unknown>,
};
