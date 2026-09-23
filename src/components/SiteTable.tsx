import { useDeferredValue, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buildSearchIndex, normaliseQuery, searchOrder, sortOrder } from '@/lib/rowSearch'
import type { SortDirection } from '@/lib/rowSearch'
import type { StorageRow } from '@/types/storage'
import { formatNumber } from '@/lib/format'
import { useTranslation } from '@/hooks/useTranslation'
import { usePagination } from '@/hooks/usePagination'
import { useKnownSites, useSiteDetails } from '@/hooks/useSiteDetails'
import { Pagination } from '@/design/Pagination'
import { ColumnHeaderTooltip } from '@/design/ColumnHeaderTooltip'
import { COLUMNS, DEFAULT_SORT, type ColumnKey } from './siteTableColumns'
import { SiteTableCell } from './SiteTableCell'

interface SiteTableProps {
  rows: StorageRow[]
  shareTotalBytes?: number
  columns: ColumnKey[]
  label?: string
  nameHeader?: string
  nameHelp?: string
}


export function SiteTable({
  rows,
  shareTotalBytes = 0,
  columns,
  label,
  nameHeader,
  nameHelp,
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

          {pageRows.map((row, index) => (
            <div
              key={`${row.pool}:${row.id}:${index}`}
              role="row"
              className="grid items-center gap-2 border-b border-p365-grey-50 px-4 py-3 text-sm transition-colors duration-150 ease-out last:border-b-0 hover:bg-p365-page"
              style={{ gridTemplateColumns: gridCols }}
            >
              {columns.map((key) => (
                <SiteTableCell
                  key={key}
                  column={key}
                  row={row}
                  shareTotalBytes={shareTotalBytes}
                  namesPending={namesPending}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <Pagination pagination={pagination} label={tableLabel} />
    </div>
  )
}
