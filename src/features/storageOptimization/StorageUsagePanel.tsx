import { formatBytes, formatShare } from '@/lib/format'
import { useTranslation, type TranslateFn } from '@/hooks/useTranslation'
import type { StorageOverview } from '@/types/storage'
import { SegmentedBar, type BarRow } from '@/design/SegmentedBar'
import { Panel, PanelDescription, PanelLabel } from '@/design/primitives'
import { WORKLOAD_COLOR } from '@/design/theme'
import { storageUsageRows, type StorageUsageRow } from './storageUsageRows'

function describe(row: StorageUsageRow, t: TranslateFn): string {
  if (row.teamsIncluded) return t('storageOptimisation.usage.sharePointAllDescription')
  return t(`storageOptimisation.usage.describe.${row.workload}`)
}

function toBarRow(row: StorageUsageRow, largestBytes: number, t: TranslateFn): BarRow {
  const label = t(`storageOptimisation.usage.segment.${row.workload}`)
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
    scale: row.bytes / largestBytes,
    segments: [{ id: row.workload, label, color, value, shareLabel: caption, description, share: 1 }],
  }
}

export function StorageUsagePanel({ overview }: { overview: StorageOverview }) {
  const t = useTranslation()
  const { rows, totalBytes } = storageUsageRows(overview)
  const largestBytes = Math.max(0, ...rows.map((row) => row.bytes))

  return (
    <Panel>
      <PanelLabel>{t('storageOptimisation.usage.title')}</PanelLabel>
      <PanelDescription>{t('storageOptimisation.usage.subtitle')}</PanelDescription>
      {rows.length > 0 && (
        <p className="text-sm text-p365-grey-700">
          {t('storageOptimisation.usage.total', { total: formatBytes(totalBytes) })}
        </p>
      )}
      <SegmentedBar
        className="mt-1"
        ariaLabel={t('storageOptimisation.usage.title')}
        rows={rows.map((row) => toBarRow(row, largestBytes, t))}
      />
      {overview.sharePoint.siteReportRead && (
        <p className="text-xs text-p365-grey-500">{t('storageOptimisation.workload.groupingNote')}</p>
      )}
    </Panel>
  )
}
