/**
 * Browser notifications. Apex has no push server, so these fire while the
 * app is open (or installed as a PWA with the service worker registered).
 */

const LOG_KEY = 'atlas.notify.log'
const LOG_MAX_AGE_DAYS = 7

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied'
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

export function notificationsGranted(): boolean {
  return notificationsSupported() && Notification.permission === 'granted'
}

/**
 * Show a notification, preferring the service-worker path — `new Notification()`
 * throws in page context on Android Chrome, and vite-plugin-pwa registers a
 * service worker for us. Never throws outward.
 */
export async function showNotification(title: string, body: string): Promise<void> {
  if (!notificationsGranted()) return
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) {
      await reg.showNotification(title, { body, icon: '/pwa-192x192.png' })
      return
    }
  } catch {
    // fall through to the page-context constructor
  }
  try {
    new Notification(title, { body, icon: '/pwa-192x192.png' })
  } catch (err) {
    console.warn('notification failed', err)
  }
}

type NotifyLog = Record<string, string>

function readLog(): NotifyLog {
  try {
    const raw = window.localStorage.getItem(LOG_KEY)
    return raw ? (JSON.parse(raw) as NotifyLog) : {}
  } catch {
    return {}
  }
}

/**
 * Fire a notification at most once per dedupe key. The check-and-write is
 * synchronous (raw localStorage, not the React hook) so StrictMode's doubled
 * effects can't double-fire; the key is recorded before the notification is
 * shown. Entries older than a week are pruned on each call.
 */
export function notifyOnce(key: string, title: string, body: string): void {
  if (!notificationsGranted()) return
  const log = readLog()
  if (key in log) return

  const today = new Date()
  const cutoff = new Date(today)
  cutoff.setDate(cutoff.getDate() - LOG_MAX_AGE_DAYS)
  const pruned: NotifyLog = {}
  for (const [k, dateISO] of Object.entries(log)) {
    if (new Date(`${dateISO}T00:00:00`) >= cutoff) pruned[k] = dateISO
  }
  pruned[key] = today.toISOString().slice(0, 10)

  try {
    window.localStorage.setItem(LOG_KEY, JSON.stringify(pruned))
  } catch {
    // storage blocked — still show the notification this once
  }
  void showNotification(title, body)
}
