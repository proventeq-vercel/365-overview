import { isConsentRequired } from '../clients/apiError'
import { adminConsentUrl } from '../config/adminConsent'

export function AuthErrorScreen({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : String(error ?? 'Unknown error')
  const consentUrl = adminConsentUrl()

  if (isConsentRequired(error)) {
    return (
      <div className="auth-screen">
        <div className="error-state" style={{ maxWidth: '520px', width: '100%' }} role="alert">
          <p className="error-state__message">Your organisation has not approved this app yet</p>
          <p className="error-state__hint">
            This report only reads Microsoft 365 data, and nothing leaves your browser — but a Global
            Administrator has to grant admin consent once before anyone in your tenant can sign in.
          </p>
          {consentUrl && (
            <p className="error-state__hint">
              <a href={consentUrl}>Grant admin consent</a> — you will be asked to review the read-only
              permissions this report needs, then returned here.
            </p>
          )}
          <p className="error-state__hint">{message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-screen">
      <div className="error-state" style={{ maxWidth: '480px', width: '100%' }} role="alert">
        <p className="error-state__message">Sign-in failed</p>
        <p className="error-state__hint">{message}</p>
      </div>
    </div>
  )
}
