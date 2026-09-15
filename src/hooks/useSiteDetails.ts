import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { QueryCache } from '@tanstack/react-query'
import { useDataSource } from '../data/useDataSource'
import { unresolvedSiteIds, withSiteDirectory } from '../reports/siteDirectory'
import type { SiteDirectory } from '../reports/siteDirectory'
import type { StorageRow } from '../types/storage'

const NO_SITES: SiteDirectory = new Map()

const SITE_DETAILS_KEY = 'siteDetails'

export function useSiteDetails(rows: StorageRow[]) {
  const ds = useDataSource()
  const ids = useMemo(() => unresolvedSiteIds(rows), [rows])
  const query = useQuery({
    queryKey: [SITE_DETAILS_KEY, ids],
    queryFn: () => ds.getSiteDetails(ids),
    enabled: ids.length > 0,
    staleTime: Infinity,
  })
  const directory = query.data ?? NO_SITES
  const named = useMemo(() => withSiteDirectory(rows, directory), [rows, directory])
  return { rows: named, isPending: ids.length > 0 && query.isPending }
}

const resolvedSiteQueries = (cache: QueryCache) =>
  cache.findAll({ queryKey: [SITE_DETAILS_KEY] }).filter((query) => query.state.data !== undefined)

export function useKnownSites(): SiteDirectory {
  const cache = useQueryClient().getQueryCache()
  const snapshot = useRef({ key: '', known: NO_SITES })
  const subscribe = useCallback(
    (onChange: () => void) =>
      cache.subscribe((event) => {
        if (event.type === 'updated' && event.query.queryKey[0] === SITE_DETAILS_KEY) onChange()
      }),
    [cache],
  )
  const getSnapshot = useCallback(() => {
    const queries = resolvedSiteQueries(cache)
    const key = queries.map((query) => query.state.dataUpdatedAt).join(',')
    if (key !== snapshot.current.key) {
      const known: SiteDirectory = new Map()
      for (const query of queries) {
        const directory = query.state.data as SiteDirectory
        directory.forEach((site, id) => known.set(id, site))
      }
      snapshot.current = { key, known }
    }
    return snapshot.current.known
  }, [cache])
  return useSyncExternalStore(subscribe, getSnapshot)
}
