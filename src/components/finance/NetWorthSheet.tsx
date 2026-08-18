import { Plus, Trash2 } from 'lucide-react'
import { newId, sumItems, formatEuro, type LineItem } from '../../finance'
import Sheet from '../ui/Sheet'

interface NetWorthSheetProps {
  assets: LineItem[]
  liabilities: LineItem[]
  onChange: (fields: { assets?: LineItem[]; liabilities?: LineItem[] }) => void
  onClose: () => void
}

/** Editor for the two net-worth lists: add/edit/delete label + amount rows. */
export default function NetWorthSheet({
  assets,
  liabilities,
  onChange,
  onClose,
}: NetWorthSheetProps) {
  return (
    <Sheet title="Net worth" maxHeight="tall" onClose={onClose}>
      <ListBlock
        title="ASSETS"
        items={assets}
        total={sumItems(assets)}
        onChange={(assetsNext) => onChange({ assets: assetsNext })}
      />
      <div className="mt-6">
        <ListBlock
          title="LIABILITIES"
          items={liabilities}
          total={sumItems(liabilities)}
          onChange={(liabilitiesNext) => onChange({ liabilities: liabilitiesNext })}
        />
      </div>
    </Sheet>
  )
}

function ListBlock({
  title,
  items,
  total,
  onChange,
}: {
  title: string
  items: LineItem[]
  total: number
  onChange: (items: LineItem[]) => void
}) {
  const add = () => onChange([...items, { id: newId(), label: '', amount: 0 }])
  const patch = (id: string, fields: Partial<LineItem>) =>
    onChange(items.map((it) => (it.id === id ? { ...it, ...fields } : it)))
  const remove = (id: string) => onChange(items.filter((it) => it.id !== id))

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium tracking-wider text-text-muted">{title}</span>
        <span className="font-display text-sm font-semibold text-text tabular-nums">
          {formatEuro(total)}
        </span>
      </div>

      <div className="mt-2 flex flex-col gap-2">
        {items.map((it) => (
          <div key={it.id} className="glass-subtle flex items-center gap-2 rounded-xl px-2.5 py-2">
            <input
              value={it.label}
              placeholder="Label"
              onChange={(e) => patch(it.id, { label: e.target.value })}
              className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-2.5 py-1.5 text-sm text-text placeholder:text-text-muted focus:border-accent/60 focus:outline-none"
            />
            <input
              type="number"
              inputMode="decimal"
              value={it.amount || ''}
              placeholder="0"
              onChange={(e) => patch(it.id, { amount: Number(e.target.value) || 0 })}
              className="w-24 rounded-lg border border-border bg-bg px-2.5 py-1.5 text-right text-sm text-text placeholder:text-text-muted focus:border-accent/60 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => remove(it.id)}
              aria-label="Delete row"
              className="press grid h-7 w-7 shrink-0 place-items-center rounded-full text-text-muted transition-colors hover:bg-rose/10 hover:text-rose"
            >
              <Trash2 size={14} strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={add}
        className="press mt-2 flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/20"
      >
        <Plus size={13} strokeWidth={2.5} />
        Add {title === 'ASSETS' ? 'asset' : 'liability'}
      </button>
    </div>
  )
}
