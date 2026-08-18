/**
 * Downscale a picked image to a base64 JPEG before storing — a raw phone photo
 * as base64 would blow the ~5MB localStorage quota. Shared by the avatar
 * uploader (square crop) and the motivation board (aspect-preserving).
 *
 * @param maxDim  target size — the square side when `square`, else the longer edge.
 * @param square  true center-crops to a square; false preserves aspect ratio.
 */
export function downscaleImage(file: File, maxDim: number, square: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('no canvas context'))

      if (square) {
        const side = Math.min(img.width, img.height)
        canvas.width = maxDim
        canvas.height = maxDim
        ctx.drawImage(
          img,
          (img.width - side) / 2,
          (img.height - side) / 2,
          side,
          side,
          0,
          0,
          maxDim,
          maxDim,
        )
      } else {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      }
      resolve(canvas.toDataURL('image/jpeg', 0.8))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('failed to load image'))
    }
    img.src = url
  })
}
