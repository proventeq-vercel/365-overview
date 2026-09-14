import { isConsentRequired } from '../clients/apiError'
import { adminConsentUrl } from '../config/adminConsent'
import { useTranslation } from '../hooks/useTranslation'

export function AuthErrorScreen({ error }: { error: unknown }) {
  const t = useTranslation()
  const message = error instanceof Error ? error.message : String(error ?? t('auth.unknownError'))
  const consentUrl = adminConsentUrl()

  if (isConsentRequired(error)) {
    return (
      <div className="auth-screen">
        <div className="error-state" style={{ maxWidth: '520px', width: '100%' }} role="alert">
          <p className="error-state__message">{t('auth.consent.title')}</p>
          <p className="error-state__hint">{t('auth.consent.body')}</p>
          {consentUrl && (
            <p className="error-state__hint">
              <a href={consentUrl}>{t('auth.consent.link')}</a>
              {t('auth.consent.linkTail')}
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
        <p className="error-state__message">{t('auth.signInFailed')}</p>
        <p className="error-state__hint">{message}</p>
      </div>
    </div>
  )
}
