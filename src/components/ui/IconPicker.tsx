import { ICONS, ICON_IDS, ICON_LABEL, type IconId } from '../../icons'

interface IconPickerProps {
  value?: IconId
  onChange: (id: IconId | undefined) => void
  /** Restrict the grid to a subset; defaults to the full registry. */
  ids?: IconId[]
}

/** Scrollable icon grid; tapping the selected icon again clears the choice. */
export default function IconPicker({ value, onChange, ids = ICON_IDS }: IconPickerProps) {
  return (
    <div className="grid max-h-56 grid-cols-6 gap-2 overflow-y-auto pr-1">
      {ids.map((id) => {
        const Icon = ICONS[id]
        const selected = value === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(selected ? undefined : id)}
            aria-label={ICON_LABEL[id]}
            aria-pressed={selected}
            title={ICON_LABEL[id]}
            className={`press grid aspect-square place-items-center rounded-xl border transition-colors ${
              selected
                ? 'border-accent/40 bg-accent/15 text-accent'
                : 'border-border bg-fill text-text-muted hover:text-text'
            }`}
          >
            <Icon size={18} strokeWidth={2} />
          </button>
        )
      })}
    </div>
  )
}
