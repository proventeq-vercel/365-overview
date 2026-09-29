import { Panel, PanelDescription } from '@/design/primitives'
import { useTranslation } from '@/hooks/useTranslation'

export function RestrictUsersPanel({ clientId }: { clientId: string }) {
  const t = useTranslation()
  return (
    <Panel>
      <ol
        aria-label={t('help.restrict.stepsLabel')}
        className="list-decimal space-y-1 pl-5 text-sm text-p365-grey-700"
      >
        <li>
          {t('help.restrict.find')} <code className="font-semibold break-all">{clientId}</code>
        </li>
        <li>{t('help.restrict.require')}</li>
        <li>{t('help.restrict.assign')}</li>
      </ol>
      <PanelDescription>{t('help.restrict.licence')}</PanelDescription>
      <PanelDescription>{t('help.restrict.outcome')}</PanelDescription>
    </Panel>
  )
}
