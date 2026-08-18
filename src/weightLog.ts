import { kgToDisplay, type WeightUnit } from './settings'

export interface WeightEntry {
  /** YYYY-MM-DD — one entry per date, later logs overwrite. */
  date: string
  kg: number
}

export const sortEntries = (entries: WeightEntry[]): WeightEntry[] =>
  [...entries].sort((a, b) => a.date.localeCompare(b.date))

export const latestEntry = (entries: WeightEntry[]): WeightEntry | undefined =>
  sortEntries(entries)[entries.length - 1]

/** Chart points in the display unit, oldest first. */
export const entriesToPoints = (
  entries: WeightEntry[],
  unit: WeightUnit,
): { t: string; v: number }[] =>
  sortEntries(entries).map((e) => ({ t: e.date, v: kgToDisplay(e.kg, unit) }))
