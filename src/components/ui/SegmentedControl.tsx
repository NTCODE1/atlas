interface SegmentedControlProps<T extends string> {
  options: { id: T; label: string }[]
  value: T
  onChange: (id: T) => void
}

/** iOS-style pill group: a subtle glass track with an accent pill on the active option. */
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
              active ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-text'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
