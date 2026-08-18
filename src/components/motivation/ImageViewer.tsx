import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface ImageViewerProps {
  imageBase64: string
  caption: string
  onClose: () => void
}

/** Full-screen image viewer: dim scrim, large image, caption, tap/✕ to close.
 *  Portaled to <body> so it fills the viewport, not a filtered ancestor card. */
export default function ImageViewer({ imageBase64, caption, onClose }: ImageViewerProps) {
  if (typeof document === 'undefined') return null
  return createPortal(
    <div
      className="backdrop-enter fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 px-6"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="press absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white"
        style={{ top: 'calc(env(safe-area-inset-top) + 1.25rem)' }}
      >
        <X size={18} strokeWidth={2.5} />
      </button>

      <img
        src={imageBase64}
        alt={caption || 'Motivation'}
        className="max-h-[80vh] max-w-full rounded-2xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      {caption && (
        <p className="mt-4 max-w-[22rem] text-center text-sm text-white/90">{caption}</p>
      )}
    </div>,
    document.body,
  )
}
