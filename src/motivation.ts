// --- Motivation board -------------------------------------------------------
//
// A simple photo + caption mood-board of the things you're working toward.
// Images are stored as downscaled base64 JPEGs (see src/image.ts).

export interface MotivationItem {
  id: string
  imageBase64: string
  /** Short caption, ≤ 60 chars. */
  caption: string
  /** ISO timestamp; used only for stable most-recent-first ordering. */
  createdAt: string
}

export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `m-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
