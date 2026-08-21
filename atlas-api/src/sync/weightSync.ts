/**
 * DomainSync registration for the weight log (src/weightLog.ts's WeightEntry).
 * One entry per date (a later log for the same date overwrites, both locally
 * and here) — date is the natural primary key, no separate id. Never locally
 * pruned, so a push is a true full replace. See ../sync.ts for the generic
 * push/pull/LWW mechanics this plugs into.
 */

import type { DomainSync } from "../sync.ts";

interface WeightRow {
  date: string;
  kg: number;
}

export interface WeightEntryValue {
  date: string;
  kg: number;
}

export const weightEntriesSync: DomainSync<WeightEntryValue[]> = {
  empty: [],
  apply(db, entries) {
    const stmts: D1PreparedStatement[] = [db.prepare("DELETE FROM weight_entries")];
    for (const e of entries) {
      stmts.push(
        db
          .prepare("INSERT OR REPLACE INTO weight_entries (date, kg, updated_at) VALUES (?, ?, ?)")
          .bind(e.date, e.kg, Date.now()),
      );
    }
    return stmts;
  },
  async read(db) {
    const { results } = await db.prepare("SELECT date, kg FROM weight_entries ORDER BY date").all<WeightRow>();
    return results.map((r) => ({ date: r.date, kg: r.kg }));
  },
};

/** Registered under this exact name — must match the frontend's useSyncedStorage domain argument. */
export const WEIGHT_SYNC_REGISTRY: Record<string, DomainSync<unknown>> = {
  weightEntries: weightEntriesSync as DomainSync<unknown>,
};
