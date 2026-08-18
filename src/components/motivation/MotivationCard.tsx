import { useEffect, useRef, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import type { MotivationItem } from '../../motivation'

interface MotivationCardProps {
  item: MotivationItem
  onCaption: (id: string, caption: string) => void
  onDelete: (id: string) => void
  onOpen: (item: MotivationItem) => void
}

/** One board card: image (tap to enlarge) + inline-editable caption + delete. */
export default function MotivationCard({ item, onCaption, onDelete, onOpen }: MotivationCardProps) {
  const [draft, setDraft] = useState(item.caption)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep the local draft in sync if the stored caption changes elsewhere.
  useEffect(() => setDraft(item.caption), [item.caption])

  // Persist on blur/Enter (not every keystroke) to limit storage writes.
  const commit = () => {
    if (draft !== item.caption) onCaption(item.id, draft.trim())
  }

  return (
    <div className="glass-subtle overflow-hidden rounded-2xl">
      <button
        type="button"
        onClick={() => onOpen(item)}
        aria-label="Enlarge image"
        className="press block w-full"
      >
        <img
          src={item.imageBase64}
          alt={item.caption || 'Motivation'}
          className="aspect-[4/5] w-full object-cover"
        />
      </button>

      <div className="flex items-center gap-1 px-2.5 py-2">
        <input
          ref={inputRef}
          value={draft}
          maxLength={60}
          placeholder="Add a caption…"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
          }}
          className="min-w-0 flex-1 bg-transparent text-sm text-text placeholder:text-text-muted focus:outline-none"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.focus()}
          aria-label="Edit caption"
          className="press grid h-7 w-7 shrink-0 place-items-center rounded-full text-text-muted hover:text-text"
        >
          <Pencil size={13} strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          aria-label="Delete"
          className="press grid h-7 w-7 shrink-0 place-items-center rounded-full text-text-muted transition-colors hover:bg-rose/10 hover:text-rose"
        >
          <Trash2 size={13} strokeWidth={2} />
        </button>
      </div>
    </div>
  )
}
