import { ErrorState } from '@/components/ErrorState'
import { adminConsentUrl } from '@/config/adminConsent'
import { consentErrorFor } from './consentError'

export function AccessFailure({ error }: { error: unknown }) {
  const kind = consentErrorFor(error)

  if (kind === 'consent') {
    const url = adminConsentUrl()
    return (
      <div
        role="alert"
        className="flex flex-col gap-3 rounded-xl border border-hairline border-l-4 border-l-amber bg-surface px-5 py-4"
      >
        <h2 className="text-lg font-bold text-ink">
          Your organisation has not approved this app yet
        </h2>
        <p className="text-sm text-ink-soft">
          Microsoft 365 usage reports need one-off admin consent for the whole tenant. A
          Global Administrator has to grant it; signing in again will not help until they
          do.
        </p>
        {url && (
          <p className="text-sm text-ink-soft">
            Send them this link:{' '}
            <a className="font-medium text-brand-strong underline" href={url}>
              grant admin consent
            </a>
          </p>
        )}
      </div>
    )
  }

  if (kind === 'permission') {
    return (
      <div
        role="alert"
        className="flex flex-col gap-3 rounded-xl border border-hairline border-l-4 border-l-coral bg-surface px-5 py-4"
      >
        <h2 className="text-lg font-bold text-ink">
          Your account cannot read usage reports
        </h2>
        <p className="text-sm text-ink-soft">
          You are signed in and your organisation has approved the app, but reading tenant
          usage reports needs an administrative role. Microsoft requires Global Reader,
          Reports Reader, or an equivalent role — ask an administrator to assign one.
        </p>
      </div>
    )
  }

  return <ErrorState error={error} />
}
