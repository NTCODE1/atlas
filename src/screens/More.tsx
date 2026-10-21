import { AtSign, ChevronRight, Moon, Scale, Settings as SettingsIcon, Sparkles, Wallet, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/** Screens reachable from More — one level below the five primary tabs. */
export type MoreScreenId = 'body' | 'sleep' | 'energy' | 'motivation' | 'finance' | 'social'

const ROWS: { id: MoreScreenId; label: string; sub: string; icon: LucideIcon }[] = [
  { id: 'body', label: 'Body', sub: 'Weight trend, plan phase', icon: Scale },
  { id: 'sleep', label: 'Sleep', sub: 'Last night, stages, bedtime', icon: Moon },
  { id: 'energy', label: 'Energy', sub: 'Caffeine, fasting, forecast', icon: Zap },
  { id: 'motivation', label: 'Motivation', sub: 'Goals and dream board', icon: Sparkles },
  { id: 'finance', label: 'Finance', sub: 'Net worth, spending, savings', icon: Wallet },
  { id: 'social', label: 'Social', sub: 'Instagram and TikTok followers', icon: AtSign },
]

interface MoreProps {
  onOpen: (id: MoreScreenId) => void
  onOpenSettings: () => void
}

/** Overflow list for everything that isn't a daily destination. */
export default function More({ onOpen, onOpenSettings }: MoreProps) {
  return (
    <div className="flex-1 overflow-y-auto px-6 pb-nav">
      <div className="pt-1">
        <h1 className="text-[32px] font-semibold leading-[1.1] tracking-tight text-text">More</h1>
      </div>

      <ul className="glass mt-4 divide-y divide-border overflow-hidden rounded-2xl">
        {ROWS.map(({ id, label, sub, icon: Icon }) => (
          <li key={id}>
            <MoreRow icon={Icon} label={label} sub={sub} onClick={() => onOpen(id)} />
          </li>
        ))}
      </ul>

      <ul className="glass mt-4 overflow-hidden rounded-2xl">
        <li>
          <MoreRow icon={SettingsIcon} label="Settings" sub="Profile, targets, notifications" onClick={onOpenSettings} />
        </li>
      </ul>
    </div>
  )
}

function MoreRow({
  icon: Icon,
  label,
  sub,
  onClick,
}: {
  icon: LucideIcon
  label: string
  sub: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-fill active:bg-fill"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-fill text-text">
        <Icon size={18} strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-text">{label}</span>
        <span className="block truncate text-xs text-text-muted">{sub}</span>
      </span>
      <ChevronRight size={18} strokeWidth={1.75} className="shrink-0 text-text-muted" />
    </button>
  )
}
