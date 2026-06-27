/**
 * Cosmetic iOS-style status bar.
 *
 * Shown in the browser preview to match the mockup. Hidden automatically when
 * the app is launched as an installed PWA (standalone), where the device's real
 * status bar takes over — see the `display-mode: standalone` rule in index.css.
 */
export default function StatusBar() {
  return (
    <div
      className="ios-status-bar flex items-center justify-between px-6 pt-3 pb-1 text-text select-none"
      style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
    >
      <span className="font-semibold text-[15px] tracking-tight">9:41</span>

      <div className="flex items-center gap-1.5">
        <CellularIcon />
        <WifiIcon />
        <BatteryIcon />
      </div>
    </div>
  )
}

function CellularIcon() {
  return (
    <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor" aria-hidden="true">
      <rect x="0" y="8" width="3" height="4" rx="1" />
      <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
      <rect x="10" y="3" width="3" height="9" rx="1" />
      <rect x="15" y="0.5" width="3" height="11.5" rx="1" />
    </svg>
  )
}

function WifiIcon() {
  return (
    <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor" aria-hidden="true">
      <path d="M8.5 2.2c2.7 0 5.2 1 7.1 2.8a.9.9 0 0 1-1.3 1.3 8.2 8.2 0 0 0-11.6 0A.9.9 0 1 1 1.4 5 10 10 0 0 1 8.5 2.2Z" />
      <path d="M8.5 5.7c1.7 0 3.3.7 4.6 1.9a.9.9 0 0 1-1.3 1.3 4.7 4.7 0 0 0-6.6 0 .9.9 0 1 1-1.3-1.3 6.5 6.5 0 0 1 4.6-1.9Z" />
      <circle cx="8.5" cy="10.4" r="1.4" />
    </svg>
  )
}

function BatteryIcon() {
  return (
    <svg width="26" height="13" viewBox="0 0 26 13" fill="none" aria-hidden="true">
      <rect
        x="0.5"
        y="0.5"
        width="22"
        height="12"
        rx="3.5"
        stroke="currentColor"
        strokeOpacity="0.4"
      />
      <rect x="2" y="2" width="18" height="9" rx="2" fill="currentColor" />
      <path
        d="M24 4.5v4c.9-.4.9-3.6 0-4Z"
        fill="currentColor"
        fillOpacity="0.4"
      />
    </svg>
  )
}
