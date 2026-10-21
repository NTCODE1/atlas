import type { ReactNode } from 'react'

interface CardProps {
  /** 'hero' = the one lead card per screen (a touch more top light);
   *  'inset' = a tile nested inside another card. */
  variant?: 'default' | 'hero' | 'inset'
  className?: string
  children: ReactNode
}

const VARIANT_CLASS = {
  default: 'glass rounded-[22px]',
  hero: 'card-grad-glass rounded-[26px]',
  inset: 'glass-subtle rounded-2xl',
} as const

/** Graphite card surface — see the card system notes in index.css. */
export default function Card({ variant = 'default', className = '', children }: CardProps) {
  return <div className={`${VARIANT_CLASS[variant]} ${className}`}>{children}</div>
}
