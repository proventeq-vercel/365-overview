import { useState, type ReactNode } from 'react'
import type { HelpCatalogue } from './catalogue'
import { HelpAnchor } from './HelpAnchor'
import { ChevronDownIcon } from './icons'
import type { HelpCenterLabels } from './labels'
import type { HelpPage } from './types'

export function HelpSidebar({
  id,
  open,
  catalogue,
  currentSlug,
  sectionIcons,
  labels,
  hrefOf,
  onNavigate,
}: {
  id: string
  open: boolean
  catalogue: HelpCatalogue
  currentSlug: string | undefined
  sectionIcons: Readonly<Record<string, ReactNode>>
  labels: HelpCenterLabels
  hrefOf: (page: HelpPage) => string
  onNavigate: (href: string) => void
}) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set())
  const toggle = (section: string) =>
    setCollapsed((current) => {
      const next = new Set(current)
      if (!next.delete(section)) next.add(section)
      return next
    })

  return (
    <aside id={id} className={open ? 'hc-sidebar hc-sidebar-open' : 'hc-sidebar'}>
      <nav className="hc-nav" aria-label={labels.navigation}>
        {catalogue.sections.map((section) => {
          const pages = catalogue.pagesIn(section.id)
          if (pages.length === 0) return null
          const expanded = !collapsed.has(section.id)
          const listId = `${id}-${section.id}`
          const holdsCurrent = pages.some((entry) => entry.slug === currentSlug)
          return (
            <div key={section.id} className="hc-nav-group">
              <button
                type="button"
                className={holdsCurrent ? 'hc-nav-heading hc-nav-heading-current' : 'hc-nav-heading'}
                aria-expanded={expanded}
                aria-controls={listId}
                onClick={() => toggle(section.id)}
              >
                {sectionIcons[section.id] && <span className="hc-nav-icon">{sectionIcons[section.id]}</span>}
                <span className="hc-nav-heading-label">{section.label}</span>
                <span className="hc-nav-chevron">
                  <ChevronDownIcon size={12} />
                </span>
              </button>
              <ul id={listId} hidden={!expanded}>
                {pages.map((entry) => (
                  <li key={entry.slug}>
                    <HelpAnchor
                      href={hrefOf(entry)}
                      onNavigate={onNavigate}
                      current={entry.slug === currentSlug}
                      className="hc-nav-link"
                    >
                      {entry.navTitle}
                    </HelpAnchor>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </nav>
    </aside>
  )
}
