/**
 * DomainSync registrations for the Nutrition feature area: meals, hydration,
 * supplements, macro targets, and the goal-setting history log. Each mirrors
 * exactly one frontend localStorage key (see the type/hook cited per
 * section) — field names and shapes are copied 1:1 from those sources, not
 * guessed. See ../sync.ts for the generic push/pull/LWW mechanics these
 * registrations plug into.
 */

import { toJsonColumn, fromJsonColumn, field, cutoffDateISO, todayUTC, type DomainSync } from "../sync.ts";

/**
 * meals/hydration are locally pruned to this many days (dataRetention.ts's
 * RAW_RETENTION_DAYS on the frontend) — so a push only ever needs to, and
 * only ever should, replace rows dated within the same window. Older D1
 * history the client's own 7-day-trimmed array never contained is left
 * completely untouched, so the server safely accumulates full history even
 * though the local cache stays small. See ../sync.ts's module doc for why
 * this scoping matters (a naive full-replace would silently delete it).
 */
const RAW_RETENTION_DAYS = 7;

// --- Meals (src/data.ts's Meal, src/hooks/useMeals.ts) ---------------------

interface MealRow {
  id: string;
  type: string;
  name: string;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  micros_json: string | null;
  date: string | null;
  created_at: string | null;
}

export interface MealValue {
  id: string;
  type: string;
  name: string;
  kcal?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  micros?: Record<string, number>;
  date?: string;
  createdAt?: string;
}

export const mealsSync: DomainSync<MealValue[]> = {
  empty: [],
  apply(db, meals) {
    const cutoff = cutoffDateISO(todayUTC(), RAW_RETENTION_DAYS);
    const stmts: D1PreparedStatement[] = [
      // Dated meals: windowed replace, as described above.
      db.prepare("DELETE FROM meals WHERE date IS NOT NULL AND date >= ?").bind(cutoff),
    ];
    // Undated (legacy) meals never age out of the window comparison above,
    // so they'd otherwise never be deletable at all — but they're also never
    // locally pruned (pruneByDate keeps them "as-is", same as here), so any
    // that are genuinely gone from this push were removed by the user (the
    // trash icon), not by retention. Replace them by full diff instead: drop
    // whichever undated ids this push no longer mentions.
    const undatedIds = meals.filter((m) => m.date == null).map((m) => m.id);
    if (undatedIds.length > 0) {
      const placeholders = undatedIds.map(() => "?").join(",");
      stmts.push(db.prepare(`DELETE FROM meals WHERE date IS NULL AND id NOT IN (${placeholders})`).bind(...undatedIds));
    } else {
      stmts.push(db.prepare("DELETE FROM meals WHERE date IS NULL"));
    }
    for (const m of meals) {
      stmts.push(
        db
          .prepare(
            "INSERT OR REPLACE INTO meals (id, type, name, kcal, protein, carbs, fat, micros_json, date, created_at, updated_at) " +
              "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          )
          .bind(
            m.id,
            m.type,
            m.name,
            m.kcal ?? null,
            m.protein ?? null,
            m.carbs ?? null,
            m.fat ?? null,
            toJsonColumn(m.micros),
            m.date ?? null,
            m.createdAt ?? null,
            Date.now(),
          ),
      );
    }
    return stmts;
  },
  async read(db) {
    const { results } = await db.prepare("SELECT * FROM meals ORDER BY date, created_at").all<MealRow>();
    return results.map(
      (r): MealValue => ({
        id: r.id,
        type: r.type,
        name: r.name,
        ...field("kcal", r.kcal),
        ...field("protein", r.protein),
        ...field("carbs", r.carbs),
        ...field("fat", r.fat),
        ...field("micros", fromJsonColumn<Record<string, number>>(r.micros_json)),
        ...field("date", r.date),
        ...field("createdAt", r.created_at),
      }),
    );
  },
};

// --- Hydration (src/hooks/useHydration.ts's Drink) -------------------------

interface DrinkRow {
  id: string;
  label: string;
  ml: number;
  date: string;
  created_at: string;
}

export interface DrinkValue {
  id: string;
  label: string;
  ml: number;
  date: string;
  createdAt: string;
}

export const hydrationSync: DomainSync<DrinkValue[]> = {
  empty: [],
  apply(db, drinks) {
    const cutoff = cutoffDateISO(todayUTC(), RAW_RETENTION_DAYS);
    const stmts: D1PreparedStatement[] = [db.prepare("DELETE FROM hydration_entries WHERE date >= ?").bind(cutoff)];
    for (const d of drinks) {
      stmts.push(
        db
          .prepare(
            "INSERT OR REPLACE INTO hydration_entries (id, label, ml, date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
          )
          .bind(d.id, d.label, d.ml, d.date, d.createdAt, Date.now()),
      );
    }
    return stmts;
  },
  async read(db) {
    const { results } = await db
      .prepare("SELECT * FROM hydration_entries ORDER BY date, created_at")
      .all<DrinkRow>();
    return results.map((r) => ({ id: r.id, label: r.label, ml: r.ml, date: r.date, createdAt: r.created_at }));
  },
};

// --- Supplements (src/hooks/useSupplements.ts's Supplement) ---------------
// Never locally pruned (see useSupplements.ts — no pruneByDate call), so a
// push here is a true full replace, unlike meals/hydration above.

interface SupplementRow {
  id: string;
  name: string;
  dosage: string;
  micros_json: string | null;
  date: string;
  created_at: string;
}

export interface SupplementValue {
  id: string;
  name: string;
  dosage: string;
  micros?: Record<string, number>;
  date: string;
  createdAt: string;
}

export const supplementsSync: DomainSync<SupplementValue[]> = {
  empty: [],
  apply(db, supplements) {
    const stmts: D1PreparedStatement[] = [db.prepare("DELETE FROM supplements")];
    for (const s of supplements) {
      stmts.push(
        db
          .prepare(
            "INSERT OR REPLACE INTO supplements (id, name, dosage, micros_json, date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          )
          .bind(s.id, s.name, s.dosage, toJsonColumn(s.micros), s.date, s.createdAt, Date.now()),
      );
    }
    return stmts;
  },
  async read(db) {
    const { results } = await db.prepare("SELECT * FROM supplements ORDER BY date, created_at").all<SupplementRow>();
    return results.map(
      (r): SupplementValue => ({
        id: r.id,
        name: r.name,
        dosage: r.dosage,
        ...field("micros", fromJsonColumn<Record<string, number>>(r.micros_json)),
        date: r.date,
        createdAt: r.created_at,
      }),
    );
  },
};

// --- Nutrition targets (src/nutritionTargets.ts's MacroTargets, singleton) -

interface TargetsRow {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MacroTargetsValue {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const nutritionTargetsSync: DomainSync<MacroTargetsValue | null> = {
  empty: null,
  apply(db, targets) {
    if (!targets) return [db.prepare("DELETE FROM nutrition_targets WHERE id = 1")];
    return [
      db
        .prepare(
          "INSERT INTO nutrition_targets (id, kcal, protein, carbs, fat, updated_at) VALUES (1, ?, ?, ?, ?, ?) " +
            "ON CONFLICT(id) DO UPDATE SET kcal = excluded.kcal, protein = excluded.protein, " +
            "carbs = excluded.carbs, fat = excluded.fat, updated_at = excluded.updated_at",
        )
        .bind(targets.kcal, targets.protein, targets.carbs, targets.fat, Date.now()),
    ];
  },
  async read(db) {
    const row = await db.prepare("SELECT kcal, protein, carbs, fat FROM nutrition_targets WHERE id = 1").first<TargetsRow>();
    return row ?? null;
  },
};

// --- Goal target history log (src/nutritionTargets.ts's GoalTargetEntry) --
// Never locally pruned — full replace, same as supplements.

interface GoalLogRow {
  id: string;
  date: string;
  goal: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  reasoning: string | null;
}

export interface GoalTargetEntryValue {
  id: string;
  date: string;
  goal: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  reasoning?: string;
}

export const goalTargetLogSync: DomainSync<GoalTargetEntryValue[]> = {
  empty: [],
  apply(db, entries) {
    const stmts: D1PreparedStatement[] = [db.prepare("DELETE FROM goal_target_log")];
    for (const e of entries) {
      stmts.push(
        db
          .prepare(
            "INSERT OR REPLACE INTO goal_target_log (id, date, goal, kcal, protein, carbs, fat, reasoning, updated_at) " +
              "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          )
          .bind(e.id, e.date, e.goal, e.kcal, e.protein, e.carbs, e.fat, e.reasoning ?? null, Date.now()),
      );
    }
    return stmts;
  },
  async read(db) {
    const { results } = await db.prepare("SELECT * FROM goal_target_log ORDER BY date").all<GoalLogRow>();
    return results.map(
      (r): GoalTargetEntryValue => ({
        id: r.id,
        date: r.date,
        goal: r.goal,
        kcal: r.kcal,
        protein: r.protein,
        carbs: r.carbs,
        fat: r.fat,
        ...field("reasoning", r.reasoning),
      }),
    );
  },
};

/** Registered under these exact names — must match src/hooks/useSyncedStorage.ts's domain argument at each Phase-1 call site. */
export const NUTRITION_SYNC_REGISTRY: Record<string, DomainSync<unknown>> = {
  meals: mealsSync as DomainSync<unknown>,
  hydration: hydrationSync as DomainSync<unknown>,
  supplements: supplementsSync as DomainSync<unknown>,
  nutritionTargets: nutritionTargetsSync as DomainSync<unknown>,
  goalTargetLog: goalTargetLogSync as DomainSync<unknown>,
};
