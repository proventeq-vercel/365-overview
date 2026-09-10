import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface VirtualColumn<T> {
  key: string
  header: string
  width: string
  render: (row: T) => ReactNode
  sortValue?: (row: T) => number
  align?: 'left' | 'right'
}

interface SiteTableProps<T> {
  rows: T[]
  columns: VirtualColumn<T>[]
  getRowKey: (row: T) => string
  searchText: (row: T) => string
  defaultSortKey: string
  ariaLabel: string
  searchPlaceholder: string
  unitLabel: string
  rowHeight?: number
  height?: number
}

type SortDir = 'asc' | 'desc'

export function SiteTable<T>({
  rows,
  columns,
  getRowKey,
  searchText,
  defaultSortKey,
  ariaLabel,
  searchPlaceholder,
  unitLabel,
  rowHeight = 52,
  height = 480,
}: SiteTableProps<T>) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState(defaultSortKey)
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const parentRef = useRef<HTMLDivElement>(null)

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = q ? rows.filter((row) => searchText(row).toLowerCase().includes(q)) : rows
    const sortValue = columns.find((c) => c.key === sortKey)?.sortValue
    if (!sortValue) return filtered
    return [...filtered].sort((a, b) => {
      const diff = sortValue(a) - sortValue(b)
      return sortDir === 'asc' ? diff : -diff
    })
  }, [rows, columns, search, searchText, sortKey, sortDir])

  const virtualizer = useVirtualizer({
    count: visible.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 8,
  })

  function toggleSort(key: string) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDir('desc')
  }

  const sortIndicator = (key: string) =>
    key === sortKey ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''

  const gridCols = columns.map((c) => c.width).join(' ')

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <label className="flex-1">
          <span className="sr-only">{searchPlaceholder}</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="w-full max-w-sm rounded-md border border-hairline bg-transparent px-3 py-2 text-sm text-ink outline-none focus:border-ink-soft"
          />
        </label>
        <span className="text-sm text-muted-foreground tabular">
          {formatNumber(visible.length)} of {formatNumber(rows.length)} {unitLabel}
        </span>
      </div>

      <div role="table" aria-label={ariaLabel} className="rounded-lg border border-hairline">
        <div
          role="row"
          className="grid items-center gap-2 border-b border-hairline px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          style={{ gridTemplateColumns: gridCols }}
        >
          {columns.map((col) =>
            col.sortValue ? (
              <button
                key={col.key}
                type="button"
                role="columnheader"
                onClick={() => toggleSort(col.key)}
                className={cn(
                  'flex items-center uppercase tracking-wide hover:text-ink',
                  col.align === 'right' ? 'justify-end text-right' : 'text-left',
                )}
              >
                {col.header}
                {sortIndicator(col.key)}
              </button>
            ) : (
              <span
                key={col.key}
                role="columnheader"
                className={col.align === 'right' ? 'text-right' : undefined}
              >
                {col.header}
              </span>
            ),
          )}
        </div>

        <div ref={parentRef} style={{ height, overflow: 'auto' }}>
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
            {virtualizer.getVirtualItems().map((vitem) => {
              const row = visible[vitem.index]
              return (
                <div
                  key={getRowKey(row)}
                  role="row"
                  className="absolute left-0 top-0 grid w-full items-center gap-2 border-b border-hairline px-4 text-sm"
                  style={{
                    height: vitem.size,
                    transform: `translateY(${vitem.start}px)`,
                    gridTemplateColumns: gridCols,
                  }}
                >
                  {columns.map((col) => (
                    <span
                      key={col.key}
                      role="cell"
                      className={cn('min-w-0', col.align === 'right' && 'text-right')}
                    >
                      {col.render(row)}
                    </span>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
