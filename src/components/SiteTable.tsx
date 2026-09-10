import { useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { StorageRow } from '@/types/storage'
import { formatBytes, formatNumber, formatPercent } from '@/lib/format'

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
}

type SortDir = 'asc' | 'desc'

function rowName(url: string, fallback: string): string {
  return url.replace(/\/$/, '').split('/').pop() || fallback
}

interface ColumnSpec {
  label: string
  sortable: boolean
  width: string
  sortValue?: (row: StorageRow) => number
}

const capacityRatio = (row: StorageRow): number =>
  row.allocatedBytes !== undefined && row.allocatedBytes > 0
    ? row.storageUsedBytes / row.allocatedBytes
    : 0

const COLUMNS: Record<ColumnKey, ColumnSpec> = {
  name: { label: 'Site', sortable: false, width: 'minmax(0,2fr)' },
  owner: { label: 'Owner', sortable: false, width: 'minmax(0,1.5fr)' },
  files: { label: 'Files', sortable: true, width: '80px', sortValue: (r) => r.fileCount },
  active: {
    label: 'Active files',
    sortable: true,
    width: '96px',
    sortValue: (r) => r.activeFileCount,
  },
  used: {
    label: 'Storage used',
    sortable: true,
    width: '120px',
    sortValue: (r) => r.storageUsedBytes,
  },
  share: {
    label: 'Share',
    sortable: true,
    width: 'minmax(120px,1.4fr)',
    sortValue: (r) => r.storageUsedBytes,
  },
  lastActivity: {
    label: 'Last activity',
    sortable: true,
    width: '120px',
    sortValue: (r) => (r.lastActivityDate ? Date.parse(r.lastActivityDate) : 0),
  },
  template: { label: 'Template', sortable: false, width: 'minmax(0,1fr)' },
  capacity: {
    label: 'Capacity used',
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
  label = 'Sites',
}: SiteTableProps) {
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

  const sortIndicator = (key: ColumnKey) =>
    key === sortKey ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''

  const gridCols = columns.map((key) => COLUMNS[key].width).join(' ')

  function renderCell(key: ColumnKey, row: StorageRow) {
    switch (key) {
      case 'name':
        return (
          <span role="cell" key={key} className="min-w-0">
            <span className="block truncate font-medium text-ink">
              {rowName(row.url, row.ownerDisplayName)}
            </span>
            <span className="block truncate text-xs text-muted-foreground" title={row.url}>
              {row.url}
            </span>
          </span>
        )
      case 'owner':
        return (
          <span role="cell" key={key} className="min-w-0 truncate text-ink-soft">
            {row.ownerDisplayName}
          </span>
        )
      case 'files':
        return (
          <span role="cell" key={key} className="tabular text-ink-soft">
            {formatNumber(row.fileCount)}
          </span>
        )
      case 'active':
        return (
          <span role="cell" key={key} className="tabular text-ink-soft">
            {formatNumber(row.activeFileCount)}
          </span>
        )
      case 'used':
        return (
          <span role="cell" key={key} className="tabular text-ink">
            {formatBytes(row.storageUsedBytes)}
          </span>
        )
      case 'lastActivity':
        return (
          <span role="cell" key={key} className="tabular text-ink-soft">
            {row.lastActivityDate ?? 'Never'}
          </span>
        )
      case 'template':
        return (
          <span role="cell" key={key} className="min-w-0 truncate text-ink-soft">
            {row.template ?? ''}
          </span>
        )
      case 'capacity':
        return (
          <span role="cell" key={key} className="tabular text-ink-soft">
            {row.allocatedBytes !== undefined && row.allocatedBytes > 0
              ? formatPercent(capacityRatio(row))
              : ''}
          </span>
        )
      case 'share': {
        const share = totalUsedBytes ? row.storageUsedBytes / totalUsedBytes : 0
        return (
          <span role="cell" key={key} className="flex items-center gap-2">
            <span className="tabular text-ink-soft">{formatPercent(share, 1)}</span>
            <span className="h-1.5 flex-1 rounded-full bg-hairline">
              <span
                className="block h-full rounded-full bg-brand"
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
      <div className="flex items-center justify-between gap-4">
        <label className="flex-1">
          <span className="sr-only">Search {label}</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or owner"
            aria-label={`Search ${label}`}
            className="w-full max-w-sm rounded-md border border-hairline bg-transparent px-3 py-2 text-sm text-ink outline-none focus:border-ink-soft"
          />
        </label>
        <span className="text-sm text-muted-foreground tabular">
          {formatNumber(visible.length)} of {formatNumber(rows.length)}
        </span>
      </div>

      <div role="table" aria-label={label} className="rounded-lg border border-hairline">
        <div
          role="row"
          className="grid items-center gap-2 border-b border-hairline px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          style={{ gridTemplateColumns: gridCols }}
        >
          {columns.map((key) =>
            COLUMNS[key].sortable ? (
              <button
                key={key}
                type="button"
                role="columnheader"
                onClick={() => toggleSort(key)}
                className="flex items-center text-left uppercase tracking-wide hover:text-ink"
              >
                {COLUMNS[key].label}
                {sortIndicator(key)}
              </button>
            ) : (
              <span key={key} role="columnheader">
                {COLUMNS[key].label}
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
                  className="absolute left-0 top-0 grid w-full items-center gap-2 border-b border-hairline px-4 text-sm"
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
  )
}
