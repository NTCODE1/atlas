/**
 * Generic sync dispatcher for /api/sync/* — see the plan notes ("Add
 * Cloudflare D1 so Atlas data syncs across devices") for the full design.
 * In short: every synced domain corresponds to exactly one browser
 * localStorage key on the frontend (see src/hooks/useSyncedStorage.ts). The
 * client pushes/pulls that key's WHOLE current value as one JSON blob, each
 * push tagged with the client's `Date.now()`; whichever push is newest wins
 * (last-write-wins) — the same model /api/health and /api/workouts already
 * use (whole-payload overwrite per day), just generalized to arbitrary
 * domains and, unlike KV, backed by real typed D1 columns per domain instead
 * of an opaque blob (see migrations/0001_init.sql).
 *
 * A "domain" (meals, hydration, journal's per-month store, ...) is
 * registered as a DomainSync<T>: how to turn its JSON value into D1 rows
 * (`apply`) and back (`read`). Domain-specific registrations live in
 * ./sync/nutritionSync.ts and ./sync/journalSync.ts — this file only knows
 * the generic push/pull/LWW/routing mechanics, not what any field means.
 */

export interface SyncEnv {
  DB: D1Database;
}

/** How one synced domain turns its JSON value into D1 rows and back. */
export interface DomainSync<T> {
  /**
   * Statements that replace this domain's stored rows to match `value`. Runs
   * as part of one atomic batch alongside the sync_meta bookkeeping update
   * (see pushDomain) — never partially applied.
   */
  apply(db: D1Database, value: T): D1PreparedStatement[];
  /** Reconstruct the current value from D1. */
  read(db: D1Database): Promise<T>;
  /** Value to report when nothing has ever been synced for this domain. */
  empty: T;
}

/** JSON.stringify a value for a TEXT column, or null for a genuinely absent optional value. */
export function toJsonColumn(value: unknown): string | null {
  return value === undefined || value === null ? null : JSON.stringify(value);
}

/** Parse a JSON TEXT column back, or undefined if the column was null (matches the frontend's optional-field convention — see e.g. Meal.micros?). */
export function fromJsonColumn<T>(raw: unknown): T | undefined {
  if (typeof raw !== "string") return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

/**
 * `{ [key]: value }` when `value` isn't null/undefined, else `{}` — spread
 * into an object literal being rebuilt from a D1 row so an optional frontend
 * field (e.g. `Meal.kcal?: number`) comes back omitted, matching its
 * original shape, rather than explicitly `null`. Used throughout
 * ./sync/*.ts's `read()` implementations.
 */
export function field<K extends string, V>(key: K, value: V | null | undefined): Partial<Record<K, V>> {
  return value == null ? {} : ({ [key]: value } as Partial<Record<K, V>>);
}

/**
 * `YYYY-MM-DD` `windowDays` before `today` — the server-side equivalent of
 * dailySnapshot.ts's cutoffDateISO, used only to decide the boundary for a
 * *windowed* domain's replace-scope (see nutritionSync.ts's meals/hydration
 * comment). The server has no notion of the client's local "today" the way
 * healthMapper.ts carefully does for actual health-metric anchoring, but a
 * few hours of UTC-vs-local skew is immaterial for a ~7-day retention
 * boundary, unlike it would be for "which exact day is this reading."
 */
export function cutoffDateISO(today: string, windowDays: number): string {
  const cutoff = new Date(`${today}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - windowDays);
  return cutoff.toISOString().slice(0, 10);
}

/** Today, UTC — same convention as index.ts's todayKey(). */
export function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface SyncPushResult {
  /** False when the incoming push was stale (an equal-or-older updatedAt already stored) and was therefore ignored. */
  accepted: boolean;
}

/**
 * Applies an incoming push for `domain` if it's newer than what's stored
 * (last-write-wins by client-supplied `updatedAt`, epoch ms). A stale push
 * is silently ignored, not an error — the pushing device just adopts the
 * server's value on its next pull instead.
 */
export async function pushDomain<T>(
  env: SyncEnv,
  domain: string,
  sync: DomainSync<T>,
  value: T,
  updatedAt: number,
): Promise<SyncPushResult> {
  const existing = await env.DB.prepare("SELECT updated_at FROM sync_meta WHERE domain = ?")
    .bind(domain)
    .first<{ updated_at: number }>();
  if (existing && existing.updated_at >= updatedAt) {
    return { accepted: false };
  }

  const statements = sync.apply(env.DB, value);
  statements.push(
    env.DB.prepare(
      "INSERT INTO sync_meta (domain, updated_at) VALUES (?, ?) " +
        "ON CONFLICT(domain) DO UPDATE SET updated_at = excluded.updated_at",
    ).bind(domain, updatedAt),
  );
  await env.DB.batch(statements);
  return { accepted: true };
}

export interface SyncPullResult<T> {
  value: T;
  /** 0 when nothing has ever been synced for this domain. */
  updatedAt: number;
}

/** Reads a domain's current value plus its last-write timestamp. */
export async function pullDomain<T>(env: SyncEnv, domain: string, sync: DomainSync<T>): Promise<SyncPullResult<T>> {
  const meta = await env.DB.prepare("SELECT updated_at FROM sync_meta WHERE domain = ?")
    .bind(domain)
    .first<{ updated_at: number }>();
  if (!meta) return { value: sync.empty, updatedAt: 0 };
  const value = await sync.read(env.DB);
  return { value, updatedAt: meta.updated_at };
}

/** Request body shape both push routes below accept — kept intentionally uniform across every domain. */
interface SyncPushBody {
  value: unknown;
  updatedAt: number;
}

function isSyncPushBody(v: unknown): v is SyncPushBody {
  if (v === null || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return "value" in o && typeof o.updatedAt === "number";
}

/** Max accepted push body size (stringified chars) — generous for a personal daily log, small enough to bound abuse. */
const SYNC_BODY_MAX = 200_000;

export type JsonResponder = (rawJson: string, status: number) => Response;

export type ReadPushBodyResult<T> =
  | { ok: true; value: T; updatedAt: number }
  | { ok: false; error: string; status: number };

/**
 * Parses and validates a POST /api/sync/... body (`{ value, updatedAt }`) —
 * shared by handleFlatSyncRoute below and journalSync.ts's own per-month
 * route, since the body shape is identical everywhere even though the two
 * route styles (`/api/sync/:domain` vs. `/api/sync/journal/:yearMonth`)
 * differ.
 */
export async function readSyncPushBody<T>(request: Request): Promise<ReadPushBodyResult<T>> {
  let body: string;
  try {
    body = await request.text();
  } catch {
    return { ok: false, error: "invalid body", status: 400 };
  }
  if (body.length > SYNC_BODY_MAX) {
    return { ok: false, error: `payload too large, max ${SYNC_BODY_MAX} chars`, status: 400 };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { ok: false, error: "invalid JSON body", status: 400 };
  }
  if (!isSyncPushBody(parsed)) {
    return { ok: false, error: "expected { value, updatedAt }", status: 400 };
  }
  return { ok: true, value: parsed.value as T, updatedAt: parsed.updatedAt };
}

/**
 * Handles one flat-keyed domain (`/api/sync/:domain`). Returns null for a
 * request this function doesn't own, so callers can chain it with other
 * route handlers (e.g. journalSync's per-month routes) the same way
 * index.ts already chains handleAuthRoutes.
 */
export async function handleFlatSyncRoute<T>(
  request: Request,
  env: SyncEnv,
  domain: string,
  registry: Record<string, DomainSync<unknown>>,
  respond: JsonResponder,
): Promise<Response | null> {
  const sync = registry[domain] as DomainSync<T> | undefined;
  if (!sync) return null;

  if (request.method === "GET") {
    const { value, updatedAt } = await pullDomain(env, domain, sync);
    return respond(JSON.stringify({ value, updatedAt }), 200);
  }

  if (request.method === "POST") {
    const parsed = await readSyncPushBody<T>(request);
    if (!parsed.ok) return respond(JSON.stringify({ error: parsed.error }), parsed.status);
    const result = await pushDomain(env, domain, sync, parsed.value, parsed.updatedAt);
    return respond(JSON.stringify(result), 200);
  }

  return respond(JSON.stringify({ error: "method not allowed" }), 405);
}
