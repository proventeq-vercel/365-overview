import { ArchiveIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatBytes } from '@/lib/format'
import { FORECAST_CHART_MONTHS } from '@/lib/forecast'
import { useTranslation } from '@/hooks/useTranslation'
import type { ArchiveImpact } from '@/model/archiveImpact'
import type { StorageOverview } from '@/types/storage'
import { KvRow, PanelDescription, PanelLabel } from '@/design/primitives'

interface Props {
  overview: StorageOverview
  impact: ArchiveImpact
  onChooseSites: () => void
}

export function CleanUpForecast({ overview, impact, onChooseSites }: Props) {
  const t = useTranslation()
  const { afterCleanUp, rateSource } = overview.growth
  const { archive } = overview
  const { picked, archivedBytes, outlook } = impact
  const removable = formatBytes(impact.removableBytes)
  const hint =
    rateSource === 'none'
      ? overview.sharePoint.trendRead
        ? t('storageOptimisation.growth.cleanUp.firstDay', { removable })
        : t('storageOptimisation.growth.cleanUp.trendUnread', { removable })
      : impact.removableBytes > 0
        ? t('storageOptimisation.growth.cleanUp.counted')
        : archive.sites.length > 0
          ? t('storageOptimisation.growth.cleanUp.nothingRemovable')
          : t('storageOptimisation.growth.cleanUp.nothingToClean', { years: archive.inactiveYears })

  return (
    <div className="mt-3 flex flex-col gap-1">
      <PanelLabel>{t('storageOptimisation.growth.cleanUp.title')}</PanelLabel>
      <dl className="divide-y divide-p365-grey-100">
        <KvRow
          label={t('storageOptimisation.growth.cleanUp.deleted')}
          value={formatBytes(afterCleanUp.deletedBytes)}
        />
        <div className="flex items-center justify-between gap-3 py-1 text-sm text-p365-grey-700">
          <dt>
            {picked.length > 0
              ? t('storageOptimisation.growth.cleanUp.archivePicked', { count: picked.length })
              : t('storageOptimisation.growth.cleanUp.archive')}
          </dt>
          <dd className="flex items-center gap-2">
            {archive.sites.length > 0 && (
              <Button type="button" variant="ghost" size="sm" className="text-p365-teal" onClick={onChooseSites}>
                <ArchiveIcon aria-hidden="true" />
                {picked.length > 0
                  ? t('storageOptimisation.growth.cleanUp.changeSites')
                  : t('storageOptimisation.growth.cleanUp.chooseSites')}
              </Button>
            )}
            <span className="tabular font-bold text-p365-navy">{formatBytes(archivedBytes)}</span>
          </dd>
        </div>
        <KvRow label={t('storageOptimisation.growth.cleanUp.total')} value={removable} />
        {outlook.endBytes !== null && (
          <KvRow
            label={
              archivedBytes > 0
                ? t('storageOptimisation.growth.cleanUp.endArchived', { months: FORECAST_CHART_MONTHS })
                : t('storageOptimisation.growth.cleanUp.end', { months: FORECAST_CHART_MONTHS })
            }
            value={formatBytes(outlook.endBytes)}
          />
        )}
        {outlook.staysUnderEntitlement !== null && (
          <KvRow
            label={t('storageOptimisation.growth.cleanUp.staysUnder')}
            value={
              outlook.staysUnderEntitlement
                ? t('storageOptimisation.growth.cleanUp.yes')
                : t('storageOptimisation.growth.cleanUp.no')
            }
          />
        )}
      </dl>
      <PanelDescription>{hint}</PanelDescription>
    </div>
  )
}
