import type { ReactNode } from 'react'
import { HelpAnchor } from './HelpAnchor'
import type { HelpCenterLabels } from './labels'
import type { HelpPage, HelpSection } from './types'

export function HelpToolbar({
  page,
  section,
  navOpen,
  sidebarId,
  labels,
  homeHref,
  onToggleNav,
  onNavigate,
  children,
}: {
  page: HelpPage | undefined
  section: HelpSection | undefined
  navOpen: boolean
  sidebarId: string
  labels: HelpCenterLabels
  homeHref: string
  onToggleNav: () => void
  onNavigate: (href: string) => void
  children?: ReactNode
}) {
  return (
    <div className="hc-toolbar">
      <button type="button" className="hc-browse" aria-expanded={navOpen} aria-controls={sidebarId} onClick={onToggleNav}>
        {labels.browse}
      </button>
      {page && (
        <nav className="hc-breadcrumbs" aria-label={labels.breadcrumbs}>
          <ol>
            <li>
              <HelpAnchor href={homeHref} onNavigate={onNavigate}>
                {labels.home}
              </HelpAnchor>
            </li>
            {page.slug !== '' && section && <li>{section.label}</li>}
            {page.slug !== '' && <li aria-current="page">{page.navTitle}</li>}
          </ol>
        </nav>
      )}
      {children}
    </div>
  )
}
