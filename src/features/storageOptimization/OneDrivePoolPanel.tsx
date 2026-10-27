import { Link } from 'react-router-dom'
import { env } from '@/config/env'
import { FeatureFlags } from '@/config/featureFlags'
import { REPORT_PATHS } from '@/features/reportPaths'
import { formatBytes, formatShare } from '@/lib/format'
import { useTranslation } from '@/hooks/useTranslation'
import type { OneDriveAllocation, StorageOverview } from '@/types/storage'
import { SegmentedBar } from '@/design/SegmentedBar'
import { ShareHeadline } from '@/design/ShareHeadline'
import { Panel, PanelDescription, PanelLabel } from '@/design/primitives'
import { P365, WORKLOAD_COLOR } from '@/design/theme'

function AttentionLine({ overview }: { overview: StorageOverview }) {
  const t = useTranslation()
  const { attention, deletedButBilling } = overview.oneDrive
  const figures = { inactive: formatBytes(attention.inactive.bytes), deleted: formatBytes(deletedButBilling.bytes) }
  const { unlicensed } = attention
  const line =
    unlicensed.basis === 'noActivity'
      ? t('storageOptimisation.oneDrivePool.attentionNoActivity', {
          ...figures,
          quiet: formatBytes(unlicensed.bytes),
          days: unlicensed.days,
        })
      : t('storageOptimisation.oneDrivePool.attention', {
          ...figures,
          unlicensed: formatBytes(unlicensed.bytes),
          notListed: unlicensed.notListed,
        })
  return (
    <PanelDescription>
      {line}{' '}
      {env.features.has(FeatureFlags.OptimizationStorageReportOneDrive) && (
        <Link to={REPORT_PATHS.oneDriveUsage} className="font-semibold text-p365-teal underline-offset-2 hover:underline">
          {t('storageOptimisation.oneDrivePool.attentionLink')}
        </Link>
      )}
    </PanelDescription>
  )
}

function AllocationLine({ allocation }: { allocation: OneDriveAllocation }) {
  const t = useTranslation()
  const used = formatBytes(allocation.usedBytes)
  const headline = {
    used,
    allocated: formatBytes(allocation.allocatedBytes),
    count: allocation.driveCount,
  }
  const { withoutLimit } = allocation
  return (
    <>
      <ShareHeadline share={formatShare(allocation.usedShare, 1)} color={WORKLOAD_COLOR.oneDrive}>
        <span>
          {withoutLimit.count === 0
            ? t('storageOptimisation.oneDrivePool.headline', headline)
            : t('storageOptimisation.oneDrivePool.headlinePartial', headline)}
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
      {withoutLimit.count > 0 && (
        <PanelDescription>
          {t('storageOptimisation.oneDrivePool.withoutLimit', {
            count: withoutLimit.count,
            bytes: formatBytes(withoutLimit.bytes),
          })}
        </PanelDescription>
      )}
    </>
  )
}

export function OneDrivePoolPanel({ overview }: { overview: StorageOverview }) {
  const t = useTranslation()
  const { pool, driveCount, drivesNearCap } = overview.oneDrive
  const { allocation } = pool

  return (
    <Panel>
      <PanelLabel>{t('storageOptimisation.oneDrivePool.title')}</PanelLabel>
      <PanelDescription>{t('storageOptimisation.oneDrivePool.subtitle')}</PanelDescription>
      {driveCount === 0 ? (
        <p className="text-sm text-p365-grey-700">{t('storageOptimisation.oneDrivePool.none')}</p>
      ) : allocation === null ? (
        <p className="text-sm text-p365-grey-700">
          {t('storageOptimisation.oneDrivePool.noLimit', { used: formatBytes(pool.usedBytes), count: driveCount })}
        </p>
      ) : (
        <AllocationLine allocation={allocation} />
      )}
      <AttentionLine overview={overview} />
      {drivesNearCap > 0 && (
        <PanelDescription>{t('storageOptimisation.oneDrivePool.nearCap', { count: drivesNearCap })}</PanelDescription>
      )}
    </Panel>
  )
}
