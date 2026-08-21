/**
 * DomainSync registration for Deep work (src/deepWork.ts's DeepWorkState —
 * active-timer fields plus completed sessions). Both live under ONE
 * frontend localStorage key (`atlas.deepwork`), so this is one domain
 * spanning two D1 tables (deep_work_state singleton + deep_work_sessions
 * list) rather than two separate synced domains — matches the frontend's
 * own grouping instead of splitting it artificially. See ../sync.ts for the
 * generic push/pull/LWW mechanics this plugs into.
 */

import type { DomainSync } from "../sync.ts";

interface SessionRow {
  id: string;
  date: string;
  minutes: number;
}

interface StateRow {
  active: number;
  start_ms: number | null;
}

export interface DeepWorkSessionValue {
  id: string;
  date: string;
  minutes: number;
}

export interface DeepWorkStateValue {
  active: boolean;
  startMs: number | null;
  sessions: DeepWorkSessionValue[];
}

/** Matches src/deepWork.ts's DEFAULT_DEEP_WORK exactly. */
const EMPTY_DEEP_WORK: DeepWorkStateValue = { active: false, startMs: null, sessions: [] };

export const deepWorkSync: DomainSync<DeepWorkStateValue> = {
  empty: EMPTY_DEEP_WORK,
  apply(db, state) {
    const stmts: D1PreparedStatement[] = [
      db
        .prepare(
          "INSERT INTO deep_work_state (id, active, start_ms, updated_at) VALUES (1, ?, ?, ?) " +
            "ON CONFLICT(id) DO UPDATE SET active = excluded.active, start_ms = excluded.start_ms, updated_at = excluded.updated_at",
        )
        .bind(state.active ? 1 : 0, state.startMs, Date.now()),
      // Sessions are never locally pruned (an append-only completed-sessions
      // log — see deepWork.ts), so a full replace is correct here.
      db.prepare("DELETE FROM deep_work_sessions"),
    ];
    for (const s of state.sessions) {
      stmts.push(
        db
          .prepare("INSERT OR REPLACE INTO deep_work_sessions (id, date, minutes, updated_at) VALUES (?, ?, ?, ?)")
          .bind(s.id, s.date, s.minutes, Date.now()),
      );
    }
    return stmts;
  },
  async read(db) {
    const [stateRow, sessionsResult] = await Promise.all([
      db.prepare("SELECT active, start_ms FROM deep_work_state WHERE id = 1").first<StateRow>(),
      db.prepare("SELECT id, date, minutes FROM deep_work_sessions ORDER BY date").all<SessionRow>(),
    ]);
    return {
      active: stateRow?.active === 1,
      startMs: stateRow?.start_ms ?? null,
      sessions: sessionsResult.results.map((r) => ({ id: r.id, date: r.date, minutes: r.minutes })),
    };
  },
};

/** Registered under this exact name — must match the frontend's useSyncedStorage domain argument. */
export const DEEP_WORK_SYNC_REGISTRY: Record<string, DomainSync<unknown>> = {
  deepWork: deepWorkSync as DomainSync<unknown>,
};
