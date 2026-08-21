/**
 * DomainSync registrations for Journal: the per-month calendar store and
 * today's "focus" pick. Field names/shapes copied 1:1 from
 * src/data.ts's DayRecordV2/DayEntryV2 and src/hooks/useJournalMonth.ts/
 * useTodaysFocus.ts. See ../sync.ts for the generic push/pull/LWW mechanics.
 *
 * Journal doesn't fit the flat `/api/sync/:domain` shape the other domains
 * use: its frontend localStorage key carries year+monthIndex
 * (`atlas.journal.v2.<year>-<monthIndex>`), so its route is
 * `/api/sync/journal/:yearMonth` (e.g. "2026-7") instead — a deliberate,
 * self-contained special case. Under the hood it's still the exact same
 * generic pushDomain/pullDomain/LWW machinery from ../sync.ts, just keyed by
 * a domain string computed per month ("journal:2026-7") rather than a fixed
 * name, and its D1 rows (journal_days/journal_entries) store real
 * `YYYY-MM-DD` dates reconstructed from year/monthIndex + day-of-month.
 */

import {
  field,
  pushDomain,
  pullDomain,
  readSyncPushBody,
  type DomainSync,
  type JsonResponder,
  type SyncEnv,
} from "../sync.ts";

export interface DayEntryValue {
  id: string;
  text: string;
  time: string;
  endTime?: string;
  tag: string;
  kind?: "event" | "task";
  done?: boolean;
  important?: boolean;
}

export interface DayRecordValue {
  icon?: string;
  entries: DayEntryValue[];
}

/** day-of-month -> record, matching JournalMonthV2 exactly. */
export type JournalMonthValue = Record<number, DayRecordValue>;

interface JournalDayRow {
  date: string;
  icon: string | null;
}

interface JournalEntryRow {
  id: string;
  date: string;
  time: string;
  end_time: string | null;
  tag: string;
  kind: string | null;
  done: number | null;
  important: number | null;
  text: string;
}

const dateFor = (year: number, monthIndex: number, day: number): string =>
  `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

/** One DomainSync per (year, monthIndex) — built fresh per request, not registered ahead of time, since there's no fixed set of months. */
export function journalMonthSync(year: number, monthIndex: number): DomainSync<JournalMonthValue> {
  return {
    empty: {},
    apply(db, month) {
      const days = Object.keys(month).map(Number);
      const now = Date.now();
      const monthPrefix = `${year}-${String(monthIndex + 1).padStart(2, "0")}-`;

      // This month's days/entries are fully replaced — journal is never
      // locally pruned (see useJournalMonth.ts), so the pushed month is the
      // whole month's truth, INCLUDING a day that's now missing entirely
      // (the user cleared it) or an empty push (the whole month was
      // cleared) — so the delete is scoped by month prefix, not by which
      // days the incoming push happens to mention (an empty `{}` push must
      // still clear a previously-synced month, not silently no-op). Only
      // THIS month's rows are touched; other months live under their own
      // domain key and are untouched here.
      const stmts: D1PreparedStatement[] = [
        db.prepare("DELETE FROM journal_entries WHERE date LIKE ?").bind(`${monthPrefix}%`),
        db.prepare("DELETE FROM journal_days WHERE date LIKE ?").bind(`${monthPrefix}%`),
      ];

      for (const day of days) {
        const date = dateFor(year, monthIndex, day);
        const record = month[day];
        stmts.push(
          db
            .prepare("INSERT OR REPLACE INTO journal_days (date, icon, updated_at) VALUES (?, ?, ?)")
            .bind(date, record.icon ?? null, now),
        );
        for (const entry of record.entries) {
          stmts.push(
            db
              .prepare(
                "INSERT OR REPLACE INTO journal_entries " +
                  "(id, date, time, end_time, tag, kind, done, important, text, updated_at) " +
                  "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
              )
              .bind(
                entry.id,
                date,
                entry.time,
                entry.endTime ?? null,
                entry.tag,
                entry.kind ?? null,
                entry.done == null ? null : entry.done ? 1 : 0,
                entry.important == null ? null : entry.important ? 1 : 0,
                entry.text,
                now,
              ),
          );
        }
      }
      return stmts;
    },
    async read(db) {
      const monthPrefix = `${year}-${String(monthIndex + 1).padStart(2, "0")}-`;
      const [{ results: dayRows }, { results: entryRows }] = await Promise.all([
        db.prepare("SELECT * FROM journal_days WHERE date LIKE ?").bind(`${monthPrefix}%`).all<JournalDayRow>(),
        db.prepare("SELECT * FROM journal_entries WHERE date LIKE ? ORDER BY time").bind(`${monthPrefix}%`).all<JournalEntryRow>(),
      ]);

      const month: JournalMonthValue = {};
      for (const row of dayRows) {
        const day = Number(row.date.slice(-2));
        month[day] = { ...field("icon", row.icon), entries: [] };
      }
      for (const row of entryRows) {
        const day = Number(row.date.slice(-2));
        if (!month[day]) month[day] = { entries: [] };
        month[day].entries.push({
          id: row.id,
          text: row.text,
          time: row.time,
          ...field("endTime", row.end_time),
          tag: row.tag,
          ...field("kind", row.kind as "event" | "task" | null),
          ...field("done", row.done == null ? null : row.done === 1),
          ...field("important", row.important == null ? null : row.important === 1),
        });
      }
      return month;
    },
  };
}

const JOURNAL_MONTH_PATH = /^\/api\/sync\/journal\/(\d{4})-(\d{1,2})$/;

/**
 * `GET`/`POST /api/sync/journal/:yearMonth` (e.g. "2026-7", monthIndex
 * 0-based to match the frontend's own `atlas.journal.v2.<year>-<monthIndex>`
 * key). Returns null for any other path, same chaining convention as
 * handleFlatSyncRoute.
 */
export async function handleJournalSyncRoute(
  request: Request,
  env: SyncEnv,
  pathname: string,
  respond: JsonResponder,
): Promise<Response | null> {
  const match = pathname.match(JOURNAL_MONTH_PATH);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]);
  const domain = `journal:${year}-${monthIndex}`;
  const sync = journalMonthSync(year, monthIndex);

  if (request.method === "GET") {
    const { value, updatedAt } = await pullDomain(env, domain, sync);
    return respond(JSON.stringify({ value, updatedAt }), 200);
  }

  if (request.method === "POST") {
    const parsed = await readSyncPushBody<JournalMonthValue>(request);
    if (!parsed.ok) return respond(JSON.stringify({ error: parsed.error }), parsed.status);
    const result = await pushDomain(env, domain, sync, parsed.value, parsed.updatedAt);
    return respond(JSON.stringify(result), 200);
  }

  return respond(JSON.stringify({ error: "method not allowed" }), 405);
}

// --- Home focus (src/hooks/useTodaysFocus.ts's FocusSelection, singleton) -

interface FocusRow {
  date: string | null;
  entry_id: string | null;
}

export interface FocusSelectionValue {
  date: string;
  entryId: string | null;
}

export const homeFocusSync: DomainSync<FocusSelectionValue> = {
  empty: { date: "", entryId: null },
  apply(db, selection) {
    return [
      db
        .prepare(
          "INSERT INTO home_focus (id, date, entry_id, updated_at) VALUES (1, ?, ?, ?) " +
            "ON CONFLICT(id) DO UPDATE SET date = excluded.date, entry_id = excluded.entry_id, updated_at = excluded.updated_at",
        )
        .bind(selection.date, selection.entryId, Date.now()),
    ];
  },
  async read(db) {
    const row = await db.prepare("SELECT date, entry_id FROM home_focus WHERE id = 1").first<FocusRow>();
    if (!row) return { date: "", entryId: null };
    return { date: row.date ?? "", entryId: row.entry_id };
  },
};

/** Registered under this exact name — must match useSyncedStorage's domain argument for atlas.home.focus. */
export const JOURNAL_SYNC_REGISTRY: Record<string, DomainSync<unknown>> = {
  homeFocus: homeFocusSync as DomainSync<unknown>,
};
