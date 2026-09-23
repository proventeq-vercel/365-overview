import { rowName } from '@/lib/rowName'
import { capacityRatio, shareOf } from '@/lib/share'
import { formatBytes, formatDay, formatNumber, formatPercent } from '@/lib/format'
import { useTranslation } from '@/hooks/useTranslation'
import type { StorageRow } from '@/types/storage'
import { Skeleton } from '@/components/ui/skeleton'
import { ExternalUrlLink } from '@/design/ExternalUrlLink'
import { PoolIcon } from '@/design/PoolIcon'
import type { ColumnKey } from './siteTableColumns'

interface SiteTableCellProps {
  column: ColumnKey
  row: StorageRow
  shareTotalBytes: number
  namesPending: boolean
}

export function SiteTableCell({ column, row, shareTotalBytes, namesPending }: SiteTableCellProps) {
  const t = useTranslation()
  switch (column) {
    case 'name': {
      const name = rowName(row)
      const resolving = namesPending && row.pool === 'SharePoint' && !row.name && !row.url
      return (
        <span role="cell" className="flex min-w-0 items-center gap-2">
          <PoolIcon pool={row.pool} />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            {resolving ? (
              <Skeleton className="h-3.5 w-1/2" aria-label={t('table.resolvingName')} />
            ) : (
              <span className="block truncate font-semibold text-p365-navy" title={name}>
                {name}
              </span>
            )}
            {resolving ? (
              <Skeleton className="h-3 w-2/3" />
            ) : row.url ? (
              <ExternalUrlLink href={row.url} />
            ) : (
              <span className="block truncate text-xs text-p365-grey-500" title={row.id}>
                {row.id}
              </span>
            )}
          </span>
        </span>
      )
    }
    case 'owner':
      return (
        <span role="cell" className="min-w-0 truncate text-p365-grey-600">
          {row.ownerDisplayName}
        </span>
      )
    case 'files':
      return (
        <span role="cell" className="tabular text-p365-grey-600">
          {formatNumber(row.fileCount)}
        </span>
      )
    case 'active':
      return (
        <span role="cell" className="tabular text-p365-grey-600">
          {formatNumber(row.activeFileCount)}
        </span>
      )
    case 'used':
      return (
        <span role="cell" className="tabular font-semibold text-p365-navy">
          {formatBytes(row.storageUsedBytes)}
        </span>
      )
    case 'lastActivity':
      return (
        <span role="cell" className="tabular text-p365-grey-600">
          {row.lastActivityDate ? formatDay(row.lastActivityDate) : t('table.never')}
        </span>
      )
    case 'template':
      return (
        <span role="cell" className="min-w-0 truncate text-p365-grey-600">
          {row.template ?? ''}
        </span>
      )
    case 'capacity': {
      const ratio = capacityRatio(row)
      return (
        <span role="cell" className="tabular text-p365-grey-600">
          {ratio === null ? '' : formatPercent(ratio)}
        </span>
      )
    }
    case 'share': {
      const share = shareOf(row.storageUsedBytes, shareTotalBytes)
      return (
        <span role="cell" className="flex items-center gap-2">
          <span className="tabular w-12 text-p365-grey-600">{formatPercent(share, 1)}</span>
          <span className="h-1.5 flex-1 rounded-full bg-p365-grey-50">
            <span
              className="block h-full rounded-full bg-p365-teal transition-[width] duration-300 ease-out"
              style={{ width: `${share * 100}%` }}
            />
          </span>
        </span>
      )
    }
  }
}
