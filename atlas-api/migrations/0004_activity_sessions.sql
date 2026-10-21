-- Sport sessions that aren't gym sets: skiing, trampoline, cardio
-- (ActivitySession in src/activities.ts). Flat — one row per session, no
-- nested exercises/sets like workout_sessions — because what matters for
-- these is how long and how hard (session RPE), not lifted volume.
-- Watch-imported workouts stay in workout_days; this is the hand-logged side.

CREATE TABLE activity_sessions (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,              -- YYYY-MM-DD, local
  kind TEXT NOT NULL,              -- ActivityKind: ski | trampoline | cardio
  focus TEXT,                      -- e.g. "Slopestyle", "Bike intervals"; nullable
  start_time TEXT,                 -- "HH:MM", nullable
  duration_minutes REAL NOT NULL,
  rpe INTEGER,                     -- session RPE 1–10, nullable
  runs INTEGER,                    -- ski only: runs/laps, nullable
  distance_km REAL,                -- cardio only, nullable
  notes TEXT,                      -- tricks landed, what to work on
  created_at TEXT NOT NULL,        -- ISO
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_activity_sessions_date ON activity_sessions(date);
