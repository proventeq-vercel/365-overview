import { formatBytes, formatShare } from '@/lib/format'
import { useTranslation } from '@/hooks/useTranslation'
import type { StorageOverview } from '@/types/storage'
import { SegmentedBar } from '@/design/SegmentedBar'
import { ShareHeadline } from '@/design/ShareHeadline'
import { Panel, PanelDescription, PanelLabel } from '@/design/primitives'
import { P365, WORKLOAD_COLOR } from '@/design/theme'

export function OneDrivePoolPanel({ overview }: { overview: StorageOverview }) {
  const t = useTranslation()
  const { pool, driveCount, drivesNearCap } = overview.oneDrive
  const { allocation } = pool
  const used = formatBytes(pool.usedBytes)

  return (
    <Panel>
      <PanelLabel>{t('storageOptimisation.oneDrivePool.title')}</PanelLabel>
      <PanelDescription>{t('storageOptimisation.oneDrivePool.subtitle')}</PanelDescription>
      {driveCount === 0 ? (
        <p className="text-sm text-p365-grey-700">{t('storageOptimisation.oneDrivePool.none')}</p>
      ) : allocation === null ? (
        <p className="text-sm text-p365-grey-700">
          {t('storageOptimisation.oneDrivePool.headlineUnknown', { used })}
        </p>
      ) : (
        <>
          <ShareHeadline share={formatShare(allocation.usedShare, 1)} color={WORKLOAD_COLOR.oneDrive}>
            <span>
              {t('storageOptimisation.oneDrivePool.headline', {
                used,
                allocated: formatBytes(allocation.allocatedBytes),
                count: driveCount,
              })}
            </span>
          </ShareHeadline>
          <SegmentedBar
            className="mt-1"
            ariaLabel={t('storageOptimisation.oneDrivePool.title')}
            segments={[
              {
                id: 'oneDriveUsed',
                label: t('storageOptimisation.oneDrivePool.used'),
                color: WORKLOAD_COLOR.oneDrive,
                share: allocation.usedShare,
                value: used,
                shareLabel: t('storageOptimisation.oneDrivePool.share', {
                  percent: formatShare(allocation.usedShare, 1),
                }),
                description: t('storageOptimisation.oneDrivePool.usedDescription'),
              },
              {
                id: 'oneDriveFree',
                label: t('storageOptimisation.oneDrivePool.free'),
                color: P365.grey100,
                share: allocation.freeShare,
                value: formatBytes(allocation.freeBytes),
                shareLabel: t('storageOptimisation.oneDrivePool.share', {
                  percent: formatShare(allocation.freeShare, 1),
                }),
                description: t('storageOptimisation.oneDrivePool.freeDescription'),
              },
            ]}
          />
        </>
      )}
      {driveCount > 0 && drivesNearCap > 0 && (
        <PanelDescription>{t('storageOptimisation.oneDrivePool.nearCap', { count: drivesNearCap })}</PanelDescription>
      )}
    </Panel>
  )
}
