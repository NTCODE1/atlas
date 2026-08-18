import type { DayRecordV2 } from '../../data'
import type { IconId } from '../../icons'

/**
 * Thin adapter over the shared icon registry (src/icons.ts) — the legacy
 * per-activity icon map lives there now, with the same first six ids.
 */

/** Icon a day should show: its chosen icon, or a document if it has entries. */
export function effectiveIcon(record?: DayRecordV2): IconId | undefined {
  if (!record) return undefined
  if (record.icon) return record.icon
  if (record.entries.length > 0) return 'journal'
  return undefined
}
