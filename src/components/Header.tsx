import { Bell } from 'lucide-react'
import { useHealth } from '../api/healthContext'

/**
 * App header: accent triangular ATLAS logo + wordmark on the left, a notification
 * bell with an unread dot on the right.
 */
export default function Header() {
  const { isLive } = useHealth()

  return (
    <header className="flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-2.5">
        <AtlasMark />
        <AtlasWordmark />
        {/* Sync indicator: green when data is live from the API, grey on fallback. */}
        <span
          title={isLive ? 'Live data' : 'Using saved data'}
          aria-label={isLive ? 'Live data' : 'Using saved data'}
          className={`h-1.5 w-1.5 rounded-full transition-colors ${
            isLive ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)]' : 'bg-white/25'
          }`}
        />
      </div>

      <button
        type="button"
        aria-label="Notifications"
        className="relative grid h-10 w-10 place-items-center rounded-full text-text transition-colors hover:bg-surface"
      >
        <Bell size={22} strokeWidth={1.75} />
        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent ring-2 ring-bg" />
      </button>
    </header>
  )
}

/**
 * The Atlas mark — a glowing geometric mountain logo: a accent-glow center peak
 * flanked by two snow-white side mountains (the brand logo).
 */
function AtlasMark() {
  return (
    <svg
      width="36"
      height="24"
      viewBox="0 0 1024 684"
      fill="none"
      aria-hidden="true"
      className="translate-y-[6px]"
    >
      <defs>
        <radialGradient
          id="atlasGlow"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(512 130) rotate(90) scale(175 155)"
        >
          <stop offset="0" stopColor="#8FB2FF" stopOpacity="0.85" />
          <stop offset="0.38" stopColor="#5B82FF" stopOpacity="0.42" />
          <stop offset="0.68" stopColor="#2E5BFF" stopOpacity="0.16" />
          <stop offset="1" stopColor="#2E5BFF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="atlasMainPeak" x1="512" y1="47" x2="512" y2="392" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ECFFF9" />
          <stop offset="0.46" stopColor="#DFFBF3" />
          <stop offset="1" stopColor="#C7EEE8" />
        </linearGradient>
        <linearGradient id="atlasSnow" x1="145" y1="245" x2="882" y2="417" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.45" stopColor="#F2F5F7" />
          <stop offset="1" stopColor="#DDE5EA" />
        </linearGradient>
        <linearGradient id="atlasInner" x1="512" y1="286" x2="512" y2="442" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F7FBFD" />
          <stop offset="1" stopColor="#D8E1E6" />
        </linearGradient>
        <filter
          id="atlasSoftGlow"
          x="-60%"
          y="-80%"
          width="220%"
          height="260%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur stdDeviation="28" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="0 0 0 0 0.30
                    0 0 0 0 0.45
                    0 0 0 0 1.0
                    0 0 0 0.68 0"
            result="accentBlur"
          />
          <feMerge>
            <feMergeNode in="accentBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <ellipse cx="512" cy="130" rx="175" ry="155" fill="url(#atlasGlow)" />
      <path d="M513 48L760 393H675L513 153L351 393H266L513 48Z" fill="url(#atlasMainPeak)" filter="url(#atlasSoftGlow)" />
      <path d="M137 393L272 243L368 393H137Z" fill="url(#atlasSnow)" />
      <path d="M656 393L752 243L887 393H656Z" fill="url(#atlasSnow)" />
      <path d="M381 393L513 283L643 393L513 348L381 393Z" fill="url(#atlasInner)" />
      <path d="M513 283L643 393L513 348Z" fill="#C6D1D7" opacity="0.82" />
    </svg>
  )
}

/** The ATLAS wordmark — a traced vector logotype that inherits the text color. */
function AtlasWordmark() {
  return (
    <svg
      viewBox="58 69 1003 119"
      role="img"
      aria-label="ATLAS"
      className="h-4 w-auto text-text"
      fill="currentColor"
    >
      <g fillRule="evenodd">
        <path d="M 113 74 L 63 183 L 80 182 L 122 90 L 126 92 L 167 183 L 184 183 L 134 74 Z" />
        <path d="M 281 74 L 282 89 L 325 90 L 325 182 L 341 183 L 342 90 L 385 89 L 386 75 Z" />
        <path d="M 507 74 L 507 183 L 596 183 L 596 168 L 525 169 L 523 167 L 523 75 Z" />
        <path d="M 768 74 L 719 183 L 735 183 L 778 90 L 781 91 L 822 183 L 839 183 L 789 74 Z" />
        <path d="M 971 81 L 963 91 L 960 104 L 965 123 L 973 130 L 983 134 L 1029 137 L 1038 144 L 1040 157 L 1034 166 L 1027 169 L 967 168 L 962 180 L 981 183 L 1027 183 L 1043 178 L 1051 170 L 1056 155 L 1055 144 L 1050 133 L 1043 127 L 1030 122 L 986 119 L 977 111 L 977 99 L 985 90 L 992 88 L 1045 90 L 1049 77 L 1033 74 L 987 74 Z" />
      </g>
    </svg>
  )
}
