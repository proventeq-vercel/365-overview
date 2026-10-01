import { HelpAnchor } from './HelpAnchor'
import type { HelpCenterLabels } from './labels'
import type { HelpPage } from './types'

export function HelpPager({
  previous,
  next,
  labels,
  hrefOf,
  onNavigate,
}: {
  previous: HelpPage | null
  next: HelpPage | null
  labels: HelpCenterLabels
  hrefOf: (page: HelpPage) => string
  onNavigate: (href: string) => void
}) {
  if (!previous && !next) return null
  return (
    <nav className="hc-pager" aria-label={labels.pager}>
      {previous ? (
        <HelpAnchor href={hrefOf(previous)} onNavigate={onNavigate} className="hc-pager-link">
          <span className="hc-pager-label">{labels.previous}</span>
          <span className="hc-pager-title">{previous.navTitle}</span>
        </HelpAnchor>
      ) : (
        <span />
      )}
      {next && (
        <HelpAnchor href={hrefOf(next)} onNavigate={onNavigate} className="hc-pager-link hc-pager-next">
          <span className="hc-pager-label">{labels.next}</span>
          <span className="hc-pager-title">{next.navTitle}</span>
        </HelpAnchor>
      )}
    </nav>
  )
}
