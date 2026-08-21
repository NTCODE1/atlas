/**
 * DomainSync registrations for Training: the exercise library, logged
 * workout sessions (with nested per-exercise sets), and VO2max entries —
 * src/workouts.ts's Exercise/WorkoutSession/SessionExercise/SetEntry and
 * src/vo2max.ts's Vo2MaxEntry. None of this is locally pruned (user-created
 * training history, kept forever — see workouts.ts), so every push here is
 * a true full replace. See ../sync.ts for the generic push/pull/LWW
 * mechanics these plug into.
 *
 * Note: watch-imported cardio (COROS/Apple Health, via useWatchWorkouts) is
 * NOT part of this file — that data already reaches D1 through the
 * health/workout ingest tables (health_days/workout_days), same as any
 * other Health Auto Export metric. Only manually-logged gym/cardio sets
 * (the stuff that only ever lived in this device's localStorage) needed a
 * new sync path.
 */

import type { DomainSync } from "../sync.ts";

// --- Exercise library -----------------------------------------------------

interface ExerciseRow {
  id: string;
  name: string;
  type: string;
  created_at: string;
}

export interface ExerciseValue {
  id: string;
  name: string;
  type: string;
  createdAt: string;
}

export const exercisesSync: DomainSync<ExerciseValue[]> = {
  empty: [],
  apply(db, exercises) {
    const stmts: D1PreparedStatement[] = [db.prepare("DELETE FROM exercises")];
    for (const e of exercises) {
      stmts.push(
        db
          .prepare("INSERT OR REPLACE INTO exercises (id, name, type, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
          .bind(e.id, e.name, e.type, e.createdAt, Date.now()),
      );
    }
    return stmts;
  },
  async read(db) {
    const { results } = await db.prepare("SELECT * FROM exercises ORDER BY created_at").all<ExerciseRow>();
    return results.map((r) => ({ id: r.id, name: r.name, type: r.type, createdAt: r.created_at }));
  },
};

// --- Workout sessions (nested: session -> exercises -> sets) --------------

interface SessionRow {
  id: string;
  date: string;
  started_at: string;
  duration_minutes: number | null;
}

interface SessionExerciseRow {
  id: string;
  session_id: string;
  exercise_id: string;
  exercise_name: string;
  exercise_type: string;
}

interface SetEntryRow {
  id: string;
  session_exercise_id: string;
  kind: string;
  reps: number | null;
  weight: number | null;
  weight_unit: string | null;
  distance_km: number | null;
  duration_minutes: number | null;
}

export interface SetEntryValue {
  kind: "gym" | "cardio";
  reps?: number;
  weight?: number;
  unit?: string;
  distanceKm?: number;
  durationMinutes?: number;
}

export interface SessionExerciseValue {
  id: string;
  exerciseId: string;
  exerciseName: string;
  exerciseType: string;
  sets: SetEntryValue[];
}

export interface WorkoutSessionValue {
  id: string;
  date: string;
  startedAt: string;
  durationMinutes: number | null;
  exercises: SessionExerciseValue[];
}

export const workoutSessionsSync: DomainSync<WorkoutSessionValue[]> = {
  empty: [],
  apply(db, sessions) {
    // Children before parents (FK constraints: set_entries -> session_exercises -> workout_sessions).
    const stmts: D1PreparedStatement[] = [
      db.prepare("DELETE FROM set_entries"),
      db.prepare("DELETE FROM session_exercises"),
      db.prepare("DELETE FROM workout_sessions"),
    ];
    const now = Date.now();
    for (const s of sessions) {
      stmts.push(
        db
          .prepare(
            "INSERT INTO workout_sessions (id, date, started_at, duration_minutes, updated_at) VALUES (?, ?, ?, ?, ?)",
          )
          .bind(s.id, s.date, s.startedAt, s.durationMinutes, now),
      );
      s.exercises.forEach((ex, exOrder) => {
        stmts.push(
          db
            .prepare(
              "INSERT INTO session_exercises (id, session_id, exercise_id, exercise_name, exercise_type, sort_order, updated_at) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?)",
            )
            .bind(ex.id, s.id, ex.exerciseId, ex.exerciseName, ex.exerciseType, exOrder, now),
        );
        ex.sets.forEach((set, setOrder) => {
          stmts.push(
            db
              .prepare(
                "INSERT INTO set_entries (id, session_exercise_id, kind, reps, weight, weight_unit, distance_km, duration_minutes, sort_order, updated_at) " +
                  "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
              )
              .bind(
                `${ex.id}-set-${setOrder}`,
                ex.id,
                set.kind,
                set.reps ?? null,
                set.weight ?? null,
                set.unit ?? null,
                set.distanceKm ?? null,
                set.durationMinutes ?? null,
                setOrder,
                now,
              ),
          );
        });
      });
    }
    return stmts;
  },
  async read(db) {
    const [sessionsResult, exercisesResult, setsResult] = await Promise.all([
      db.prepare("SELECT * FROM workout_sessions ORDER BY date, started_at").all<SessionRow>(),
      db.prepare("SELECT * FROM session_exercises ORDER BY session_id, sort_order").all<SessionExerciseRow>(),
      db.prepare("SELECT * FROM set_entries ORDER BY session_exercise_id, sort_order").all<SetEntryRow>(),
    ]);

    const setsByExercise = new Map<string, SetEntryValue[]>();
    for (const r of setsResult.results) {
      const list = setsByExercise.get(r.session_exercise_id) ?? [];
      const set: SetEntryValue =
        r.kind === "cardio"
          ? { kind: "cardio", distanceKm: r.distance_km ?? undefined, durationMinutes: r.duration_minutes ?? undefined }
          : { kind: "gym", reps: r.reps ?? undefined, weight: r.weight ?? undefined, unit: r.weight_unit ?? undefined };
      list.push(set);
      setsByExercise.set(r.session_exercise_id, list);
    }

    const exercisesBySession = new Map<string, SessionExerciseValue[]>();
    for (const r of exercisesResult.results) {
      const list = exercisesBySession.get(r.session_id) ?? [];
      list.push({
        id: r.id,
        exerciseId: r.exercise_id,
        exerciseName: r.exercise_name,
        exerciseType: r.exercise_type,
        sets: setsByExercise.get(r.id) ?? [],
      });
      exercisesBySession.set(r.session_id, list);
    }

    return sessionsResult.results.map((r) => ({
      id: r.id,
      date: r.date,
      startedAt: r.started_at,
      durationMinutes: r.duration_minutes,
      exercises: exercisesBySession.get(r.id) ?? [],
    }));
  },
};

// --- VO2max entries ---------------------------------------------------

interface Vo2MaxRow {
  date: string;
  value: number;
}

export interface Vo2MaxEntryValue {
  date: string;
  value: number;
}

export const vo2maxEntriesSync: DomainSync<Vo2MaxEntryValue[]> = {
  empty: [],
  apply(db, entries) {
    const stmts: D1PreparedStatement[] = [db.prepare("DELETE FROM vo2max_entries")];
    for (const e of entries) {
      stmts.push(
        db
          .prepare("INSERT OR REPLACE INTO vo2max_entries (date, value, updated_at) VALUES (?, ?, ?)")
          .bind(e.date, e.value, Date.now()),
      );
    }
    return stmts;
  },
  async read(db) {
    const { results } = await db.prepare("SELECT date, value FROM vo2max_entries ORDER BY date").all<Vo2MaxRow>();
    return results.map((r) => ({ date: r.date, value: r.value }));
  },
};

/** Registered under these exact names — must match the frontend's useSyncedStorage domain arguments. */
export const TRAINING_SYNC_REGISTRY: Record<string, DomainSync<unknown>> = {
  exercises: exercisesSync as DomainSync<unknown>,
  workoutSessions: workoutSessionsSync as DomainSync<unknown>,
  vo2maxEntries: vo2maxEntriesSync as DomainSync<unknown>,
};
