// --- Nutrition: intermittent-fasting timer ----------------------------------
//
// A simple manual fast: start now, watch elapsed time climb toward an editable
// target, stop when done. Pure module (no React), persisted by FastingCard.

export interface FastingState {
  active: boolean
  /** Epoch ms the current fast began, or null when not fasting. */
  startMs: number | null
  /** Target fast length in hours. */
  targetHours: number
}

export const DEFAULT_FASTING: FastingState = {
  active: false,
  startMs: null,
  targetHours: 16,
}

/** Common intermittent-fasting windows (fasting hours). */
export const FASTING_PRESETS = [12, 14, 16, 18] as const

const MS_PER_HOUR = 3_600_000

/** Hours elapsed in the current fast (0 when inactive). */
export function elapsedHours(state: FastingState, now = Date.now()): number {
  if (!state.active || state.startMs == null) return 0
  return Math.max(0, (now - state.startMs) / MS_PER_HOUR)
}

/** Progress toward the target, 0–1 (capped at 1). */
export function fastingProgress(state: FastingState, now = Date.now()): number {
  if (state.targetHours <= 0) return 0
  return Math.min(1, elapsedHours(state, now) / state.targetHours)
}

/** Epoch ms the target is reached, or null when inactive. */
export function projectedEnd(state: FastingState): number | null {
  if (!state.active || state.startMs == null) return null
  return state.startMs + state.targetHours * MS_PER_HOUR
}

/** Elapsed time as "H:MM" (hours:minutes). */
export function formatElapsed(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.floor((hours - h) * 60)
  return `${h}:${String(m).padStart(2, '0')}`
}

/** Epoch ms → local "HH:MM". */
export function clockFromMs(ms: number): string {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
