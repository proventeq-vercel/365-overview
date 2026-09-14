import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/ErrorState'
import { adminConsentUrl } from '@/config/adminConsent'
import { AlertPanel } from '@/design/AlertPanel'
import { consentErrorFor } from './consentError'

export function AccessFailure({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const kind = consentErrorFor(error)

  if (kind === 'consent') {
    const url = adminConsentUrl()
    return (
      <AlertPanel tone="warn" title="Your organisation has not approved this app yet">
        <p className="text-sm text-p365-grey-600">
          Microsoft 365 usage reports need one-off admin consent for the whole tenant. A Global
          Administrator has to grant it; signing in again will not help until they do.
        </p>
        {url && (
          <p className="text-sm text-p365-grey-600">
            Send them this link:{' '}
            <a className="font-semibold text-p365-teal underline" href={url}>
              grant admin consent
            </a>
          </p>
        )}
      </AlertPanel>
    )
  }

  if (kind === 'permission') {
    return (
      <AlertPanel tone="error" title="Your account cannot read usage reports">
        <p className="text-sm text-p365-grey-600">
          You are signed in and your organisation has approved the app, but reading tenant usage
          reports needs an administrative role. Microsoft requires Global Reader, Reports Reader,
          or an equivalent role — ask an administrator to assign one.
        </p>
      </AlertPanel>
    )
  }

  return (
    <ErrorState
      error={error}
      action={
        onRetry && (
          <Button type="button" variant="outline" onClick={onRetry}>
            <RefreshCw aria-hidden="true" data-icon="inline-start" />
            Try again
          </Button>
        )
      }
    />
  )
}
