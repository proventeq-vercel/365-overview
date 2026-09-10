import { Card, CardContent } from '@/components/ui/card'
import type { UnavailableReason } from '@/types/oversharing'

interface UnavailablePanelProps {
  what: string
  reason: UnavailableReason
  requiredRole?: string
  requiredScope?: string
  adminConsentUrl?: string | null
  compact?: boolean
}

function explain(
  reason: UnavailableReason,
  requiredRole?: string,
  requiredScope?: string,
): string {
  if (reason === 'role') {
    return requiredRole
      ? `The signed-in account needs the ${requiredRole} role to read this.`
      : 'The signed-in account does not hold a role that can read this.'
  }
  if (reason === 'consent') {
    return requiredScope
      ? `A Global Administrator has not yet granted admin consent for ${requiredScope}.`
      : 'A Global Administrator has not yet granted admin consent for this data.'
  }
  if (reason === 'notInGraph') {
    return 'Microsoft Graph does not expose this, so it is not shown rather than estimated.'
  }
  return 'This could not be read from Microsoft Graph.'
}

export function UnavailablePanel({
  what,
  reason,
  requiredRole,
  requiredScope,
  adminConsentUrl,
  compact = false,
}: UnavailablePanelProps) {
  const body = (
    <div className="flex flex-col gap-1" role="alert">
      <span className="text-sm font-semibold text-ink">{what} — unavailable</span>
      <span className="text-xs text-muted-foreground">{explain(reason, requiredRole, requiredScope)}</span>
      {reason === 'consent' && adminConsentUrl && (
        <a
          href={adminConsentUrl}
          className="mt-1 text-xs font-semibold text-brand-strong underline underline-offset-2"
        >
          Grant admin consent
        </a>
      )}
      <span className="mt-1 text-xs text-muted-foreground">
        Nothing is assumed in its place — this is not a zero.
      </span>
    </div>
  )

  if (compact) return body

  return (
    <Card className="border-hairline border-l-4 border-l-[#eab000] shadow-none">
      <CardContent className="p-5">{body}</CardContent>
    </Card>
  )
}
