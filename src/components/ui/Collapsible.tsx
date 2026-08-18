import type { ReactNode } from 'react'

interface CollapsibleProps {
  open: boolean
  children: ReactNode
}

/**
 * Smooth expand/collapse without measured heights: animates the outer grid
 * row from 0fr to 1fr while the inner wrapper clips the content.
 */
export default function Collapsible({ open, children }: CollapsibleProps) {
  return (
    <div
      className="grid transition-[grid-template-rows] duration-300"
      style={{
        gridTemplateRows: open ? '1fr' : '0fr',
        transitionTimingFunction: 'var(--ease-out-soft)',
      }}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  )
}
