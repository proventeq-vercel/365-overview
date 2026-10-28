import { formatBytes } from '@/lib/format'
import { FORECAST_CHART_MONTHS } from '@/lib/forecast'
import { useTranslation } from '@/hooks/useTranslation'
import type { StorageOverview } from '@/types/storage'
import { KvRow, PanelDescription, PanelLabel } from '@/design/primitives'

interface Props {
  overview: StorageOverview
}

export function CleanUpForecast({ overview }: Props) {
  const t = useTranslation()
  const { afterCleanUp, rateSource } = overview.growth
  const { inactiveYears } = overview.archive

  const removable = formatBytes(afterCleanUp.removableBytes)
  const hint =
    rateSource === 'none'
      ? overview.sharePoint.trendRead
        ? t('storageOptimisation.growth.cleanUp.firstDay', { removable })
        : t('storageOptimisation.growth.cleanUp.trendUnread', { removable })
      : afterCleanUp.removableBytes === 0
        ? t('storageOptimisation.growth.cleanUp.nothingRemovable', { years: inactiveYears })
        : t('storageOptimisation.growth.cleanUp.counted', {
            inactive: formatBytes(afterCleanUp.inactiveBytes),
            deleted: formatBytes(afterCleanUp.deletedBytes),
            years: inactiveYears,
          })

  return (
    <div className="mt-3 flex flex-col gap-1">
      <PanelLabel>{t('storageOptimisation.growth.cleanUp.title')}</PanelLabel>
      <dl className="divide-y divide-p365-grey-100">
        <KvRow
          label={t('storageOptimisation.growth.cleanUp.removable')}
          value={formatBytes(afterCleanUp.removableBytes)}
        />
        {afterCleanUp.endBytes !== null && (
          <KvRow
            label={t('storageOptimisation.growth.cleanUp.end', { months: FORECAST_CHART_MONTHS })}
            value={formatBytes(afterCleanUp.endBytes)}
          />
        )}
        {afterCleanUp.staysUnderEntitlement !== null && (
          <KvRow
            label={t('storageOptimisation.growth.cleanUp.staysUnder')}
            value={
              afterCleanUp.staysUnderEntitlement
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
