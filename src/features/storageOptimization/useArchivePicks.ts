import { useCallback, useMemo, useState } from 'react'
import { toggleId } from '@/lib/archive'
import { buildArchiveImpact } from '@/model/archiveImpact'
import { sumBytes } from '@/model/storageOverview'
import type { StorageOverview, StorageRow } from '@/types/storage'

const NO_IDS: ReadonlySet<string> = new Set()

export function useArchivePicks(overview: StorageOverview) {
  const [pickedIds, setPickedIds] = useState(NO_IDS)
  const impact = useMemo(() => buildArchiveImpact(overview, pickedIds), [overview, pickedIds])
  return { impact, pickedIds, setPickedIds }
}

export function useArchiveDraft(sites: StorageRow[], pickedIds: ReadonlySet<string>) {
  const [ids, setIds] = useState(pickedIds)
  const chosen = useMemo(() => sites.filter((site) => ids.has(site.id)), [sites, ids])
  const chosenIds = useMemo(() => new Set(chosen.map((site) => site.id)), [chosen])
  const chosenBytes = useMemo(() => sumBytes(chosen), [chosen])
  const allChosen = sites.length > 0 && chosen.length === sites.length
  const toggle = useCallback((id: string) => setIds((current) => toggleId(current, id)), [])
  const toggleAll = useCallback(
    () => setIds(allChosen ? new Set() : new Set(sites.map((site) => site.id))),
    [allChosen, sites],
  )
  return { ids, chosen, chosenIds, chosenBytes, allChosen, toggle, toggleAll }
}
