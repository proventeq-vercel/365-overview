import { useCallback, useState } from 'react'

export const PAGE_SIZE_OPTIONS = [50, 100, 250, 500] as const
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number]
export const DEFAULT_PAGE_SIZE: PageSize = PAGE_SIZE_OPTIONS[0]

export function parsePageSize(value: string | null): PageSize | null {
  return PAGE_SIZE_OPTIONS.find((size) => String(size) === value) ?? null
}

export interface PageWindow {
  page: number
  pageCount: number
  start: number
  end: number
  from: number
  to: number
}

export function pageWindow(total: number, requestedPage: number, pageSize: number): PageWindow {
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(Math.max(0, requestedPage), pageCount - 1)
  const start = page * pageSize
  const end = Math.min(total, start + pageSize)
  return { page, pageCount, start, end, from: total === 0 ? 0 : start + 1, to: end }
}

export interface Pagination extends PageWindow {
  total: number
  pageSize: PageSize
  setPage: (page: number) => void
  setPageSize: (size: PageSize) => void
  reset: () => void
}

export function usePagination(total: number): Pagination {
  const [requestedPage, setPage] = useState(0)
  const [pageSize, setSize] = useState<PageSize>(DEFAULT_PAGE_SIZE)
  const reset = useCallback(() => setPage(0), [])
  const setPageSize = useCallback((size: PageSize) => {
    setSize(size)
    setPage(0)
  }, [])
  return {
    ...pageWindow(total, requestedPage, pageSize),
    total,
    pageSize,
    setPage,
    setPageSize,
    reset,
  }
}
