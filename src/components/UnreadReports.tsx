import { RefreshCw } from 'lucide-react'
import { useIntl } from 'react-intl'
import { Button } from '@/components/ui/button'
import { useRefreshReport } from '@/hooks/useRefreshReport'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'
import type { CoreReport } from '@/types/storage'
import { CaveatBanner } from './CaveatBanner'

interface Props {
  reports: CoreReport[]
  notReloaded: CoreReport[] | null
}

export function UnreadReports({ reports, notReloaded }: Props) {
  const t = useTranslation()
  const intl = useIntl()
  const { refresh, isRefreshing } = useRefreshReport()
  if (reports.length === 0 && notReloaded === null) return null
  const named = (list: CoreReport[]) => ({
    reports: intl.formatList(
      list.map((report) => t(`app.unreadReports.name.${report}`)),
      { type: 'conjunction' },
    ),
    count: list.length,
  })
  const lines = [
    notReloaded === null
      ? null
      : notReloaded.length > 0
        ? t('app.unreadReports.notReloaded', named(notReloaded))
        : t('app.unreadReports.refreshKept'),
    reports.length === 0
      ? null
      : notReloaded === null
        ? t('app.unreadReports.note', named(reports))
        : t('app.unreadReports.noteEarlier', named(reports)),
  ]
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
      {lines.filter((line) => line !== null).join(' ')}
    </CaveatBanner>
  )
}
