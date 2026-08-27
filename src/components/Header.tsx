import { useState } from 'react'
import { Bell, User } from 'lucide-react'
import { useHealth } from '../api/healthContext'
import { useSettings } from '../settingsContext'
import { useNotifications } from '../notificationContext'
import NotificationPanel from './notifications/NotificationPanel'

interface HeaderProps {
  onOpenSettings: () => void
}

/**
 * App header: the Apex summit mark + wordmark on the left, a notification bell
 * and the profile avatar (opens Settings) on the right.
 */
export default function Header({ onOpenSettings }: HeaderProps) {
  const { isLive } = useHealth()
  const { avatar } = useSettings()
  const { alerts, unreadCount, dismiss, markAllSeen } = useNotifications()
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  const toggleNotifications = () => {
    if (!notificationsOpen) markAllSeen()
    setNotificationsOpen((open) => !open)
  }

  return (
    <header className="flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-2">
        <ApexWordmark className="h-[18px] w-auto text-text" />
        {/* Sync indicator: green when data is live from the API, grey on fallback. */}
        <span
          title={isLive ? 'Live data' : 'Using saved data'}
          aria-label={isLive ? 'Live data' : 'Using saved data'}
          className={`h-1.5 w-1.5 rounded-full transition-colors ${
            isLive ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)]' : 'bg-text-muted/50'
          }`}
        />
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={toggleNotifications}
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          className="press relative grid h-10 w-10 place-items-center rounded-full text-text transition-colors hover:bg-surface"
        >
          <Bell size={22} strokeWidth={1.75} />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-bg ring-2 ring-bg">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Settings"
          className="press grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-border-strong bg-fill"
        >
          {avatar ? (
            <img src={avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            <User size={18} strokeWidth={1.75} className="text-text-muted" />
          )}
        </button>
      </div>

      {notificationsOpen && (
        <NotificationPanel
          alerts={alerts}
          onDismiss={dismiss}
          onClose={() => setNotificationsOpen(false)}
        />
      )}
    </header>
  )
}

/**
 * The Apex wordmark — "APEX" with a four-point star nested in the A and a
 * spark trailing the X. Traced from the brand SVG (Downloads/"APEX LOGO SVG
 * right one.svg"); the subtle near-white gradients on the two sparkles are
 * flattened to `currentColor` here since they're imperceptible at header size
 * and this keeps the mark theme-aware (white on dark, near-black on light).
 * The full-colour icon treatment lives in the PWA icons (scripts/apex-icon.png).
 */
export function ApexWordmark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="359.5 888.5 243 62.5"
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
      role="img"
      aria-label="APEX"
      className={className}
    >
      <path d="M416.412 949.191C413.135 949.25 412.561 949.199 411.893 948.788C411.454 948.517 407.057 942.886 401.586 935.58C391.746 922.443 390.955 921.437 390.442 921.437C390.276 921.437 385.593 927.495 380.038 934.898C374.48 942.301 369.672 948.53 369.351 948.742C368.922 949.023 367.731 949.158 364.875 949.252C362.734 949.324 360.984 949.303 360.984 949.206C360.984 948.791 384.371 917.873 385.494 916.803C387.089 915.285 388.722 914.711 391.052 914.849C392.991 914.961 394.719 915.709 395.918 916.946C396.337 917.383 401.966 924.798 408.422 933.431C420.166 949.125 420.166 949.125 416.412 949.191Z" />
      <path d="M474.772 925.444C474.828 928.126 473.729 930.9 471.784 932.977C470.376 934.48 468.949 935.36 466.854 936.014C465.417 936.46 464.294 936.493 450.887 936.493C435.081 936.493 435.306 936.473 434.402 938.004C434.03 938.634 433.966 939.502 433.966 943.996C433.966 949.252 433.966 949.252 430.393 949.252C426.821 949.252 426.821 949.252 426.821 943.794C426.821 939.058 426.887 938.119 427.329 936.713C428.13 934.146 429.909 932.201 432.603 930.938C434.094 930.241 434.094 930.241 449.405 930.114C460.38 930.022 464.861 929.902 465.226 929.69C466.025 929.226 467.081 928.016 467.38 927.225C468.079 925.372 467.283 922.905 465.655 921.894C464.716 921.31 464.716 921.31 445.761 921.241C426.805 921.169 426.806 921.169 426.877 917.924C426.948 914.675 426.948 914.675 443.28 914.609C452.263 914.57 461.179 914.639 463.095 914.762C466.196 914.961 466.765 915.073 468.265 915.775C472.098 917.569 474.693 921.422 474.772 925.444Z" />
      <path d="M527.618 946.195C527.618 949.196 527.608 949.245 527.008 949.395C526.672 949.48 519.409 949.5 510.868 949.439C493.587 949.319 493.812 949.339 490.106 947.533C487.317 946.172 484.423 943.238 483.002 940.321C481.111 936.437 480.578 932.91 481.277 928.894C482.29 923.068 485.472 918.607 490.234 916.339C493.789 914.644 493.396 914.675 511.031 914.675C526.98 914.675 526.98 914.675 527.052 917.929C527.123 921.182 527.123 921.182 511.955 921.182C497.644 921.182 496.695 921.21 495.192 921.68C493.077 922.336 491.114 923.724 490.004 925.347C489.063 926.722 488.249 928.682 488.509 928.942C488.593 929.024 496.68 929.093 506.481 929.093C524.301 929.093 524.301 929.093 524.301 932.155C524.301 935.217 524.301 935.217 506.293 935.217C488.287 935.217 488.287 935.217 488.463 935.792C489.32 938.555 491.188 940.711 493.875 942.038C495.82 943 495.82 943 511.72 943.074C527.618 943.146 527.618 943.146 527.618 946.195Z" />
      <path d="M584.779 948.921C584.779 949.181 583.789 949.252 580.224 949.252C575.674 949.252 575.669 949.252 574.641 948.551C574.077 948.165 571.045 945.537 567.904 942.715C559.687 935.322 560.728 936.006 559.447 937.154C558.057 938.402 554.405 941.732 550.141 945.649C548.28 947.356 546.466 948.865 546.104 949.002C545.31 949.303 536.981 949.339 537.103 949.041C537.208 948.78 542.253 944.144 549.891 937.284C553.08 934.421 555.688 931.999 555.688 931.903C555.688 931.806 552.971 929.44 549.651 926.646C540.158 918.656 535.917 915.03 535.848 914.846C535.746 914.576 545.251 914.769 546.29 915.06C546.954 915.244 549.143 917 553.777 921.06C557.378 924.214 560.44 926.796 560.58 926.796C560.718 926.796 561.828 925.957 563.045 924.933C567.435 921.236 574.827 915.321 574.827 915.507C574.825 915.612 572.696 919.256 570.094 923.604C565.362 931.515 565.362 931.515 566.707 932.663L570.497 935.983L578.862 943.37C582.115 946.241 584.779 948.74 584.779 948.921Z" />
      <path d="M400.376 938.333C400.307 938.445 399.828 938.537 399.31 938.537C397.995 938.545 395.359 939.198 394.137 939.821C393.514 940.14 392.82 940.803 392.371 941.508C391.585 942.75 390.84 945.506 390.84 947.183C390.84 949.061 390.432 948.479 390.143 946.19C389.48 940.941 387.326 938.874 382.22 938.593C380.918 938.522 379.808 938.389 379.75 938.297C379.694 938.206 380.872 937.986 382.37 937.807C387.882 937.152 389.465 935.603 390.187 930.144C390.552 927.401 390.649 927.465 391.077 930.726C391.241 931.977 391.549 933.413 391.759 933.916C392.665 936.088 394.8 937.356 398.381 937.843C399.547 938.001 400.445 938.223 400.376 938.333Z" />
      <path d="M600.983 908.441C600.703 908.553 599.899 908.65 599.197 908.66C595.803 908.711 587.671 910.281 585.734 911.258C584.363 911.95 581.533 914.838 577.841 919.317C573.96 924.022 573.661 924.27 575.284 921.437C577.953 916.785 579.497 913.519 579.617 912.274C579.729 911.092 579.719 911.072 578.747 910.646C576.922 909.844 571.722 908.76 569.213 908.66C568.141 908.617 568.175 908.599 569.724 908.392C576.848 907.443 581.003 906.599 582.911 905.716C584.764 904.858 590.189 898.923 594.841 892.665C596.349 890.637 597.028 889.94 597.028 890.425C597.028 890.489 596.293 891.665 595.395 893.041C593.134 896.501 590.238 901.64 589.602 903.319C588.883 905.218 589.115 905.838 590.781 906.466C592.2 907.004 596.347 907.762 599.452 908.05C600.856 908.183 601.333 908.306 600.983 908.441Z" />
    </svg>
  )
}
