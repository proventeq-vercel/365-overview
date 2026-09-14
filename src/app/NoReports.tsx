import { AlertPanel } from '@/design/AlertPanel'
import { useTranslation } from '@/hooks/useTranslation'

export function NoReports() {
  const t = useTranslation()
  return (
    <AlertPanel tone="warn" title={t('app.noReports.title')}>
      <p className="text-sm text-p365-grey-600">{t('app.noReports.body')}</p>
    </AlertPanel>
  )
}
