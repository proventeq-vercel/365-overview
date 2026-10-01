import { HelpAnchor } from './HelpAnchor'
import { ChevronRightIcon, HomeIcon } from './icons'
import type { HelpCenterLabels } from './labels'
import type { HelpPage, HelpSection } from './types'

export function HelpBreadcrumbs({
  page,
  section,
  labels,
  homeHref,
  onNavigate,
}: {
  page: HelpPage
  section: HelpSection | undefined
  labels: HelpCenterLabels
  homeHref: string
  onNavigate: (href: string) => void
}) {
  const separator = (
    <span className="hc-crumb-separator">
      <ChevronRightIcon size={11} />
    </span>
  )
  return (
    <nav className="hc-breadcrumbs" aria-label={labels.breadcrumbs}>
      <ol>
        <li>
          <HelpAnchor href={homeHref} onNavigate={onNavigate}>
            <HomeIcon size={12} />
            {labels.home}
          </HelpAnchor>
        </li>
        {section && (
          <li>
            {separator}
            {section.label}
          </li>
        )}
        <li aria-current="page">
          {separator}
          {page.navTitle}
        </li>
      </ol>
    </nav>
  )
}
