// Rasterizes the brand icon into the PNGs the PWA manifest + iOS + browser tab
// need. Source of truth: scripts/apex-icon.png (the 1254² "APEX" icon — black
// tile, diagonal light streak, wordmark). Run with: npm run icons
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(here, '..', 'public')
const SRC = resolve(here, 'apex-icon.png')

// The master has a thin black margin around the rounded-square artwork; trim it
// so the icon fills the frame and the OS applies its own corner mask cleanly.
const trimmed = () => sharp(SRC).trim({ threshold: 12 })

const square = async (size, out) =>
  (await trimmed())
    .resize(size, size, { fit: 'cover' })
    .png()
    .toFile(resolve(publicDir, out))

// Maskable: Android crops to a circle/squircle with a ~20% safe-zone margin, so
// shrink the whole icon onto a black field — nothing important gets clipped.
const maskable = async (size, out) => {
  const inner = Math.round(size * 0.72)
  const art = await (await trimmed()).resize(inner, inner, { fit: 'cover' }).png().toBuffer()
  return sharp({
    create: { width: size, height: size, channels: 4, background: '#000000' },
  })
    .composite([{ input: art, gravity: 'center' }])
    .png()
    .toFile(resolve(publicDir, out))
}

await Promise.all([
  square(192, 'pwa-192x192.png'),
  square(512, 'pwa-512x512.png'),
  square(180, 'apple-touch-icon.png'),
  square(96, 'favicon.png'),
  maskable(512, 'pwa-maskable-512x512.png'),
])

console.log('Generated PWA icons in public/')
