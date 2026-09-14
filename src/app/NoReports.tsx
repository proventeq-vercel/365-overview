import { env } from '@/config/env'
import { AlertPanel } from '@/design/AlertPanel'
import { useTranslation } from '@/hooks/useTranslation'
import { ModesOverrideHint } from './ModesOverrideHint'

export function NoReports() {
  const t = useTranslation()
  const overridden = Object.keys(env.overrides).length > 0
  return (
    <AlertPanel tone="warn" title={t('app.noReports.title')}>
      <p className="text-sm text-p365-grey-600">{t('app.noReports.body')}</p>
      {overridden && <ModesOverrideHint />}
    </AlertPanel>
  )
}
