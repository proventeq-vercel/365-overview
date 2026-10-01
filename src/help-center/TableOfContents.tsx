import { useEffect, useState } from 'react'
import { HelpAnchor } from './HelpAnchor'
import type { HelpHeading } from './types'

function useActiveHeading(headings: readonly HelpHeading[]): string | null {
  const [active, setActive] = useState<string | null>(null)
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined' || headings.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting)
        if (visible.length > 0) setActive(visible[0].target.id)
      },
      { rootMargin: '0px 0px -70% 0px' },
    )
    for (const heading of headings) {
      const element = document.getElementById(heading.id)
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [headings])
  return active
}

export function TableOfContents({
  headings,
  label,
  href,
  onNavigate,
}: {
  headings: readonly HelpHeading[]
  label: string
  href: (hash: string) => string
  onNavigate: (href: string) => void
}) {
  const active = useActiveHeading(headings)
  if (headings.length === 0) return null
  return (
    <nav className="hc-toc" aria-label={label}>
      <p className="hc-toc-title">{label}</p>
      <ul>
        {headings.map((heading) => (
          <li key={heading.id} className={heading.depth === 3 ? 'hc-toc-sub' : undefined}>
            <HelpAnchor
              href={href(heading.id)}
              onNavigate={onNavigate}
              className={heading.id === active ? 'hc-toc-active' : undefined}
            >
              {heading.text}
            </HelpAnchor>
          </li>
        ))}
      </ul>
    </nav>
  )
}
