import { describe, expect, it, vi } from 'vitest'
import type { StorageRow } from '@/types/storage'
import type { SiteDirectory } from '@/reports/siteDirectory'
import { NAMED_UP_FRONT, nameTopSites, topSitesByStorage } from './namedSites'

const site = (i: number, over: Partial<StorageRow> = {}): StorageRow => ({
  pool: 'SharePoint',
  id: `site-${i}`,
  url: '',
  ownerDisplayName: 'SharePoint Admin',
  storageUsedBytes: 1000 - i,
  fileCount: 1,
  activeFileCount: 0,
  lastActivityDate: null,
  isDeleted: false,
  ...over,
})

const estate = Array.from({ length: 120 }, (_, i) => site(i))

describe('topSitesByStorage', () => {
  it('takes the largest live sites and never a deleted one, however big', () => {
    const rows = [site(500, { storageUsedBytes: 1e9, isDeleted: true }), ...estate]
    const top = topSitesByStorage(rows)
    expect(top).toHaveLength(NAMED_UP_FRONT)
    expect(top[0].id).toBe('site-0')
    expect(top.at(-1)?.id).toBe('site-49')
    expect(top.some((row) => row.isDeleted)).toBe(false)
  })

  it('does not reorder the input', () => {
    const rows = [site(2), site(1)]
    topSitesByStorage(rows)
    expect(rows.map((row) => row.id)).toEqual(['site-2', 'site-1'])
  })
})

describe('nameTopSites', () => {
  it('asks the directory only for the top sites and merges what comes back', async () => {
    const getSiteDetails = vi.fn(
      async (ids: string[]): Promise<SiteDirectory> =>
        new Map(ids.slice(0, 1).map((id) => [id, { name: 'Biggest', url: 'https://c/sites/b' }])),
    )
    const named = await nameTopSites({ getSiteDetails }, estate)

    expect(getSiteDetails).toHaveBeenCalledTimes(1)
    expect(getSiteDetails.mock.calls[0][0]).toHaveLength(NAMED_UP_FRONT)
    expect(getSiteDetails.mock.calls[0][0][0]).toBe('site-0')
    expect(named[0]).toMatchObject({ id: 'site-0', name: 'Biggest', url: 'https://c/sites/b' })
    expect(named[1].name).toBeUndefined()
    expect(named).toHaveLength(estate.length)
  })

  it('skips the lookup when every top site is already named', async () => {
    const getSiteDetails = vi.fn(async () => new Map())
    const rows = [site(0, { name: 'Known' })]
    expect(await nameTopSites({ getSiteDetails }, rows)).toBe(rows)
    expect(getSiteDetails).not.toHaveBeenCalled()
  })
})
