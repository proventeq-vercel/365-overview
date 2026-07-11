import { useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { SharePointSite } from '@/types/reports'
import { formatBytes, formatNumber, formatPercent } from '@/lib/format'

interface SiteTableProps {
  sites: SharePointSite[]
  totalUsedBytes: number
}

type SortKey = 'used' | 'files' | 'active' | 'share'
type SortDir = 'asc' | 'desc'

function siteName(url: string): string {
  return url.replace(/\/$/, '').split('/').pop() || url
}

type Column =
  | { label: string; sortKey: SortKey }
  | { label: string; sortKey: null }

const COLUMNS: Column[] = [
  { label: 'Site', sortKey: null },
  { label: 'Owner', sortKey: null },
  { label: 'Files', sortKey: 'files' },
  { label: 'Active files', sortKey: 'active' },
  { label: 'Storage used', sortKey: 'used' },
  { label: 'Share', sortKey: 'share' },
]

export function SiteTable({ sites, totalUsedBytes }: SiteTableProps) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('used')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const parentRef = useRef<HTMLDivElement>(null)

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = q
      ? sites.filter(
          (s) =>
            s.siteUrl.toLowerCase().includes(q) ||
            s.ownerDisplayName.toLowerCase().includes(q),
        )
      : sites
    const value = (s: SharePointSite): number => {
      switch (sortKey) {
        case 'files':
          return s.fileCount
        case 'active':
          return s.activeFileCount
        default:
          return s.storageUsedBytes
      }
    }
    const sorted = [...filtered].sort((a, b) => {
      const diff = value(a) - value(b)
      return sortDir === 'asc' ? diff : -diff
    })
    return sorted
  }, [sites, search, sortKey, sortDir])

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 8,
  })

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sortIndicator = (key: SortKey) =>
    key === sortKey ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''

  const gridCols = 'minmax(0,2fr) minmax(0,1.5fr) 80px 96px 120px minmax(120px,1.4fr)'

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <label className="flex-1">
          <span className="sr-only">Search sites</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search site or owner"
            aria-label="Search sites"
            className="w-full max-w-sm rounded-md border border-hairline bg-transparent px-3 py-2 text-sm text-ink outline-none focus:border-ink-soft"
          />
        </label>
        <span className="text-sm text-muted-foreground tabular">
          {formatNumber(rows.length)} of {formatNumber(sites.length)} sites
        </span>
      </div>

      <div role="table" aria-label="Sites" className="rounded-lg border border-hairline">
        <div
          role="row"
          className="grid items-center gap-2 border-b border-hairline px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          style={{ gridTemplateColumns: gridCols }}
        >
          {COLUMNS.map((col, i) =>
            col.sortKey !== null ? (
              <button
                key={i}
                type="button"
                role="columnheader"
                onClick={() => toggleSort(col.sortKey)}
                className="flex items-center text-left uppercase tracking-wide hover:text-ink"
              >
                {col.label}
                {sortIndicator(col.sortKey)}
              </button>
            ) : (
              <span key={i} role="columnheader">
                {col.label}
              </span>
            ),
          )}
        </div>

        <div ref={parentRef} style={{ height: 480, overflow: 'auto' }}>
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
            {virtualizer.getVirtualItems().map((vitem) => {
              const site = rows[vitem.index]
              const share = totalUsedBytes ? site.storageUsedBytes / totalUsedBytes : 0
              return (
                <div
                  key={site.siteId}
                  role="row"
                  className="absolute left-0 top-0 grid w-full items-center gap-2 border-b border-hairline px-4 text-sm"
                  style={{
                    height: vitem.size,
                    transform: `translateY(${vitem.start}px)`,
                    gridTemplateColumns: gridCols,
                  }}
                >
                  <span role="cell" className="min-w-0">
                    <span className="block truncate font-medium text-ink">{siteName(site.siteUrl)}</span>
                    <span className="block truncate text-xs text-muted-foreground" title={site.siteUrl}>
                      {site.siteUrl}
                    </span>
                  </span>
                  <span role="cell" className="min-w-0 truncate text-ink-soft">
                    {site.ownerDisplayName}
                  </span>
                  <span role="cell" className="tabular text-ink-soft">
                    {formatNumber(site.fileCount)}
                  </span>
                  <span role="cell" className="tabular text-ink-soft">
                    {formatNumber(site.activeFileCount)}
                  </span>
                  <span role="cell" className="tabular text-ink">
                    {formatBytes(site.storageUsedBytes)}
                  </span>
                  <span role="cell" className="flex items-center gap-2">
                    <span className="tabular text-ink-soft">{formatPercent(share, 1)}</span>
                    <span className="h-1.5 flex-1 rounded-full bg-hairline">
                      <span
                        className="block h-full rounded-full bg-[#34a1a0]"
                        style={{ width: `${Math.min(100, share * 100)}%` }}
                      />
                    </span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
