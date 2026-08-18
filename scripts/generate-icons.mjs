// Rasterizes the brand SVGs into the PNG icons the PWA manifest + iOS need.
// Run with: npm run icons
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(here, '..', 'public')

const iconSvg = readFileSync(resolve(publicDir, 'favicon.svg'))
const maskableSvg = readFileSync(resolve(here, 'atlas-maskable.svg'))

// High density so the small viewBox rasterizes crisply at large sizes.
const render = (svg, size, out) =>
  sharp(svg, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(resolve(publicDir, out))

await Promise.all([
  render(iconSvg, 192, 'pwa-192x192.png'),
  render(iconSvg, 512, 'pwa-512x512.png'),
  render(iconSvg, 192, 'apple-touch-icon.png'),
  render(maskableSvg, 512, 'pwa-maskable-512x512.png'),
])

console.log('Generated PWA icons in public/')
