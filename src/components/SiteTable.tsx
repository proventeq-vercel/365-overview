import { useDeferredValue, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { rowName } from '@/lib/rowName'
import { isConcealedName } from '@/lib/concealment'
import { buildSearchIndex, normaliseQuery, searchOrder, sortOrder } from '@/lib/rowSearch'
import type { SortDirection } from '@/lib/rowSearch'
import type { ConcealmentSource, StorageRow } from '@/types/storage'
import { formatBytes, formatNumber, formatPercent } from '@/lib/format'
import { useTranslation, type TranslateKey } from '@/hooks/useTranslation'
import { usePagination } from '@/hooks/usePagination'
import { useKnownSites, useSiteDetails } from '@/hooks/useSiteDetails'
import { Skeleton } from '@/components/ui/skeleton'
import { ExternalUrlLink } from '@/design/ExternalUrlLink'
import { Pagination } from '@/design/Pagination'
import { PoolIcon } from '@/design/PoolIcon'
import { ColumnHeaderTooltip } from '@/design/ColumnHeaderTooltip'
import { ConcealedNameMark } from '@/design/ConcealedNameMark'

export type ColumnKey =
  | 'name'
  | 'owner'
  | 'files'
  | 'active'
  | 'used'
  | 'share'
  | 'lastActivity'
  | 'template'
  | 'capacity'

interface SiteTableProps {
  rows: StorageRow[]
  totalUsedBytes: number
  columns: ColumnKey[]
  label?: string
  nameHeader?: string
  nameHelp?: string
  concealment?: ConcealmentSource
}

interface ColumnSpec {
  label: TranslateKey
  help: TranslateKey
  sortable: boolean
  width: string
  sortValue?: (row: StorageRow) => number
}

const capacityRatio = (row: StorageRow): number =>
  row.allocatedBytes !== undefined && row.allocatedBytes > 0
    ? row.storageUsedBytes / row.allocatedBytes
    : 0

const COLUMNS: Record<ColumnKey, ColumnSpec> = {
  name: {
    label: 'table.column.site',
    help: 'table.column.help.site',
    sortable: false,
    width: 'minmax(0,2fr)',
  },
  owner: {
    label: 'table.column.owner',
    help: 'table.column.help.owner',
    sortable: false,
    width: 'minmax(0,1.5fr)',
  },
  files: {
    label: 'table.column.files',
    help: 'table.column.help.files',
    sortable: true,
    width: '80px',
    sortValue: (r) => r.fileCount,
  },
  active: {
    label: 'table.column.active',
    help: 'table.column.help.active',
    sortable: true,
    width: '96px',
    sortValue: (r) => r.activeFileCount,
  },
  used: {
    label: 'table.column.used',
    help: 'table.column.help.used',
    sortable: true,
    width: '120px',
    sortValue: (r) => r.storageUsedBytes,
  },
  share: {
    label: 'table.column.share',
    help: 'table.column.help.share',
    sortable: true,
    width: 'minmax(120px,1.4fr)',
    sortValue: (r) => r.storageUsedBytes,
  },
  lastActivity: {
    label: 'table.column.lastActivity',
    help: 'table.column.help.lastActivity',
    sortable: true,
    width: '120px',
    sortValue: (r) => (r.lastActivityDate ? Date.parse(r.lastActivityDate) : 0),
  },
  template: {
    label: 'table.column.template',
    help: 'table.column.help.template',
    sortable: false,
    width: 'minmax(0,1fr)',
  },
  capacity: {
    label: 'table.column.capacity',
    help: 'table.column.help.capacity',
    sortable: true,
    width: '120px',
    sortValue: capacityRatio,
  },
}

const DEFAULT_SORT: ColumnKey = 'used'

export function SiteTable({
  rows,
  totalUsedBytes,
  columns,
  label,
  nameHeader,
  nameHelp,
  concealment,
}: SiteTableProps) {
  const t = useTranslation()
  const tableLabel = label ?? t('table.sites')
  const nameLabel = nameHeader ?? t('table.column.site')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<ColumnKey>(DEFAULT_SORT)
  const [sortDir, setSortDir] = useState<SortDirection>('desc')

  const known = useKnownSites()
  const query = useDeferredValue(normaliseQuery(search))
  const searching = query !== normaliseQuery(search)

  const index = useMemo(() => buildSearchIndex(rows), [rows])
  const order = useMemo(() => {
    const sortValue = COLUMNS[sortKey].sortValue ?? COLUMNS[DEFAULT_SORT].sortValue!
    return sortOrder(rows, sortValue, sortDir)
  }, [rows, sortKey, sortDir])
  const visible = useMemo(
    () => searchOrder(order, index, query, known),
    [order, index, query, known],
  )

  const pagination = usePagination(visible.length)
  const { start, end } = pagination
  const pageSlice = useMemo(
    () => visible.slice(start, end).map((i) => rows[i]),
    [visible, rows, start, end],
  )
  const { rows: pageRows, isPending: namesPending } = useSiteDetails(pageSlice)

  function changeSearch(value: string) {
    setSearch(value)
    pagination.reset()
  }

  function toggleSort(key: ColumnKey) {
    pagination.reset()
    if (key === sortKey) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sortIndicator = (key: ColumnKey) => {
    if (key !== sortKey) return null
    const Icon = sortDir === 'asc' ? ChevronUp : ChevronDown
    return <Icon className="size-3.5" aria-hidden="true" />
  }

  const gridCols = columns.map((key) => COLUMNS[key].width).join(' ')
  const headerOf = (key: ColumnKey) => (key === 'name' ? nameLabel : t(COLUMNS[key].label))
  const helpOf = (key: ColumnKey) => (key === 'name' && nameHelp ? nameHelp : t(COLUMNS[key].help))

  const concealedMark = (text: string) =>
    concealment && isConcealedName(text) ? <ConcealedNameMark source={concealment} /> : null

  function renderCell(key: ColumnKey, row: StorageRow) {
    switch (key) {
      case 'name': {
        const name = rowName(row)
        const resolving = namesPending && row.pool === 'SharePoint' && !row.name && !row.url
        return (
          <span role="cell" key={key} className="flex min-w-0 items-center gap-2">
            <PoolIcon pool={row.pool} />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              {resolving ? (
                <Skeleton className="h-3.5 w-1/2" aria-label={t('table.resolvingName')} />
              ) : (
                <span className="flex min-w-0 items-center gap-1">
                  <span className="block truncate font-semibold text-p365-navy" title={name}>
                    {name}
                  </span>
                  {concealedMark(name)}
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
          <span role="cell" key={key} className="flex min-w-0 items-center gap-1 text-p365-grey-600">
            <span className="truncate">{row.ownerDisplayName}</span>
            {concealedMark(row.ownerDisplayName)}
          </span>
        )
      case 'files':
        return (
          <span role="cell" key={key} className="tabular text-p365-grey-600">
            {formatNumber(row.fileCount)}
          </span>
        )
      case 'active':
        return (
          <span role="cell" key={key} className="tabular text-p365-grey-600">
            {formatNumber(row.activeFileCount)}
          </span>
        )
      case 'used':
        return (
          <span role="cell" key={key} className="tabular font-semibold text-p365-navy">
            {formatBytes(row.storageUsedBytes)}
          </span>
        )
      case 'lastActivity':
        return (
          <span role="cell" key={key} className="tabular text-p365-grey-600">
            {row.lastActivityDate ?? t('table.never')}
          </span>
        )
      case 'template':
        return (
          <span role="cell" key={key} className="min-w-0 truncate text-p365-grey-600">
            {row.template ?? ''}
          </span>
        )
      case 'capacity':
        return (
          <span role="cell" key={key} className="tabular text-p365-grey-600">
            {row.allocatedBytes !== undefined && row.allocatedBytes > 0
              ? formatPercent(capacityRatio(row))
              : ''}
          </span>
        )
      case 'share': {
        const share = totalUsedBytes ? row.storageUsedBytes / totalUsedBytes : 0
        return (
          <span role="cell" key={key} className="flex items-center gap-2">
            <span className="tabular w-12 text-p365-grey-600">{formatPercent(share, 1)}</span>
            <span className="h-1.5 flex-1 rounded-full bg-p365-grey-50">
              <span
                className="block h-full rounded-full bg-p365-teal transition-[width] duration-300 ease-out"
                style={{ width: `${Math.min(100, share * 100)}%` }}
              />
            </span>
          </span>
        )
      }
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="relative flex-1">
          <span className="sr-only">{t('table.search', { label: tableLabel })}</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-p365-grey-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => changeSearch(e.target.value)}
            placeholder={t('table.searchPlaceholder')}
            aria-label={t('table.search', { label: tableLabel })}
            className="h-9 w-full max-w-sm rounded-lg border border-p365-grey-100 bg-white pr-3 pl-9 text-sm text-p365-navy outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-p365-grey-400 focus:border-p365-teal focus:ring-3 focus:ring-p365-teal/20"
          />
        </label>
        <span className="tabular text-sm text-p365-grey-500">
          {t('table.count', { visible: formatNumber(visible.length), total: formatNumber(rows.length) })}
        </span>
      </div>

      <div
        role="table"
        aria-label={tableLabel}
        aria-busy={searching || undefined}
        className={cn(
          'overflow-x-auto rounded-lg border border-p365-grey-100 bg-white transition-opacity duration-150 ease-out',
          searching && 'opacity-60',
        )}
      >
        <div className="min-w-[56rem]">
          <div
            role="row"
            className="grid items-center gap-2 border-b border-p365-grey-100 bg-p365-page px-4 py-2.5 text-xs font-semibold text-p365-grey-600"
            style={{ gridTemplateColumns: gridCols }}
          >
            {columns.map((key) => (
              <ColumnHeaderTooltip
                key={key}
                tooltip={helpOf(key)}
                header={
                  COLUMNS[key].sortable ? (
                    <button
                      type="button"
                      role="columnheader"
                      onClick={() => toggleSort(key)}
                      aria-sort={
                        key === sortKey ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined
                      }
                      className={cn(
                        'flex items-center gap-1 text-left transition-colors duration-150 ease-out hover:text-p365-navy',
                        key === sortKey && 'text-p365-navy',
                      )}
                    />
                  ) : (
                    <span role="columnheader" tabIndex={0} className="w-fit cursor-help" />
                  )
                }
              >
                {headerOf(key)}
                {sortIndicator(key)}
              </ColumnHeaderTooltip>
            ))}
          </div>

          {pageRows.map((row) => (
            <div
              key={row.id}
              role="row"
              className="grid items-center gap-2 border-b border-p365-grey-50 px-4 py-3 text-sm transition-colors duration-150 ease-out last:border-b-0 hover:bg-p365-page"
              style={{ gridTemplateColumns: gridCols }}
            >
              {columns.map((key) => renderCell(key, row))}
            </div>
          ))}
        </div>
      </div>

      <Pagination pagination={pagination} label={tableLabel} />
    </div>
  )
}
