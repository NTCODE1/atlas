/**
 * The assistant's orb — a looping video masked to a circle, its edge feathered so
 * it melts into the dark backdrop. `thinking` is accepted for API compatibility
 * (the breathing scale conveys life; no coloured halo, to stay blended).
 */

interface OrbProps {
  /** Diameter in px. */
  size?: number
  /** Reserved: brief "composing" state (currently no distinct visual). */
  thinking?: boolean
}

export default function Orb({ size = 200 }: OrbProps) {
  return (
    <div
      className="orb-breathe relative shrink-0"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* Circular clip box; the video is zoomed so the orb fills the frame and
          the black padding around it is cropped out. A soft radial mask feathers
          the outer edge to transparent so the orb melts into the backdrop with no
          visible circular border. */}
      <div
        className="absolute inset-0 overflow-hidden rounded-full"
        style={{
          maskImage: 'radial-gradient(circle, #000 34%, transparent 72%)',
          WebkitMaskImage: 'radial-gradient(circle, #000 34%, transparent 72%)',
        }}
      >
        <video
          src="/assets/orb.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover"
          style={{ transform: 'scale(1.6)' }}
        />
      </div>
    </div>
  )
}
