import { createPortal } from 'react-dom'
import { CalendarClock, Flame, Moon, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Alert, AlertKind } from '../../notificationCenter'

interface NotificationPanelProps {
  alerts: Alert[]
  onDismiss: (id: string) => void
  onClose: () => void
}

const KIND_ICON: Record<AlertKind, LucideIcon> = {
  event: CalendarClock,
  sleep: Moon,
  habit: Flame,
}

/**
 * Header bell dropdown listing active in-app alerts. Portaled to <body> like
 * Sheet, then anchored top-right within the phone-width column so it escapes
 * the glass header's containing block. Tap the scrim to close.
 */
export default function NotificationPanel({ alerts, onDismiss, onClose }: NotificationPanelProps) {
  if (typeof document === 'undefined') return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-center" onClick={onClose}>
      <div className="relative w-full max-w-[420px]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div
          className="backdrop-enter glass-strong absolute right-3 top-2 w-[min(20rem,90vw)] overflow-hidden rounded-3xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 pt-4">
            <h2 className="font-display text-lg font-bold text-text">Notifications</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="press grid h-8 w-8 place-items-center rounded-full bg-fill text-text-muted hover:text-text"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>

          <div className="max-h-[60dvh] overflow-y-auto p-3">
            {alerts.length === 0 ? (
              <p className="py-8 text-center text-sm text-text-muted">No alerts</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {alerts.map((alert) => {
                  const Icon = KIND_ICON[alert.kind]
                  return (
                    <li
                      key={alert.id}
                      className="flex items-start gap-3 rounded-2xl bg-fill p-3"
                    >
                      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-fill-2 text-text">
                        <Icon size={16} strokeWidth={2} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-text">{alert.title}</p>
                        <p className="text-xs leading-relaxed text-text-muted">{alert.body}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDismiss(alert.id)}
                        aria-label="Dismiss"
                        className="press grid h-7 w-7 shrink-0 place-items-center rounded-full text-text-muted hover:bg-fill-2 hover:text-text"
                      >
                        <X size={14} strokeWidth={2.5} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
