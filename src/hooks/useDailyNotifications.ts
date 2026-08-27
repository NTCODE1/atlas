import { useEffect } from 'react'
import { useHealth } from '../api/healthContext'
import { useReadiness } from './useReadiness'
import { useSettings } from '../settingsContext'
import { notificationsGranted, notifyOnce } from '../notifications'
import { readJournalDay } from './useJournalMonth'
import { dateISO } from '../habits'

/**
 * Fires the daily notification checks once the app is open (Apex has no push
 * server): important journal entries for today/tomorrow, and a low sleep
 * score. Deduped per entry / per day via the atlas.notify.log key.
 */
export function useDailyNotifications(): void {
  const { settings } = useSettings()
  const { loading } = useHealth()
  const { sleepScore } = useReadiness()

  const enabled = settings.notificationsEnabled && notificationsGranted()

  // Important calendar entries — checked once per app load.
  useEffect(() => {
    if (!enabled) return
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    for (const day of [today, tomorrow]) {
      const { record, dateISO: iso } = readJournalDay(day)
      if (!record) continue
      const isToday = iso === dateISO(today)
      for (const entry of record.entries) {
        if (!entry.important) continue
        notifyOnce(
          `journal-${iso}-${entry.id}`,
          isToday ? 'Important today' : 'Important tomorrow',
          `${entry.time} — ${entry.text.slice(0, 80)}`,
        )
      }
    }
  }, [enabled])

  // Low sleep score — once the health fetch has settled, once per day.
  useEffect(() => {
    if (!enabled || loading) return
    if (sleepScore >= settings.sleepAlertThreshold) return
    notifyOnce(
      `sleep-low-${dateISO()}`,
      'Low sleep score',
      `Last night scored ${sleepScore}. Favour recovery today.`,
    )
  }, [enabled, loading, sleepScore, settings.sleepAlertThreshold])
}
