// --- Apex Plan v1 (21 Oct 2026) ---------------------------------------------
//
// Niila's health/training plan, as constants. Pure module — the Body screen's
// phase card and the Today checklist read from here. Hard-coded for now: the
// plan is one person's, and moving it into synced settings can wait until a
// value actually needs editing in-app.

export const PLAN = {
  cutStart: '2026-10-26',
  cutEnd: '2026-12-13',
  competitionStart: '2026-12-14',
  cutWeeks: 7,
  /** Target loss band, kg/week (positive = loss). */
  rateLowKg: 0.3,
  rateHighKg: 0.5,
  proteinG: 160,
  /** Calories count as hit within ± this of the day's target. */
  kcalToleranceKcal: 100,
  focusBlockMinutes: 90,
  phoneOut: '21:45',
  lightsOut: '22:30',
  /** Lights-out counts as kept up to this many minutes late. */
  lightsOutGraceMin: 15,
} as const

export type PhaseId = 'pre' | 'cut' | 'competition'

export interface PhaseInfo {
  id: PhaseId
  label: string
  /** e.g. "week 1 of 7" or "starts Mon 26 Oct". */
  detail: string
  goal: string
}

const DAY_MS = 86_400_000
const dayNumber = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / DAY_MS

/** Which plan phase `today` (YYYY-MM-DD) falls in. */
export function currentPhase(today: string): PhaseInfo {
  if (today < PLAN.cutStart) {
    const start = new Date(`${PLAN.cutStart}T00:00:00`).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
    return { id: 'pre', label: 'Cut', detail: `starts ${start}`, goal: 'Weigh in daily to set your baseline.' }
  }
  if (today <= PLAN.cutEnd) {
    const week = Math.min(PLAN.cutWeeks, Math.floor((dayNumber(today) - dayNumber(PLAN.cutStart)) / 7) + 1)
    return {
      id: 'cut',
      label: 'Cut',
      detail: `week ${week} of ${PLAN.cutWeeks}`,
      goal: 'Lose fat, keep strength and power.',
    }
  }
  return { id: 'competition', label: 'Competition', detail: 'maintenance', goal: 'Hold weight, perform.' }
}
