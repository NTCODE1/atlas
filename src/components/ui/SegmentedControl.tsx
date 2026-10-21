interface SegmentedControlProps<T extends string> {
  options: { id: T; label: string }[]
  value: T
  onChange: (id: T) => void
}

/** iOS-style pill group: a graphite track with a lighter pill on the active option. */
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div className="glass-subtle flex gap-1 rounded-full p-1">
      {options.map(({ id, label }) => {
        const active = id === value
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={active}
            className={`press flex-1 rounded-full py-1.5 text-[13px] font-semibold tracking-wide transition-colors ${
              active ? 'bg-white/[0.12] text-text shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]' : 'text-text-muted hover:text-text'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
