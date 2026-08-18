import { useRef, useState } from 'react'
import { ImagePlus, Plus } from 'lucide-react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { downscaleImage } from '../image'
import { newId, type MotivationItem } from '../motivation'
import GoalsSection from '../components/motivation/GoalsSection'
import MotivationCard from '../components/motivation/MotivationCard'
import ImageViewer from '../components/motivation/ImageViewer'

export default function Motivation() {
  const [items, setItems] = useLocalStorage<MotivationItem[]>('atlas.motivation', [])
  const [viewing, setViewing] = useState<MotivationItem | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const addImage = async (file: File | undefined) => {
    if (!file) return
    try {
      const imageBase64 = await downscaleImage(file, 640, false)
      // Prepend → most-recent-first.
      setItems((prev) => [
        { id: newId(), imageBase64, caption: '', createdAt: new Date().toISOString() },
        ...prev,
      ])
    } catch {
      // unreadable image — ignore
    }
  }

  const setCaption = (id: string, caption: string) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, caption } : it)))

  const remove = (id: string) => setItems((prev) => prev.filter((it) => it.id !== id))

  return (
    <div className="flex-1 overflow-y-auto px-6 pb-28">
      {/* Header */}
      <div className="pt-1">
        <h1 className="font-display text-[32px] font-bold leading-tight text-text">Motivation</h1>
        <p className="mt-0.5 text-text-muted">What you're working toward</p>
      </div>

      {/* Goals */}
      <GoalsSection />

      {/* Photos */}
      <div className="mt-6 flex items-center justify-between">
        <span className="text-[11px] font-medium tracking-wider text-text-muted">PHOTOS</span>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label="Add image"
          className="press grid h-8 w-8 place-items-center rounded-full border border-accent/40 bg-accent/10 text-accent transition-colors hover:bg-accent/20"
        >
          <Plus size={16} strokeWidth={2.5} />
        </button>
      </div>

      {items.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="press mt-3 flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-border-strong bg-fill py-8 text-text-muted"
        >
          <ImagePlus size={22} strokeWidth={1.75} />
          <span className="text-sm">Add photos of your dreams</span>
        </button>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {items.map((item) => (
            <MotivationCard
              key={item.id}
              item={item}
              onCaption={setCaption}
              onDelete={remove}
              onOpen={setViewing}
            />
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void addImage(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      {viewing && (
        <ImageViewer
          imageBase64={viewing.imageBase64}
          caption={viewing.caption}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  )
}
