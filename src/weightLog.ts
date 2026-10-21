import { kgToDisplay, type WeightUnit } from './settings'
import { cutoffDateISO } from './dailySnapshot'

export interface WeightEntry {
  /** YYYY-MM-DD — one entry per date, later logs overwrite. */
  date: string
  kg: number
}

export const sortEntries = (entries: WeightEntry[]): WeightEntry[] =>
  [...entries].sort((a, b) => a.date.localeCompare(b.date))

export const latestEntry = (entries: WeightEntry[]): WeightEntry | undefined =>
  sortEntries(entries)[entries.length - 1]

/**
 * One weight per day from both sources, oldest first: the manual log wins
 * (a deliberate morning weigh-in), else the scale reading Apple Health synced
 * into that day's snapshot.
 */
export function dailyWeights(entries: WeightEntry[], scaleByDate: Record<string, number | undefined>): WeightEntry[] {
  const byDate = new Map<string, number>()
  for (const [date, kg] of Object.entries(scaleByDate)) if (kg != null) byDate.set(date, kg)
  for (const e of entries) byDate.set(e.date, e.kg)
  return sortEntries([...byDate].map(([date, kg]) => ({ date, kg })))
}

/** Mean of the weights in the 7 days ending `endDate` (inclusive), or null if none. */
export function sevenDayAverage(series: WeightEntry[], endDate: string): number | null {
  const from = cutoffDateISO(endDate, 6)
  const inWindow = series.filter((e) => e.date >= from && e.date <= endDate)
  if (inWindow.length === 0) return null
  return inWindow.reduce((sum, e) => sum + e.kg, 0) / inWindow.length
}

/** Chart points in the display unit, oldest first. */
export const entriesToPoints = (
  entries: WeightEntry[],
  unit: WeightUnit,
): { t: string; v: number }[] =>
  sortEntries(entries).map((e) => ({ t: e.date, v: kgToDisplay(e.kg, unit) }))
