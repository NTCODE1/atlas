import { Bell } from 'lucide-react'

/**
 * App header: mint triangular ATLAS logo + wordmark on the left, a notification
 * bell with an unread dot on the right.
 */
export default function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-2.5">
        <AtlasMark />
        <span className="font-display text-xl font-semibold tracking-[0.22em] text-text">
          ATLAS
        </span>
      </div>

      <button
        type="button"
        aria-label="Notifications"
        className="relative grid h-10 w-10 place-items-center rounded-full text-text transition-colors hover:bg-surface"
      >
        <Bell size={22} strokeWidth={1.75} />
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-mint ring-2 ring-bg" />
      </button>
    </header>
  )
}

/** The triangular Atlas mark — a mint mountain/"A" glyph. */
function AtlasMark() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
      className="text-mint"
    >
      {/* Outer triangle */}
      <path
        d="M14 3.5 25 23.5H3L14 3.5Z"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinejoin="round"
      />
      {/* Inner peak detail */}
      <path
        d="M14 11 19 20H9l5-9Z"
        fill="currentColor"
        fillOpacity="0.9"
      />
    </svg>
  )
}
