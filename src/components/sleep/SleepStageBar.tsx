interface SleepStageBarProps {
  deepMin: number
  coreMin: number
  remMin: number
  awakeMin: number
  totalMin: number
}

type StageKey = 'Deep' | 'Core' | 'REM' | 'Awake'

// Monochrome ramp, brightest (Deep) to dimmest (REM); Awake stays rose so the
// disruptive stage still reads as an alert. Vars flip with the theme.
const STAGE_COLOR: Record<StageKey, string> = {
  Deep: 'var(--color-accent)',
  Core: 'var(--color-sky)',
  REM: 'var(--color-cyan)',
  Awake: 'var(--color-rose)',
}

// Deep → Awake = deepest to lightest; matches the bar's left-to-right fill.
const STAGE_ORDER: StageKey[] = ['Deep', 'Core', 'REM', 'Awake']

export default function SleepStageBar({
  deepMin,
  coreMin,
  remMin,
  awakeMin,
  totalMin,
}: SleepStageBarProps) {
  const minutesFor: Record<StageKey, number> = {
    Deep: deepMin,
    Core: coreMin,
    REM: remMin,
    Awake: awakeMin,
  }

  // Percent of the night, against total — mirrors the stat-tile pct() so the
  // bar and the tiles always agree.
  const pct = (minutes: number) =>
    totalMin > 0 ? Math.round((minutes / totalMin) * 100) : 0

  const stages = STAGE_ORDER.map((stage) => ({
    stage,
    percent: pct(minutesFor[stage]),
    color: STAGE_COLOR[stage],
  }))

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-semibold tracking-[0.2em] text-indigo">
          SLEEP STAGES
        </span>
        <span className="text-[11px] text-text-muted">Share of night · summary</span>
      </div>

      {/* Stacked proportion bar */}
      <div
        className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-surface-2"
        style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.18))' }}
        role="img"
        aria-label="Proportion of each sleep stage across the night"
      >
        {stages
          .filter((s) => s.percent > 0)
          .map((s) => (
            <div
              key={s.stage}
              style={{ width: `${s.percent}%`, backgroundColor: s.color }}
              className="h-full"
            />
          ))}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {stages.map((s) => (
          <div key={s.stage} className="flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-[11px] text-text-muted">
              {s.stage} {s.percent}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
