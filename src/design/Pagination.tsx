import { useId } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useTranslation } from '@/hooks/useTranslation'
import {
  PAGE_SIZE_OPTIONS,
  parsePageSize,
  type Pagination as PaginationState,
} from '@/hooks/usePagination'
import { formatNumber } from '@/lib/format'

interface PaginationProps {
  pagination: PaginationState
  label: string
}

export function Pagination({ pagination, label }: PaginationProps) {
  const t = useTranslation()
  const sizeId = useId()
  const { page, pageCount, pageSize, from, to, total, setPage, setPageSize } = pagination
  const first = page === 0
  const last = page >= pageCount - 1

  const jump = (name: 'first' | 'previous' | 'next' | 'last', target: number, disabled: boolean) => (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      aria-label={t(`pagination.jump.${name}`)}
      title={t(`pagination.jump.${name}`)}
      disabled={disabled}
      onClick={() => setPage(target)}
    >
      {name === 'first' && <ChevronsLeft aria-hidden="true" />}
      {name === 'previous' && <ChevronLeft aria-hidden="true" />}
      {name === 'next' && <ChevronRight aria-hidden="true" />}
      {name === 'last' && <ChevronsRight aria-hidden="true" />}
    </Button>
  )

  return (
    <nav
      aria-label={t('pagination.label', { label })}
      className="flex flex-wrap items-center justify-between gap-3 text-sm text-p365-grey-600"
    >
      <div className="flex items-center gap-2">
        <label htmlFor={sizeId}>{t('pagination.rowsPerPage')}</label>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => {
            const size = parsePageSize(value)
            if (size !== null) setPageSize(size)
          }}
        >
          <SelectTrigger id={sizeId} size="sm" className="bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false}>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-3">
        <span className="tabular" aria-live="polite">
          {total === 0
            ? t('pagination.none')
            : t('pagination.range', {
                from: formatNumber(from),
                to: formatNumber(to),
                total: formatNumber(total),
              })}
        </span>
        <div className="flex items-center gap-1">
          {jump('first', 0, first)}
          {jump('previous', page - 1, first)}
          {jump('next', page + 1, last)}
          {jump('last', pageCount - 1, last)}
        </div>
      </div>
    </nav>
  )
}
