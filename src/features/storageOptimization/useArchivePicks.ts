import { useCallback, useMemo, useState } from 'react'
import { toggleId } from '@/lib/archive'
import type { StorageOverview, StorageRow } from '@/types/storage'

const NO_SITES: StorageRow[] = []

const sumBytes = (rows: StorageRow[]) => rows.reduce((total, row) => total + row.storageUsedBytes, 0)

export function useArchivePicks(overview: StorageOverview) {
  const [picks, setPicks] = useState({ source: overview, sites: NO_SITES })
  const picked = picks.source === overview ? picks.sites : NO_SITES
  const archivedBytes = useMemo(() => sumBytes(picked), [picked])
  const setPicked = useCallback(
    (sites: StorageRow[]) => setPicks({ source: overview, sites }),
    [overview],
  )
  return { picked, archivedBytes, setPicked }
}

export function useArchiveDraft(sites: StorageRow[], picked: StorageRow[]) {
  const [ids, setIds] = useState(() => new Set(picked.map((site) => site.id)))
  const chosen = useMemo(() => sites.filter((site) => ids.has(site.id)), [sites, ids])
  const allChosen = sites.length > 0 && chosen.length === sites.length
  const toggle = useCallback((id: string) => setIds((current) => toggleId(current, id)), [])
  const toggleAll = useCallback(
    () => setIds(allChosen ? new Set() : new Set(sites.map((site) => site.id))),
    [allChosen, sites],
  )
  return { ids, chosen, chosenBytes: sumBytes(chosen), allChosen, toggle, toggleAll }
}
