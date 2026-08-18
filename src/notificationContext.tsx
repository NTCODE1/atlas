import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useLocalStorage } from './hooks/useLocalStorage'
import { useSettings } from './settingsContext'
import { useHealth } from './api/healthContext'
import { useReadiness } from './hooks/useReadiness'
import { dateISO, HABIT_PRESETS, type HabitChecks, type HabitDef } from './habits'
import {
  buildEventAlerts,
  buildHabitAlerts,
  buildSleepAlert,
  dismiss as dismissInLog,
  isDismissed,
  type Alert,
  type DismissLog,
} from './notificationCenter'

interface NotificationContextValue {
  /** Active, non-dismissed alerts for today. */
  alerts: Alert[]
  /** Active alerts the user hasn't opened the panel to see yet. */
  unreadCount: number
  dismiss: (id: string) => void
  markAllSeen: () => void
}

const NotificationContext = createContext<NotificationContextValue | null>(null)

/** Non-reactive read — habits are owned by HabitTracker, we only read them. */
function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw !== null ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

/**
 * Single owner of the in-app notification state. Recomputes the active alert
 * list from journal / sleep / habits on app open (and when the health fetch
 * settles), and persists dismissed + seen state to localStorage so alerts
 * don't reappear the same day.
 */
export function NotificationProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings()
  const { loading } = useHealth()
  const { sleepScore } = useReadiness()

  const [dismissed, setDismissed] = useLocalStorage<DismissLog>('atlas.notify.banner.dismissed', {})
  const [seen, setSeen] = useLocalStorage<string[]>('atlas.notify.banner.seen', [])

  const alerts = useMemo<Alert[]>(() => {
    const iso = dateISO()
    const out: Alert[] = [...buildEventAlerts()]

    if (!loading) {
      const sleep = buildSleepAlert(sleepScore, settings.sleepAlertThreshold)
      if (sleep) out.push(sleep)
    }

    if (settings.habitRemindersEnabled) {
      const defs = readJSON<HabitDef[]>('atlas.habits.defs', HABIT_PRESETS)
      const checks = readJSON<HabitChecks>('atlas.habits.checks', {})
      out.push(...buildHabitAlerts(defs, checks))
    }

    return out.filter((a) => !isDismissed(dismissed, a.id, iso))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sleepScore, loading, settings.sleepAlertThreshold, settings.habitRemindersEnabled, dismissed])

  const unreadCount = useMemo(
    () => alerts.filter((a) => !seen.includes(a.id)).length,
    [alerts, seen],
  )

  const value = useMemo<NotificationContextValue>(
    () => ({
      alerts,
      unreadCount,
      dismiss: (id) => setDismissed((log) => dismissInLog(log, id)),
      // Mark every currently-active alert as seen. Storing exactly the active
      // ids also prunes yesterday's ids, keeping the list from growing.
      markAllSeen: () => setSeen(alerts.map((a) => a.id)),
    }),
    [alerts, unreadCount, setDismissed, setSeen],
  )

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider')
  return ctx
}
