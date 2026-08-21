/**
 * DomainSync registrations for Settings: the preferences singleton
 * (src/settings.ts's Settings) and the profile avatar image. Both stored as
 * a whole-blob column, not per-field — a deliberate exception (see
 * migrations/0001_init.sql's comment on the `settings` table): Settings is
 * a flat preferences bag the frontend already merges over its own defaults
 * specifically so new fields can appear over time without a migration, and
 * a rigid column-per-preference schema would fight that exact pattern. This
 * file doesn't (and can't, cleanly — atlas-api and the frontend are
 * separate packages) validate the JSON's shape; it's opaque here the same
 * way it's opaque to the frontend's own "merge over defaults" logic. See
 * ../sync.ts for the generic push/pull/LWW mechanics these plug into.
 */

import type { DomainSync } from "../sync.ts";

interface SettingsRow {
  json: string;
}

export const settingsSync: DomainSync<Record<string, unknown> | null> = {
  empty: null,
  apply(db, settings) {
    if (!settings) return [db.prepare("DELETE FROM settings WHERE id = 1")];
    return [
      db
        .prepare(
          "INSERT INTO settings (id, json, updated_at) VALUES (1, ?, ?) " +
            "ON CONFLICT(id) DO UPDATE SET json = excluded.json, updated_at = excluded.updated_at",
        )
        .bind(JSON.stringify(settings), Date.now()),
    ];
  },
  async read(db) {
    const row = await db.prepare("SELECT json FROM settings WHERE id = 1").first<SettingsRow>();
    if (!row) return null;
    try {
      return JSON.parse(row.json) as Record<string, unknown>;
    } catch {
      return null;
    }
  },
};

interface AvatarRow {
  image_base64: string | null;
}

export const settingsAvatarSync: DomainSync<string | null> = {
  empty: null,
  apply(db, avatar) {
    return [
      db
        .prepare(
          "INSERT INTO settings_avatar (id, image_base64, updated_at) VALUES (1, ?, ?) " +
            "ON CONFLICT(id) DO UPDATE SET image_base64 = excluded.image_base64, updated_at = excluded.updated_at",
        )
        .bind(avatar, Date.now()),
    ];
  },
  async read(db) {
    const row = await db.prepare("SELECT image_base64 FROM settings_avatar WHERE id = 1").first<AvatarRow>();
    return row?.image_base64 ?? null;
  },
};

/** Registered under these exact names — must match the frontend's useSyncedStorage domain arguments. */
export const SETTINGS_SYNC_REGISTRY: Record<string, DomainSync<unknown>> = {
  settings: settingsSync as DomainSync<unknown>,
  settingsAvatar: settingsAvatarSync as DomainSync<unknown>,
};
