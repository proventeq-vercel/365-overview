import { HelpAnchor } from './HelpAnchor'
import type { HelpCenterLabels } from './labels'
import type { HelpAudience } from './types'

export function AudienceSwitch({
  audiences,
  current,
  defaultAudience,
  labels,
  hrefFor,
  onNavigate,
}: {
  audiences: readonly HelpAudience[]
  current: HelpAudience
  defaultAudience: string
  labels: HelpCenterLabels
  hrefFor: (audience: string) => string
  onNavigate: (href: string) => void
}) {
  return (
    <div className="hc-audience" role="group" aria-label={labels.audienceGroup}>
      <span className="hc-audience-current">
        {labels.audienceShown(current.label)}
        {current.id === defaultAudience && <span className="hc-badge">{labels.thisSite}</span>}
      </span>
      {audiences
        .filter((audience) => audience.id !== current.id)
        .map((audience) => (
          <HelpAnchor key={audience.id} href={hrefFor(audience.id)} onNavigate={onNavigate} className="hc-audience-link">
            {labels.showAudience(audience.label)}
            {audience.id === defaultAudience && ` (${labels.thisSite.toLowerCase()})`}
          </HelpAnchor>
        ))}
    </div>
  )
}
