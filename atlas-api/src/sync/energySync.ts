/**
 * DomainSync registrations for the Energy feature area: caffeine doses
 * (src/caffeine.ts's CaffeineDose) and the intermittent-fasting timer
 * (src/fasting.ts's FastingState). See ../sync.ts for the generic
 * push/pull/LWW mechanics these plug into.
 */

import { field, cutoffDateISO, todayUTC, type DomainSync } from "../sync.ts";

/** Caffeine doses are locally pruned to this many days (same RAW_RETENTION_DAYS as meals/hydration — see dataRetention.ts on the frontend), so a push only replaces rows in this same window — see sync/nutritionSync.ts's comment for the full reasoning behind why that scoping matters. */
const RAW_RETENTION_DAYS = 7;

// --- Caffeine doses ---------------------------------------------------

interface CaffeineRow {
  id: string;
  drink: string;
  time: string;
  mg: number;
  ml: number | null;
  date: string;
}

export interface CaffeineDoseValue {
  id: string;
  drink: string;
  time: string;
  mg: number;
  ml?: number;
  date: string;
}

export const caffeineDosesSync: DomainSync<CaffeineDoseValue[]> = {
  empty: [],
  apply(db, doses) {
    const cutoff = cutoffDateISO(todayUTC(), RAW_RETENTION_DAYS);
    const stmts: D1PreparedStatement[] = [db.prepare("DELETE FROM caffeine_doses WHERE date >= ?").bind(cutoff)];
    for (const d of doses) {
      stmts.push(
        db
          .prepare(
            "INSERT OR REPLACE INTO caffeine_doses (id, drink, time, mg, ml, date, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
          )
          .bind(d.id, d.drink, d.time, d.mg, d.ml ?? null, d.date, Date.now()),
      );
    }
    return stmts;
  },
  async read(db) {
    const { results } = await db.prepare("SELECT * FROM caffeine_doses ORDER BY date, time").all<CaffeineRow>();
    return results.map(
      (r): CaffeineDoseValue => ({
        id: r.id,
        drink: r.drink,
        time: r.time,
        mg: r.mg,
        ...field("ml", r.ml),
        date: r.date,
      }),
    );
  },
};

// --- Fasting state (singleton) -----------------------------------------

interface FastingRow {
  active: number;
  start_ms: number | null;
  target_hours: number;
}

export interface FastingStateValue {
  active: boolean;
  startMs: number | null;
  targetHours: number;
}

/** Matches src/fasting.ts's DEFAULT_FASTING exactly. */
const EMPTY_FASTING: FastingStateValue = { active: false, startMs: null, targetHours: 16 };

export const fastingStateSync: DomainSync<FastingStateValue> = {
  empty: EMPTY_FASTING,
  apply(db, state) {
    return [
      db
        .prepare(
          "INSERT INTO fasting_state (id, active, start_ms, target_hours, updated_at) VALUES (1, ?, ?, ?, ?) " +
            "ON CONFLICT(id) DO UPDATE SET active = excluded.active, start_ms = excluded.start_ms, " +
            "target_hours = excluded.target_hours, updated_at = excluded.updated_at",
        )
        .bind(state.active ? 1 : 0, state.startMs, state.targetHours, Date.now()),
    ];
  },
  async read(db) {
    const row = await db
      .prepare("SELECT active, start_ms, target_hours FROM fasting_state WHERE id = 1")
      .first<FastingRow>();
    if (!row) return EMPTY_FASTING;
    return { active: row.active === 1, startMs: row.start_ms, targetHours: row.target_hours };
  },
};

/** Registered under these exact names — must match the frontend's useSyncedStorage domain arguments. */
export const ENERGY_SYNC_REGISTRY: Record<string, DomainSync<unknown>> = {
  caffeineDoses: caffeineDosesSync as DomainSync<unknown>,
  fastingState: fastingStateSync as DomainSync<unknown>,
};
