import type { ReactNode } from 'react'
import { isPlainClick } from './links'

export interface HelpAnchorProps {
  href: string
  onNavigate: (href: string) => void
  children: ReactNode
  className?: string
  current?: boolean
}

export function HelpAnchor({ href, onNavigate, children, className, current }: HelpAnchorProps) {
  return (
    <a
      href={href}
      className={className}
      aria-current={current ? 'page' : undefined}
      onClick={(event) => {
        if (!isPlainClick(event)) return
        event.preventDefault()
        onNavigate(href)
      }}
    >
      {children}
    </a>
  )
}
