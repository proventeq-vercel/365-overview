import { useCallback, useMemo } from 'react'
import { HelpCenter } from '@/help-center/HelpCenter'
import type { HelpCenterLabels } from '@/help-center/labels'
import { ACCESS_MODES, type AccessMode } from '@/config/accessMode'
import { HELP_PATH } from '@/config/helpPath'
import { useTranslation } from '@/hooks/useTranslation'
import { HeaderFrame } from '../Header'
import { helpCatalogue } from './helpContent'

const HEADER_HEIGHT = '3.5rem'

function OpenReportLink() {
  const t = useTranslation()
  return (
    <a className="text-sm font-semibold text-p365-teal underline" href="/">
      {t('help.openReport')}
    </a>
  )
}

export function HelpPage({
  mode,
  consentUrl,
  clientId,
}: {
  mode: AccessMode
  consentUrl: string | null
  clientId: string
}) {
  const t = useTranslation()
  const audiences = useMemo(
    () => ACCESS_MODES.map((id) => ({ id, label: t(`help.audience.${id}`) })),
    [t],
  )
  const variables = useCallback(
    (audience: string) => (audience === mode ? { consentUrl, clientId } : {}),
    [mode, consentUrl, clientId],
  )
  const labels = useMemo<HelpCenterLabels>(
    () => ({
      home: t('help.center.home'),
      navigation: t('help.center.navigation'),
      browse: t('help.center.browse'),
      searchLabel: t('help.center.searchLabel'),
      searchPlaceholder: t('help.center.searchPlaceholder'),
      searchResults: t('help.center.searchResults'),
      noResults: (query) => t('help.center.noResults', { query }),
      breadcrumbs: t('help.center.breadcrumbs'),
      onThisPage: t('help.center.onThisPage'),
      pager: t('help.center.pager'),
      previous: t('help.center.previous'),
      next: t('help.center.next'),
      notFoundTitle: t('help.center.notFoundTitle'),
      notFoundBody: t('help.center.notFoundBody'),
      notFoundBack: t('help.center.notFoundBack'),
      audienceGroup: t('help.center.audienceGroup'),
      audienceShown: (audience) => t('help.center.audienceShown', { audience }),
      thisSite: t('help.center.thisSite'),
      showAudience: (audience) => t('help.center.showAudience', { audience }),
    }),
    [t],
  )

  return (
    <HelpCenter
      catalogue={helpCatalogue}
      basePath={HELP_PATH}
      audiences={audiences}
      defaultAudience={mode}
      variables={variables}
      labels={labels}
      stickyOffset={HEADER_HEIGHT}
      header={
        <HeaderFrame
          tenant={<span className="truncate text-sm font-semibold text-p365-navy">{t('help.header')}</span>}
          actions={<OpenReportLink />}
        />
      }
    />
  )
}
