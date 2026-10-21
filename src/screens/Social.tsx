import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, ArrowDownRight, ArrowUpRight, Camera, Music2, RefreshCw } from 'lucide-react'
import SegmentedControl from '../components/ui/SegmentedControl'
import LineChart, { type ChartPoint } from '../components/ui/LineChart'
import { useCountUp } from '../hooks/useCountUp'
import { fetchSocial, refreshSocial, type SocialAccount, type SocialPoint } from '../api/socialData'

type Range = '30' | '90' | 'all'

const RANGE_DAYS: Record<Range, number> = { '30': 30, '90': 90, all: 400 }
const RANGE_OPTIONS = [
  { id: '30' as const, label: '30d' },
  { id: '90' as const, label: '90d' },
  { id: 'all' as const, label: 'All' },
]

const nf = new Intl.NumberFormat()

function daysAgoISO(n: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

/** The most recent non-null value of `key` across all samples. */
function latest(points: SocialPoint[], key: keyof SocialPoint): number | null {
  for (let i = points.length - 1; i >= 0; i--) {
    const v = points[i][key]
    if (typeof v === 'number') return v
  }
  return null
}

/** Change in followers between the latest sample and the one from ~n days ago (null if history is too short). */
function followerDelta(points: SocialPoint[], n: number): number | null {
  const known = points.filter((p) => p.followers != null)
  if (known.length < 2) return null
  const now = known[known.length - 1]
  const cutoff = daysAgoISO(n)
  const past = [...known].reverse().find((p) => p.date <= cutoff) ?? known[0]
  if (past === now) return null
  return (now.followers as number) - (past.followers as number)
}

function relativeTime(ms: number | null): string {
  if (!ms) return 'not synced yet'
  const mins = Math.round((Date.now() - ms) / 60000)
  if (mins < 60) return `synced ${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 48) return `synced ${hrs}h ago`
  return `synced ${Math.round(hrs / 24)}d ago`
}

function DeltaBadge({ label, value }: { label: string; value: number | null }) {
  if (value == null || value === 0) return null
  const up = value > 0
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
        up ? 'bg-fill text-text' : 'bg-fill text-text-muted'
      }`}
    >
      <Icon size={12} strokeWidth={2.5} />
      {up ? '+' : ''}
      {nf.format(value)}
      <span className="font-medium text-text-muted">{label}</span>
    </span>
  )
}

function AccountAvatar({ url, Icon }: { url: string | null; Icon: typeof Camera }) {
  const [broken, setBroken] = useState(false)
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-fill text-text">
      {url && !broken ? (
        <img
          src={url}
          alt=""
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
        />
      ) : (
        <Icon size={18} strokeWidth={1.9} />
      )}
    </span>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <span className="text-xs text-text-muted">{label}</span>
      <p className="font-display text-sm font-semibold text-text tabular-nums">{nf.format(value)}</p>
    </div>
  )
}

function AccountCard({ account, rangeDays }: { account: SocialAccount; rangeDays: number }) {
  const { points } = account
  const followers = latest(points, 'followers') ?? 0
  const animated = useCountUp(followers, 900)

  const cutoff = daysAgoISO(rangeDays)
  const chartPoints: ChartPoint[] = points
    .filter((p) => p.date >= cutoff && p.followers != null)
    .map((p) => ({ t: p.date, v: p.followers as number }))

  const Icon = account.platform === 'instagram' ? Camera : Music2
  const following = latest(points, 'following')
  const posts = latest(points, 'posts')
  const likes = latest(points, 'likes')

  return (
    <div className="glass mt-4 rounded-3xl px-5 py-5">
      <div className="flex items-center gap-2.5">
        <AccountAvatar url={account.avatarUrl} Icon={Icon} />
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-semibold text-text">{account.label}</p>
          <p className="truncate text-xs text-text-muted">
            {account.username ? `@${account.username}` : account.platform} · {relativeTime(account.lastSyncAt)}
          </p>
        </div>
      </div>

      {account.lastError && (
        <p className="mt-3 flex items-start gap-1.5 rounded-2xl bg-amber/10 px-3 py-2 text-xs text-amber">
          <AlertCircle size={14} strokeWidth={2} className="mt-px shrink-0" />
          <span className="min-w-0 break-words">Last sync failed: {account.lastError}</span>
        </p>
      )}

      <div className="mt-3 num-glow font-display text-[40px] font-bold leading-none text-text tabular-nums">
        {nf.format(animated)}
      </div>
      <p className="mt-1 text-[11px] font-medium tracking-wider text-text-muted">FOLLOWERS</p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <DeltaBadge label="7d" value={followerDelta(points, 7)} />
        <DeltaBadge label="30d" value={followerDelta(points, 30)} />
      </div>

      {(following != null || posts != null || likes != null) && (
        <div className="mt-3 flex gap-6">
          {following != null && <Stat label="Following" value={following} />}
          {posts != null && <Stat label="Posts" value={posts} />}
          {likes != null && <Stat label="Likes" value={likes} />}
        </div>
      )}

      {chartPoints.length >= 2 ? (
        <div className="mt-4">
          <LineChart points={chartPoints} unit="followers" />
        </div>
      ) : (
        <p className="mt-4 text-sm text-text-muted">Follower trend appears after a few daily syncs.</p>
      )}
    </div>
  )
}

export default function Social() {
  const [range, setRange] = useState<Range>('90')
  const [accounts, setAccounts] = useState<SocialAccount[] | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (days: number) => {
    const data = await fetchSocial(days)
    setAccounts(data.accounts)
  }, [])

  useEffect(() => {
    void load(RANGE_DAYS[range])
  }, [load, range])

  const onRefresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    await refreshSocial()
    await load(RANGE_DAYS[range])
    setRefreshing(false)
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 pb-nav">
      <div className="flex items-start justify-between pt-1">
        <div>
          <h1 className="text-[32px] font-semibold leading-[1.1] tracking-tight text-text">Social</h1>
          <p className="mt-0.5 text-text-muted">Follower growth across your accounts</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          aria-label="Refresh now"
          className="press mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-fill text-text-muted hover:text-text disabled:opacity-50"
        >
          <RefreshCw size={15} strokeWidth={2} className={refreshing ? 'animate-spin' : undefined} />
        </button>
      </div>

      <div className="mt-4">
        <SegmentedControl options={RANGE_OPTIONS} value={range} onChange={setRange} />
      </div>

      {accounts === null ? (
        <p className="mt-8 text-sm text-text-muted">Loading…</p>
      ) : accounts.length === 0 ? (
        <div className="glass mt-4 rounded-3xl px-5 py-6">
          <p className="text-sm text-text">No accounts connected yet.</p>
          <p className="mt-2 text-sm text-text-muted">
            Connect your Instagram and TikTok accounts with the one-time OAuth setup in{' '}
            <span className="text-text">atlas-api/docs/social-setup.md</span>, then tap refresh.
          </p>
        </div>
      ) : (
        accounts.map((a) => <AccountCard key={a.account} account={a} rangeDays={RANGE_DAYS[range]} />)
      )}
    </div>
  )
}
