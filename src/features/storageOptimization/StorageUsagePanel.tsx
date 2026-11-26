import { formatBytes, formatShare } from '@/lib/format'
import { useTranslation, type TranslateFn } from '@/hooks/useTranslation'
import type { StorageOverview, StorageUsageRow } from '@/types/storage'
import { SegmentedBar, type BarRow } from '@/design/SegmentedBar'
import { EmptyBlock, Panel, PanelDescription, PanelLabel } from '@/design/primitives'
import { WORKLOAD_COLOR } from '@/design/theme'
import { workloadLabel } from './workloadLabel'

function describe(row: StorageUsageRow, t: TranslateFn): string {
  switch (row.source) {
    case 'siteReport':
      return row.workload === 'teams'
        ? t('storageOptimisation.usage.describe.teams')
        : t('storageOptimisation.usage.describe.sharePoint')
    case 'sharePointTrend':
      return t('storageOptimisation.usage.sharePointAllDescription')
    case 'accountReport':
      return t('storageOptimisation.usage.describe.oneDrive')
    case 'oneDriveTrend':
      return t('storageOptimisation.usage.oneDriveAllDescription')
  }
}

function toBarRow(row: StorageUsageRow, t: TranslateFn): BarRow {
  const label = workloadLabel(row.workload, t)
  const value = formatBytes(row.bytes)
  const caption = t('storageOptimisation.usage.share', { percent: formatShare(row.share, 1) })
  const description = describe(row, t)
  const color = WORKLOAD_COLOR[row.workload]
  return {
    id: row.workload,
    label,
    color,
    value,
    caption,
    description,
    scale: row.scale,
    segments: [{ id: row.workload, label, color, value, shareLabel: caption, description, share: 1 }],
  }
}

export function StorageUsagePanel({ overview }: { overview: StorageOverview }) {
  const t = useTranslation()
  const { rows, totalBytes } = overview.usage

  return (
    <Panel>
      <PanelLabel>{t('storageOptimisation.usage.title')}</PanelLabel>
      <PanelDescription>
        {rows.length === 0
          ? t('storageOptimisation.usage.subtitle')
          : `${t('storageOptimisation.usage.subtitle')} ${t('storageOptimisation.usage.hint')}`}
      </PanelDescription>
      {rows.length === 0 ? (
        <EmptyBlock>{t('storageOptimisation.usage.empty')}</EmptyBlock>
      ) : (
        <>
          <p className="text-sm text-p365-grey-700">
            {t('storageOptimisation.usage.total', { total: formatBytes(totalBytes) })}
          </p>
          <SegmentedBar
            className="mt-1"
            ariaLabel={t('storageOptimisation.usage.title')}
            rows={rows.map((row) => toBarRow(row, t))}
          />
        </>
      )}
      {overview.sharePoint.siteReportRead && (
        <p className="text-xs text-p365-grey-500">{t('storageOptimisation.workload.groupingNote')}</p>
      )}
    </Panel>
  )
}
