import { Bed, Dumbbell, FileText, Footprints, Moon, Waves } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { DayRecord, JournalActivity } from '../../data'

/** Selectable activities, in editor display order. */
export const ACTIVITIES: JournalActivity[] = ['run', 'strength', 'swim', 'rest', 'sleep', 'journal']

export const ACTIVITY_LABEL: Record<JournalActivity, string> = {
  run: 'Run',
  strength: 'Strength',
  swim: 'Swim',
  rest: 'Rest',
  sleep: 'Sleep',
  journal: 'Journal',
}

export const activityIcon: Record<JournalActivity, LucideIcon> = {
  run: Footprints,
  strength: Dumbbell,
  swim: Waves,
  rest: Moon,
  sleep: Bed,
  journal: FileText,
}

/** Icon a day should show: its activity, or a document if it only has an entry. */
export function effectiveActivity(record?: DayRecord): JournalActivity | undefined {
  if (!record) return undefined
  if (record.activity) return record.activity
  if (record.entry) return 'journal'
  return undefined
}
