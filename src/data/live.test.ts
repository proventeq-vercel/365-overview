import { describe, it, expect, vi } from 'vitest'
import { createLiveDataSource } from './live'
import type { GraphClient } from '../clients/graphClient'

function recordingGraph() {
  const urls: string[] = []
  const graph: GraphClient = {
    get: vi.fn(async (path: string) => {
      urls.push(path)
      return { value: [] } as unknown
    }) as GraphClient['get'],
    getAllPages: vi.fn(async (path: string) => {
      urls.push(path)
      return [] as unknown[]
    }) as GraphClient['getAllPages'],
    batchGet: vi.fn(async (paths: string[]) => {
      urls.push(...paths)
      return paths.map(() => ({ status: 404 }))
    }) as GraphClient['batchGet'],
  }
  return { graph, urls }
}

const FINANCE_ID = '8f3c1a2b-9d4e-4f60-a1b2-c3d4e5f60718'
const finance = {
  status: 200,
  body: { displayName: 'Finance', webUrl: 'https://contoso.sharepoint.com/sites/finance' },
}

const BETA = 'https://graph.microsoft.com/beta/reports/'

describe('createLiveDataSource', () => {
  it.each([
    ['getSites', (ds: DataSourceUnderTest) => ds.getSites()],
    ['getDrives', (ds: DataSourceUnderTest) => ds.getDrives()],
    ['getSharePointTrend', (ds: DataSourceUnderTest) => ds.getSharePointTrend()],
    ['getOneDriveTrend', (ds: DataSourceUnderTest) => ds.getOneDriveTrend()],
  ])('%s targets the /beta reports endpoint with JSON format', async (_name, call) => {
    const { graph, urls } = recordingGraph()
    await call(createLiveDataSource(graph))

    expect(urls.length).toBeGreaterThan(0)
    for (const url of urls) {
      expect(url.startsWith(BETA)).toBe(true)
      expect(url).toContain('$format=application/json')
    }
  })

  it('asks every report for the six-month period the forecast needs', async () => {
    const { graph, urls } = recordingGraph()
    const ds = createLiveDataSource(graph)
    await Promise.all([
      ds.getSites(),
      ds.getDrives(),
      ds.getSharePointTrend(),
      ds.getOneDriveTrend(),
    ])
    expect(urls).toHaveLength(4)
    for (const url of urls) expect(url).toContain("(period='D180')")
  })

  it('leaves the non-report calls on the v1.0 base', async () => {
    const { graph, urls } = recordingGraph()
    const ds = createLiveDataSource(graph)
    await ds.getLicenses()
    expect(urls).toEqual(['/subscribedSkus'])
  })

  it('fetches the site report again after a failed attempt instead of replaying the failure', async () => {
    const { graph } = recordingGraph()
    const getAllPages = graph.getAllPages as ReturnType<typeof vi.fn>
    getAllPages.mockRejectedValueOnce(new Error('503 from Graph'))
    const ds = createLiveDataSource(graph)

    await expect(ds.getSites()).rejects.toThrow('503 from Graph')
    await expect(ds.getSites()).resolves.toEqual([])
    expect(graph.getAllPages).toHaveBeenCalledTimes(2)
  })

  it('shares one paged site fetch between the rows and the refresh date', async () => {
    const { graph, urls } = recordingGraph()
    const ds = createLiveDataSource(graph)
    await Promise.all([ds.getSites(), ds.getReportRefreshDate()])
    expect(urls).toHaveLength(1)
    expect(graph.getAllPages).toHaveBeenCalledTimes(1)
  })

  describe('getSiteDetails', () => {
    it('resolves each site by the id the usage report carries, through one batch, never a tenant-wide walk', async () => {
      const { graph } = recordingGraph()
      const batchGet = graph.batchGet as ReturnType<typeof vi.fn>
      batchGet.mockResolvedValueOnce([finance, { status: 404 }])
      const ds = createLiveDataSource(graph)

      const found = await ds.getSiteDetails([FINANCE_ID, 'gone'])

      expect(batchGet).toHaveBeenCalledTimes(1)
      expect(graph.getAllPages).not.toHaveBeenCalled()
      expect(batchGet.mock.calls[0][0]).toEqual([
        `/sites/${FINANCE_ID}?$select=id,displayName,webUrl`,
        '/sites/gone?$select=id,displayName,webUrl',
      ])
      expect([...found.entries()]).toEqual([
        [FINANCE_ID, { name: 'Finance', url: 'https://contoso.sharepoint.com/sites/finance' }],
      ])
    })

    it('remembers found and definitively missing sites, so paging back costs no request', async () => {
      const { graph } = recordingGraph()
      const batchGet = graph.batchGet as ReturnType<typeof vi.fn>
      batchGet.mockResolvedValueOnce([finance, { status: 404 }, { status: 403 }])
      const ds = createLiveDataSource(graph)

      await ds.getSiteDetails([FINANCE_ID, 'gone', 'forbidden'])
      const again = await ds.getSiteDetails([FINANCE_ID.toUpperCase(), 'gone', 'forbidden'])

      expect(batchGet).toHaveBeenCalledTimes(1)
      expect(again.get(FINANCE_ID)?.name).toBe('Finance')
      expect(again.size).toBe(1)
    })

    it('asks again for a site whose lookup was throttled or failed', async () => {
      const { graph } = recordingGraph()
      const batchGet = graph.batchGet as ReturnType<typeof vi.fn>
      batchGet.mockResolvedValueOnce([{ status: 429 }]).mockResolvedValueOnce([finance])
      const ds = createLiveDataSource(graph)

      expect((await ds.getSiteDetails([FINANCE_ID])).size).toBe(0)
      expect((await ds.getSiteDetails([FINANCE_ID])).get(FINANCE_ID)?.name).toBe('Finance')
      expect(batchGet).toHaveBeenCalledTimes(2)
    })

    it('only fetches the ids it has not seen, de-duplicated', async () => {
      const { graph } = recordingGraph()
      const batchGet = graph.batchGet as ReturnType<typeof vi.fn>
      batchGet.mockResolvedValueOnce([finance]).mockResolvedValueOnce([{ status: 404 }])
      const ds = createLiveDataSource(graph)

      await ds.getSiteDetails([FINANCE_ID])
      await ds.getSiteDetails([FINANCE_ID, 'new', 'NEW'])

      expect(batchGet.mock.calls[1][0]).toEqual(['/sites/new?$select=id,displayName,webUrl'])
    })
  })
})

type DataSourceUnderTest = ReturnType<typeof createLiveDataSource>
