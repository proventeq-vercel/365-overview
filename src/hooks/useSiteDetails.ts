import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDataSource } from '../data/useDataSource'
import { unresolvedSiteIds, withSiteDirectory } from '../reports/siteDirectory'
import type { SiteDirectory } from '../reports/siteDirectory'
import type { StorageRow } from '../types/storage'

const NO_SITES: SiteDirectory = new Map()

export function useSiteDetails(rows: StorageRow[]) {
  const ds = useDataSource()
  const ids = useMemo(() => unresolvedSiteIds(rows), [rows])
  const query = useQuery({
    queryKey: ['siteDetails', ids],
    queryFn: () => ds.getSiteDetails(ids),
    enabled: ids.length > 0,
    staleTime: Infinity,
  })
  const directory = query.data ?? NO_SITES
  const named = useMemo(() => withSiteDirectory(rows, directory), [rows, directory])
  return { rows: named, isPending: ids.length > 0 && query.isPending }
}
