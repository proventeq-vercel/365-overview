import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/ErrorState'
import { adminConsentUrl } from '@/config/adminConsent'
import { AlertPanel } from '@/design/AlertPanel'
import { useTranslation } from '@/hooks/useTranslation'
import { consentErrorFor } from './consentError'

export function AccessFailure({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const t = useTranslation()
  const kind = consentErrorFor(error)

  if (kind === 'consent') {
    const url = adminConsentUrl()
    return (
      <AlertPanel tone="warn" title={t('access.consent.title')}>
        <p className="text-sm text-p365-grey-600">{t('access.consent.body')}</p>
        {url && (
          <p className="text-sm text-p365-grey-600">
            {t('access.consent.sendLink')}{' '}
            <a className="font-semibold text-p365-teal underline" href={url}>
              {t('access.consent.grant')}
            </a>
          </p>
        )}
      </AlertPanel>
    )
  }

  if (kind === 'permission') {
    return (
      <AlertPanel tone="error" title={t('access.permission.title')}>
        <p className="text-sm text-p365-grey-600">{t('access.permission.body')}</p>
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
            {t('errors.retry')}
          </Button>
        )
      }
    />
  )
}
