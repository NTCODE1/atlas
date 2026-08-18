import { useRef } from 'react'
import { User } from 'lucide-react'
import { downscaleImage } from '../../image'

interface AvatarUploadProps {
  avatar: string | null
  onChange: (dataUrl: string | null) => void
}

/** Tappable avatar circle that opens the file picker; long-form remove below. */
export default function AvatarUpload({ avatar, onChange }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const pick = async (file: File | undefined) => {
    if (!file) return
    try {
      onChange(await downscaleImage(file, 256, true))
    } catch {
      // unreadable image — leave the current avatar untouched
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label="Change profile picture"
        className="press grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border border-border-strong bg-fill"
      >
        {avatar ? (
          <img src={avatar} alt="Profile" className="h-full w-full object-cover" />
        ) : (
          <User size={32} strokeWidth={1.5} className="text-text-muted" />
        )}
      </button>
      <div className="flex flex-col items-start gap-1">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="press rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent/20"
        >
          {avatar ? 'Change photo' : 'Upload photo'}
        </button>
        {avatar && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="press px-3 py-1 text-xs text-text-muted hover:text-rose"
          >
            Remove
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void pick(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </div>
  )
}
