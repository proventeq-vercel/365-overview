import { formatBytes, formatLongMonthYear, formatPercent } from '@/lib/format'
import { useTranslation, type TranslateFn } from '@/hooks/useTranslation'
import type { StorageOverview, StorageSegment, StorageSegmentKey } from '@/types/storage'
import { SegmentedBar, type BarSegment } from '@/design/SegmentedBar'
import { ShareHeadline } from '@/design/ShareHeadline'
import { Panel, PanelDescription, PanelLabel } from '@/design/primitives'
import { HEALTH_COLOR, P365, WORKLOAD_COLOR } from '@/design/theme'

const SEGMENT_COLOR: Record<StorageSegmentKey, string> = {
  sharePoint: WORKLOAD_COLOR.sharePoint,
  teams: WORKLOAD_COLOR.teams,
  deleted: P365.red,
  inactive: P365.yellow,
  versions: P365.grey400,
  free: P365.grey100,
}

function describe(key: StorageSegmentKey, overview: StorageOverview, t: TranslateFn): string {
  const { sharePoint, archive, breakdown } = overview
  const entitled = sharePoint.entitledBytes === null ? '' : formatBytes(sharePoint.entitledBytes)
  switch (key) {
    case 'deleted':
      return t('storageOptimisation.usage.describe.deleted', { count: breakdown.deletedCount })
    case 'inactive':
      return t('storageOptimisation.usage.describe.inactive', {
        years: archive.inactiveYears,
        date: formatLongMonthYear(archive.inactiveSince),
      })
    case 'free':
      if (sharePoint.entitledBytes === null) return t('storageOptimisation.usage.describe.freeUnknown')
      if (sharePoint.exhausted && sharePoint.overageBytes !== null) {
        return t('storageOptimisation.usage.describe.freeOver', {
          entitled,
          overage: formatBytes(sharePoint.overageBytes),
        })
      }
      return t('storageOptimisation.usage.describe.free', { entitled })
    default:
      return t(`storageOptimisation.usage.describe.${key}`)
  }
}

function toBarSegment(segment: StorageSegment, overview: StorageOverview, t: TranslateFn): BarSegment {
  const value =
    segment.bytes !== null
      ? formatBytes(segment.bytes)
      : segment.key === 'versions'
        ? t('storageOptimisation.usage.notMeasured')
        : t('storageOptimisation.kpi.unknown')
  return {
    id: segment.key,
    label: t(`storageOptimisation.usage.segment.${segment.key}`),
    color: SEGMENT_COLOR[segment.key],
    share: segment.share,
    value,
    shareLabel:
      segment.bytes === null
        ? null
        : t('storageOptimisation.usage.share', { percent: formatPercent(segment.share, 1) }),
    description: describe(segment.key, overview, t),
    unmeasured: segment.key === 'versions',
  }
}

function Headline({ overview }: { overview: StorageOverview }) {
  const t = useTranslation()
  const { sharePoint } = overview
  if (sharePoint.entitledBytes === null || sharePoint.usedPercentage === null) {
    return (
      <p className="text-sm text-p365-grey-700">
        {t('storageOptimisation.usage.headlineUnknown', { used: formatBytes(sharePoint.usedBytes) })}
      </p>
    )
  }
  const color = sharePoint.utilization === null ? P365.navy : HEALTH_COLOR[sharePoint.utilization]
  return (
    <ShareHeadline share={formatPercent(sharePoint.usedPercentage, 1)} color={color}>
      <span>
        {t('storageOptimisation.usage.headline', {
          used: formatBytes(sharePoint.usedBytes),
          entitled: formatBytes(sharePoint.entitledBytes),
        })}
      </span>
      {sharePoint.exhausted && sharePoint.overageBytes !== null && (
        <span className="font-semibold text-p365-red">
          {t('storageOptimisation.usage.over', { overage: formatBytes(sharePoint.overageBytes) })}
        </span>
      )}
    </ShareHeadline>
  )
}

export function StorageUsagePanel({ overview }: { overview: StorageOverview }) {
  const t = useTranslation()
  const { sharePoint, breakdown, caveats } = overview

  return (
    <Panel>
      <PanelLabel>{t('storageOptimisation.usage.title')}</PanelLabel>
      <PanelDescription>{t('storageOptimisation.usage.subtitle')}</PanelDescription>
      <Headline overview={overview} />
      <SegmentedBar
        className="mt-1"
        ariaLabel={t('storageOptimisation.usage.title')}
        segments={breakdown.segments.map((segment) => toBarSegment(segment, overview, t))}
      />
      {sharePoint.entitledBytes === null && (
        <PanelDescription>{t('storageOptimisation.usage.describe.freeUnknown')}</PanelDescription>
      )}
      {caveats.entitlementIsEstimated && sharePoint.entitledBytes !== null && (
        <PanelDescription>{t('storageOptimisation.growth.estimatedQuotaNote')}</PanelDescription>
      )}
      <p className="text-xs text-p365-grey-500">{t('storageOptimisation.workload.groupingNote')}</p>
    </Panel>
  )
}
