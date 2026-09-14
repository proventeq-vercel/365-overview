import { useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ChevronDown, ChevronUp, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { rowName } from '@/lib/rowName'
import type { StorageRow } from '@/types/storage'
import { formatBytes, formatNumber, formatPercent } from '@/lib/format'
import { useTranslation, type TranslateKey } from '@/hooks/useTranslation'

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
}

type SortDir = 'asc' | 'desc'

interface ColumnSpec {
  label: TranslateKey
  sortable: boolean
  width: string
  sortValue?: (row: StorageRow) => number
}

const capacityRatio = (row: StorageRow): number =>
  row.allocatedBytes !== undefined && row.allocatedBytes > 0
    ? row.storageUsedBytes / row.allocatedBytes
    : 0

const COLUMNS: Record<ColumnKey, ColumnSpec> = {
  name: { label: 'table.column.site', sortable: false, width: 'minmax(0,2fr)' },
  owner: { label: 'table.column.owner', sortable: false, width: 'minmax(0,1.5fr)' },
  files: { label: 'table.column.files', sortable: true, width: '80px', sortValue: (r) => r.fileCount },
  active: {
    label: 'table.column.active',
    sortable: true,
    width: '96px',
    sortValue: (r) => r.activeFileCount,
  },
  used: {
    label: 'table.column.used',
    sortable: true,
    width: '120px',
    sortValue: (r) => r.storageUsedBytes,
  },
  share: {
    label: 'table.column.share',
    sortable: true,
    width: 'minmax(120px,1.4fr)',
    sortValue: (r) => r.storageUsedBytes,
  },
  lastActivity: {
    label: 'table.column.lastActivity',
    sortable: true,
    width: '120px',
    sortValue: (r) => (r.lastActivityDate ? Date.parse(r.lastActivityDate) : 0),
  },
  template: { label: 'table.column.template', sortable: false, width: 'minmax(0,1fr)' },
  capacity: {
    label: 'table.column.capacity',
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
}: SiteTableProps) {
  const t = useTranslation()
  const tableLabel = label ?? t('table.sites')
  const nameLabel = nameHeader ?? t('table.column.site')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<ColumnKey>(DEFAULT_SORT)
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const parentRef = useRef<HTMLDivElement>(null)

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase()
    const filtered = query
      ? rows.filter(
          (row) =>
            row.url.toLowerCase().includes(query) ||
            row.ownerDisplayName.toLowerCase().includes(query),
        )
      : rows
    const sortValue = COLUMNS[sortKey].sortValue ?? COLUMNS[DEFAULT_SORT].sortValue!
    return [...filtered].sort((a, b) => {
      const diff = sortValue(a) - sortValue(b)
      return sortDir === 'asc' ? diff : -diff
    })
  }, [rows, search, sortKey, sortDir])

  const virtualizer = useVirtualizer({
    count: visible.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 8,
  })

  function toggleSort(key: ColumnKey) {
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

  function renderCell(key: ColumnKey, row: StorageRow) {
    switch (key) {
      case 'name':
        return (
          <span role="cell" key={key} className="min-w-0">
            <span className="block truncate font-semibold text-p365-navy">
              {rowName(row.url, row.ownerDisplayName)}
            </span>
            {row.url !== '' && (
              <span className="block truncate text-xs text-p365-grey-500" title={row.url}>
                {row.url}
              </span>
            )}
          </span>
        )
      case 'owner':
        return (
          <span role="cell" key={key} className="min-w-0 truncate text-p365-grey-600">
            {row.ownerDisplayName}
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
            onChange={(e) => setSearch(e.target.value)}
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
        className="overflow-x-auto rounded-lg border border-p365-grey-100 bg-white"
      >
        <div className="min-w-[56rem]">
          <div
            role="row"
            className="grid items-center gap-2 border-b border-p365-grey-100 bg-p365-page px-4 py-2.5 text-xs font-semibold text-p365-grey-600"
            style={{ gridTemplateColumns: gridCols }}
          >
            {columns.map((key) =>
              COLUMNS[key].sortable ? (
                <button
                  key={key}
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
                >
                  {headerOf(key)}
                  {sortIndicator(key)}
                </button>
              ) : (
                <span key={key} role="columnheader">
                  {headerOf(key)}
                </span>
              ),
            )}
          </div>

          <div ref={parentRef} style={{ height: 480, overflow: 'auto' }}>
            <div
              style={{
                height: virtualizer.getTotalSize(),
                position: 'relative',
                width: '100%',
              }}
            >
              {virtualizer.getVirtualItems().map((item) => {
                const row = visible[item.index]
                return (
                  <div
                    key={row.id}
                    role="row"
                    className="absolute top-0 left-0 grid w-full items-center gap-2 border-b border-p365-grey-50 px-4 text-sm transition-colors duration-150 ease-out hover:bg-p365-page"
                    style={{
                      height: item.size,
                      transform: `translateY(${item.start}px)`,
                      gridTemplateColumns: gridCols,
                    }}
                  >
                    {columns.map((key) => renderCell(key, row))}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
