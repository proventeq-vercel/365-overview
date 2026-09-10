import { UnavailablePanel } from '@/components/UnavailablePanel'
import type { SectionKey, Unavailable } from '@/types/oversharing'
import { SECTION_LABELS, SECTION_REQUIREMENTS } from './copy'

export function findUnavailable(entries: Unavailable[], section: SectionKey): Unavailable | undefined {
  return entries.find((entry) => entry.section === section)
}

interface SectionUnavailableProps {
  entries: Unavailable[]
  section: SectionKey
  adminConsentUrl: string | null
  compact?: boolean
}

export function SectionUnavailable({
  entries,
  section,
  adminConsentUrl,
  compact,
}: SectionUnavailableProps) {
  const entry = findUnavailable(entries, section)
  const requirement = SECTION_REQUIREMENTS[section]
  return (
    <UnavailablePanel
      what={SECTION_LABELS[section]}
      reason={entry?.reason ?? 'unknown'}
      requiredRole={requirement.role}
      requiredScope={requirement.scope}
      adminConsentUrl={adminConsentUrl}
      compact={compact}
    />
  )
}
