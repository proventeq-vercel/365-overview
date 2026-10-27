import { RefreshCw } from 'lucide-react'
import { useIntl } from 'react-intl'
import { Button } from '@/components/ui/button'
import { useRefreshReport } from '@/hooks/useRefreshReport'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'
import type { CoreReport } from '@/types/storage'
import { CaveatBanner } from './CaveatBanner'

export function UnreadReports({ reports, refreshKept }: { reports: CoreReport[]; refreshKept: boolean }) {
  const t = useTranslation()
  const intl = useIntl()
  const { refresh, isRefreshing } = useRefreshReport()
  if (reports.length === 0 && !refreshKept) return null
  const names = reports.map((report) => t(`app.unreadReports.name.${report}`))
  return (
    <CaveatBanner
      tone="warning"
      action={
        <Button type="button" variant="outline" size="sm" disabled={isRefreshing} onClick={() => void refresh()}>
          <RefreshCw
            aria-hidden="true"
            data-icon="inline-start"
            className={cn(isRefreshing && 'animate-spin motion-reduce:animate-none')}
          />
          {t('header.refresh')}
        </Button>
      }
    >
      {reports.length > 0 &&
        t('app.unreadReports.note', { reports: intl.formatList(names, { type: 'conjunction' }), count: reports.length })}
      {reports.length > 0 && refreshKept && ' '}
      {refreshKept && t('app.unreadReports.refreshKept')}
    </CaveatBanner>
  )
}
