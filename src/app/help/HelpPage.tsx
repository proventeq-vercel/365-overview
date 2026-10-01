import { useCallback, useMemo } from 'react'
import { BookOpen, ChartPie, HardDrive, Rocket, SquareArrowOutUpRight } from 'lucide-react'
import { HelpCenter } from '@/help-center/HelpCenter'
import type { HelpCenterLabels } from '@/help-center/labels'
import { ACCESS_MODES, type AccessMode } from '@/config/accessMode'
import { HELP_PATH } from '@/config/helpPath'
import { Logo } from '@/design/Logo'
import { useTranslation } from '@/hooks/useTranslation'
import { helpCatalogue } from './helpContent'

const SECTION_ICONS = {
  start: <Rocket aria-hidden="true" />,
  'storage-optimisation': <ChartPie aria-hidden="true" />,
  'onedrive-usage': <HardDrive aria-hidden="true" />,
  reference: <BookOpen aria-hidden="true" />,
}

function HelpBrand() {
  const t = useTranslation()
  return (
    <>
      <a href={HELP_PATH} className="flex shrink-0 items-center">
        <Logo className="h-7 text-p365-navy" />
      </a>
      <span className="hidden h-[22px] w-px bg-[var(--hc-border)] sm:block" aria-hidden="true" />
      <span className="hidden truncate text-[11px] tracking-[0.01em] text-[var(--hc-muted)] sm:block">
        {t('help.header')}
      </span>
    </>
  )
}

function OpenReportLink() {
  const t = useTranslation()
  return (
    <a
      className="inline-flex h-[34px] items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-[var(--hc-text)] transition-colors hover:bg-[var(--hc-sunken)] hover:text-[var(--hc-ink)]"
      href="/"
      aria-label={t('help.openReport')}
    >
      <SquareArrowOutUpRight aria-hidden="true" className="size-4" />
      <span className="hidden md:inline">{t('help.openReport')}</span>
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
      homeEyebrow: t('help.center.homeEyebrow'),
      quickLinks: t('help.center.quickLinks'),
      browseByArea: t('help.center.browseByArea'),
      areaCount: (areas, articles) => t('help.center.areaCount', { areas, articles }),
      areaArticles: (articles) => t('help.center.areaArticles', { articles }),
      viewMarkdown: t('help.center.viewMarkdown'),
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
      sectionIcons={SECTION_ICONS}
      markdownLinks
      brand={<HelpBrand />}
      actions={<OpenReportLink />}
    />
  )
}
