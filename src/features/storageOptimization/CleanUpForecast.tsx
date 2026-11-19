import { ArchiveIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatBytes } from '@/lib/format'
import { FORECAST_CHART_MONTHS, cleanUpOutlook } from '@/lib/forecast'
import { useTranslation } from '@/hooks/useTranslation'
import type { StorageOverview } from '@/types/storage'
import { KvRow, PanelDescription, PanelLabel } from '@/design/primitives'

interface Props {
  overview: StorageOverview
  pickedCount: number
  archivedBytes: number
  onChooseSites: () => void
}

export function CleanUpForecast({ overview, pickedCount, archivedBytes, onChooseSites }: Props) {
  const t = useTranslation()
  const { afterCleanUp, rateSource, points } = overview.growth
  const outlook =
    archivedBytes > 0
      ? cleanUpOutlook(points, archivedBytes, overview.sharePoint.entitledBytes)
      : { endBytes: afterCleanUp.endBytes, staysUnderEntitlement: afterCleanUp.staysUnderEntitlement }
  const removable = formatBytes(afterCleanUp.removableBytes + archivedBytes)
  const hint =
    rateSource === 'none'
      ? overview.sharePoint.trendRead
        ? t('storageOptimisation.growth.cleanUp.firstDay', { removable })
        : t('storageOptimisation.growth.cleanUp.trendUnread', { removable })
      : afterCleanUp.removableBytes + archivedBytes === 0
        ? t('storageOptimisation.growth.cleanUp.nothingRemovable')
        : t('storageOptimisation.growth.cleanUp.counted')

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
            {pickedCount > 0
              ? t('storageOptimisation.growth.cleanUp.archivePicked', { count: pickedCount })
              : t('storageOptimisation.growth.cleanUp.archive')}
          </dt>
          <dd className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" className="text-p365-teal" onClick={onChooseSites}>
              <ArchiveIcon aria-hidden="true" />
              {pickedCount > 0
                ? t('storageOptimisation.growth.cleanUp.changeSites')
                : t('storageOptimisation.growth.cleanUp.chooseSites')}
            </Button>
            <span className="tabular font-bold text-p365-navy">{formatBytes(archivedBytes)}</span>
          </dd>
        </div>
        <KvRow label={t('storageOptimisation.growth.cleanUp.total')} value={removable} />
        {outlook.endBytes !== null && (
          <KvRow
            label={t('storageOptimisation.growth.cleanUp.end', { months: FORECAST_CHART_MONTHS })}
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
