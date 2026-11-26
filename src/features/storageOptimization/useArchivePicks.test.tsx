import { describe, it, expect } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { StorageOverview, StorageRow } from '@/types/storage'
import { useArchiveDraft, useArchivePicks } from './useArchivePicks'
import { base } from './testFixtures'

const GB = 1_073_741_824

const site = (id: string, usedGb: number): StorageRow => ({
  pool: 'SharePoint',
  id,
  url: `https://contoso.sharepoint.com/sites/${id}`,
  ownerDisplayName: '',
  storageUsedBytes: usedGb * GB,
  fileCount: 0,
  activeFileCount: 0,
  lastActivityDate: '2021-03-03',
  isDeleted: false,
})

const old = site('old', 30)
const team = site('team', 10)

const overviewWith = (sites: StorageRow[], over: Partial<StorageOverview> = {}): StorageOverview => ({
  ...base,
  ...over,
  archive: { ...base.archive, sites },
})

describe('useArchivePicks', () => {
  it('keeps the picks when the overview is rebuilt with the same sites', () => {
    const { result, rerender } = renderHook(({ overview }) => useArchivePicks(overview), {
      initialProps: { overview: overviewWith([old, team]) },
    })
    act(() => result.current.setPickedIds(new Set(['old'])))
    expect(result.current.impact.archivedBytes).toBe(30 * GB)

    rerender({ overview: overviewWith([old, team], { cost: { ...base.cost, currency: 'USD' } }) })
    expect(result.current.impact.picked.map((row) => row.id)).toEqual(['old'])
    expect(result.current.impact.archivedBytes).toBe(30 * GB)
  })

  it('drops a picked site that leaves the archivable sites', () => {
    const { result, rerender } = renderHook(({ overview }) => useArchivePicks(overview), {
      initialProps: { overview: overviewWith([old, team]) },
    })
    act(() => result.current.setPickedIds(new Set(['old', 'team'])))
    expect(result.current.impact.archivedBytes).toBe(40 * GB)

    rerender({ overview: overviewWith([team]) })
    expect(result.current.impact.picked.map((row) => row.id)).toEqual(['team'])
    expect(result.current.impact.archivedBytes).toBe(10 * GB)
  })
})

describe('useArchiveDraft', () => {
  it('starts from the picks, toggles one site and selects every site at once', () => {
    const sites = [old, team]
    const { result } = renderHook(() => useArchiveDraft(sites, new Set(['old'])))
    expect(result.current.chosenBytes).toBe(30 * GB)
    expect(result.current.allChosen).toBe(false)

    act(() => result.current.toggle('team'))
    expect([...result.current.chosenIds]).toEqual(['old', 'team'])
    expect(result.current.allChosen).toBe(true)

    act(() => result.current.toggleAll())
    expect(result.current.chosen).toEqual([])

    act(() => result.current.toggleAll())
    expect(result.current.chosenBytes).toBe(40 * GB)
  })
})
