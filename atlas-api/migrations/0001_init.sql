-- Atlas D1 schema — replaces browser-localStorage-only persistence with a
-- server-side home for every data domain the app tracks, so a phone and a
-- computer see the same data. See src/sync.ts for how these tables are read/
-- written, and the ATLAS repo's plan notes for the full design rationale.
--
-- Column names are snake_case (SQL convention); every table's fields map 1:1
-- onto the frontend TypeScript type named in its comment — verified against
-- that type's actual source file, not guessed. `updated_at` (INTEGER, epoch
-- ms) is sync bookkeeping only, separate from any app-level `created_at`
-- (TEXT, ISO — kept verbatim from the frontend type when one exists).
--
-- Tables marked "LIVE" are wired up to a real sync route in this phase
-- (src/sync/nutritionSync.ts, src/sync/journalSync.ts, and the health/workout
-- ingest handlers in index.ts). Tables marked "SCHEMA ONLY" exist so the
-- schema is complete now, but their hooks stay on useLocalStorage until a
-- follow-up phase — bringing one online is then just: write its toRows/
-- fromRows pair and swap the hook, no new table design needed.

-- --- Sync bookkeeping ---------------------------------------------------

-- One row per synced domain (see sync.ts's DOMAIN registry keys), tracking
-- when that domain's whole value last changed — the last-write-wins clock.
-- Not itself app data.
CREATE TABLE sync_meta (
  domain TEXT PRIMARY KEY,
  updated_at INTEGER NOT NULL
);

-- --- Health / workouts — LIVE -------------------------------------------
-- Verbatim HAE payload, same semantics as the KV keys they replace
-- (`health:{date}`/`health:latest`, `workout:{date}`/`workout:latest`) — see
-- index.ts's ingest handlers. Deliberately NOT parsed into columns here; see
-- the plan notes for why (client-local-day-anchoring in healthMapper.ts).

CREATE TABLE health_days (
  date TEXT PRIMARY KEY,        -- YYYY-MM-DD, UTC (matches existing todayKey())
  raw_json TEXT NOT NULL,       -- the HAE payload, exactly as received
  received_at INTEGER NOT NULL  -- epoch ms
);

CREATE TABLE workout_days (
  date TEXT PRIMARY KEY,
  raw_json TEXT NOT NULL,
  received_at INTEGER NOT NULL
);

-- --- Nutrition — LIVE -----------------------------------------------------
-- Meal (src/data.ts), Drink (src/hooks/useHydration.ts), Supplement
-- (src/hooks/useSupplements.ts), MacroTargets/GoalTargetEntry
-- (src/nutritionTargets.ts).

CREATE TABLE meals (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,        -- MealType: breakfast | lunch | dinner | snack
  name TEXT NOT NULL,
  kcal REAL,
  protein REAL,
  carbs REAL,
  fat REAL,
  micros_json TEXT,          -- JSON.stringify(MicroAmounts) — open-ended key set, see micros.ts
  date TEXT,                 -- YYYY-MM-DD; nullable, legacy seed entries have none
  created_at TEXT,           -- ISO timestamp; nullable, same reason
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_meals_date ON meals(date);

CREATE TABLE hydration_entries (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  ml REAL NOT NULL,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_hydration_date ON hydration_entries(date);

CREATE TABLE supplements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  micros_json TEXT,
  date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_supplements_date ON supplements(date);

-- Singleton (id is always 1) — MacroTargets is one current value, not a list.
CREATE TABLE nutrition_targets (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  kcal REAL NOT NULL,
  protein REAL NOT NULL,
  carbs REAL NOT NULL,
  fat REAL NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE goal_target_log (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  goal TEXT NOT NULL,
  kcal REAL NOT NULL,
  protein REAL NOT NULL,
  carbs REAL NOT NULL,
  fat REAL NOT NULL,
  reasoning TEXT,
  updated_at INTEGER NOT NULL
);

-- --- Journal — LIVE ---------------------------------------------------
-- DayRecordV2/DayEntryV2 (src/data.ts). journal_days holds the day-level icon
-- (DayRecordV2.icon); journal_entries holds each timed entry.

CREATE TABLE journal_days (
  date TEXT PRIMARY KEY,     -- YYYY-MM-DD
  icon TEXT,                 -- IconId, nullable
  updated_at INTEGER NOT NULL
);

CREATE TABLE journal_entries (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  time TEXT NOT NULL,        -- "HH:MM"
  end_time TEXT,             -- "HH:MM", nullable
  tag TEXT NOT NULL,
  kind TEXT,                 -- 'event' | 'task'; null = event
  done INTEGER,              -- boolean (0/1), tasks only
  important INTEGER,         -- boolean (0/1)
  text TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (date) REFERENCES journal_days(date)
);
CREATE INDEX idx_journal_entries_date ON journal_entries(date);

-- Singleton — today's chosen focus entry (src/hooks/useTodaysFocus.ts).
CREATE TABLE home_focus (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  date TEXT,
  entry_id TEXT,
  updated_at INTEGER NOT NULL
);

-- --- Energy — SCHEMA ONLY -----------------------------------------------
-- CaffeineDose (src/caffeine.ts), FastingState (src/fasting.ts).

CREATE TABLE caffeine_doses (
  id TEXT PRIMARY KEY,
  drink TEXT NOT NULL,
  time TEXT NOT NULL,        -- "HH:MM"
  mg REAL NOT NULL,
  ml REAL,
  date TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_caffeine_date ON caffeine_doses(date);

-- Singleton — one ongoing fast at a time.
CREATE TABLE fasting_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  active INTEGER NOT NULL,
  start_ms INTEGER,
  target_hours REAL NOT NULL,
  updated_at INTEGER NOT NULL
);

-- --- Training — SCHEMA ONLY -----------------------------------------------
-- Exercise, WorkoutSession, SessionExercise, SetEntry (src/workouts.ts),
-- Vo2MaxEntry (src/vo2max.ts).

CREATE TABLE exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,        -- ExerciseType: gym | cardio
  created_at TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE workout_sessions (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,        -- YYYY-MM-DD, derived from started_at
  started_at TEXT NOT NULL,  -- ISO datetime
  duration_minutes REAL,     -- null while in progress
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_workout_sessions_date ON workout_sessions(date);

-- One row per SessionExercise; sort_order preserves the logged sequence
-- (SessionExercise[] is an ordered array on the frontend, not a set).
CREATE TABLE session_exercises (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL,
  exercise_name TEXT NOT NULL,  -- name snapshot, survives library renames — see workouts.ts
  exercise_type TEXT NOT NULL,  -- type snapshot, same reason
  sort_order INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES workout_sessions(id)
);
CREATE INDEX idx_session_exercises_session ON session_exercises(session_id);

-- SetEntry is a discriminated union (GymSetEntry | CardioSetEntry) — one wide
-- table with the union's kind column and every possible field, nullable
-- outside its own kind, rather than two separate tables: sets are always
-- read/written as one ordered list per session_exercise, so keeping them in
-- one table preserves that ordering (sort_order) trivially.
CREATE TABLE set_entries (
  id TEXT PRIMARY KEY,
  session_exercise_id TEXT NOT NULL,
  kind TEXT NOT NULL,          -- gym | cardio
  reps INTEGER,                -- gym only
  weight REAL,                 -- gym only
  weight_unit TEXT,            -- gym only: kg | lb
  distance_km REAL,            -- cardio only
  duration_minutes REAL,       -- cardio only
  sort_order INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (session_exercise_id) REFERENCES session_exercises(id)
);
CREATE INDEX idx_set_entries_session_exercise ON set_entries(session_exercise_id);

-- One entry per date (later logs overwrite) — date is the natural key.
CREATE TABLE vo2max_entries (
  date TEXT PRIMARY KEY,
  value REAL NOT NULL,       -- ml/kg/min
  updated_at INTEGER NOT NULL
);

-- --- Habits — SCHEMA ONLY -------------------------------------------------
-- HabitDef, HabitChecks (src/habits.ts).

CREATE TABLE habit_defs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  preset INTEGER,            -- boolean (0/1), nullable
  updated_at INTEGER NOT NULL
);

-- HabitChecks is Record<date, habitId[]> on the frontend — flattened to one
-- row per (date, habit) pair, which is the actual unit of "a check".
CREATE TABLE habit_checks (
  date TEXT NOT NULL,
  habit_id TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (date, habit_id)
);

-- --- Motivation — SCHEMA ONLY ----------------------------------------------
-- MotivationItem (src/motivation.ts), Goal/Milestone (src/goals.ts).

CREATE TABLE motivation_items (
  id TEXT PRIMARY KEY,
  image_base64 TEXT NOT NULL,  -- downscaled JPEG, see src/image.ts — watch D1's
                                -- per-row size limit if this ever grows
  caption TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE goals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  icon TEXT NOT NULL,
  type TEXT NOT NULL,          -- GoalType: milestone | numeric
  current REAL,                -- numeric only
  target REAL,                 -- numeric only
  unit TEXT,                   -- numeric only
  unit_position TEXT,          -- numeric only: prefix | suffix
  link_finance_savings INTEGER,-- numeric only: boolean (0/1)
  deadline TEXT,                -- YYYY-MM-DD, nullable
  created_at TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Milestone[] (milestone-type goals only) — separate table, ordered list.
CREATE TABLE goal_milestones (
  id TEXT PRIMARY KEY,
  goal_id TEXT NOT NULL,
  label TEXT NOT NULL,
  done INTEGER NOT NULL,       -- boolean (0/1)
  sort_order INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (goal_id) REFERENCES goals(id)
);
CREATE INDEX idx_goal_milestones_goal ON goal_milestones(goal_id);

-- --- Finance — SCHEMA ONLY --------------------------------------------
-- FinanceData: LineItem, Expense, SavingsGoal (src/finance.ts).

CREATE TABLE finance_assets (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  amount REAL NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE finance_liabilities (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  amount REAL NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE finance_expenses (
  id TEXT PRIMARY KEY,
  amount REAL NOT NULL,
  category TEXT NOT NULL,
  date TEXT NOT NULL,
  note TEXT,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_finance_expenses_date ON finance_expenses(date);

-- Category names are the list itself (order matters for the picker UI).
CREATE TABLE finance_categories (
  name TEXT PRIMARY KEY,
  sort_order INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Singleton — one savings goal.
CREATE TABLE finance_savings_goal (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  label TEXT NOT NULL,
  target REAL NOT NULL,
  current REAL NOT NULL,
  updated_at INTEGER NOT NULL
);

-- --- Weight / Deep work / Settings — SCHEMA ONLY ------------------------
-- WeightEntry (src/weightLog.ts), DeepWorkState/DeepWorkSession
-- (src/deepWork.ts), Settings (src/settings.ts).

-- One entry per date (later logs overwrite) — date is the natural key.
CREATE TABLE weight_entries (
  date TEXT PRIMARY KEY,
  kg REAL NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE deep_work_sessions (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  minutes REAL NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_deep_work_sessions_date ON deep_work_sessions(date);

-- Singleton — the active-timer part of DeepWorkState (sessions are the table above).
CREATE TABLE deep_work_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  active INTEGER NOT NULL,     -- boolean (0/1)
  start_ms INTEGER,
  updated_at INTEGER NOT NULL
);

-- Singleton, whole-blob-by-design: Settings is a flat preferences bag the
-- frontend already merges over its own defaults specifically so new fields
-- can appear over time without a migration (see settings.ts) — a rigid
-- column-per-preference schema would fight that exact pattern.
CREATE TABLE settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE settings_avatar (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  image_base64 TEXT,
  updated_at INTEGER NOT NULL
);

-- --- Daily snapshot rollup — SCHEMA ONLY -----------------------------------
-- DailySnapshot (src/dailySnapshot.ts) — the readiness/sleep-baseline rollup.
-- A derived/computed cache (recomputable from health + local data), so lowest
-- priority to bring online — included for schema completeness.

CREATE TABLE daily_snapshots (
  date TEXT PRIMARY KEY,
  readiness REAL,
  sleep_score REAL,
  weight_kg REAL,
  body_fat_percentage REAL,
  bmi REAL,
  lean_body_mass_kg REAL,
  steps REAL,
  active_kcal REAL,
  hrv REAL,
  resting_hr REAL,
  caffeine_mg REAL,
  hydration_litres REAL,
  sleep_total_minutes REAL,
  sleep_deep_minutes REAL,
  sleep_rem_minutes REAL,
  sleep_awake_minutes REAL,
  bedtime_minutes REAL,
  training_load REAL,
  updated_at INTEGER NOT NULL
);

-- --- Assistant chat — SCHEMA ONLY, lowest priority -------------------------
-- ChatMessage (src/api/assistantAI.ts) is just {role, text} — no natural id,
-- so this table's own autoincrement rowid is the ordering key.

CREATE TABLE assistant_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL,          -- 'user' | 'assistant'
  text TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
