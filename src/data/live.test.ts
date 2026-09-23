import { beforeEach, describe, it, expect, vi } from 'vitest'
import { createLiveDataSource } from './live'
import { ApiError } from '../clients/apiError'
import { siteDirectoryPath } from '../reports/siteDirectory'
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

const BETA = '/beta/reports/'

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

  it('re-reads the site report on the next request once the first has settled, so Refresh data is a refresh', async () => {
    const { graph } = recordingGraph()
    const ds = createLiveDataSource(graph)
    await Promise.all([ds.getSites(), ds.getReportRefreshDate()])
    await ds.getSites()
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

    it('shares an in-flight lookup between overlapping callers instead of asking Graph twice', async () => {
      const { graph } = recordingGraph()
      const batchGet = graph.batchGet as ReturnType<typeof vi.fn>
      batchGet.mockResolvedValueOnce([finance]).mockResolvedValueOnce([{ status: 404 }])
      const ds = createLiveDataSource(graph)

      const [first, second] = await Promise.all([
        ds.getSiteDetails([FINANCE_ID]),
        ds.getSiteDetails([FINANCE_ID, 'other']),
      ])

      expect(batchGet).toHaveBeenCalledTimes(2)
      expect(batchGet.mock.calls[1][0]).toEqual(['/sites/other?$select=id,displayName,webUrl'])
      expect(first.get(FINANCE_ID)?.name).toBe('Finance')
      expect(second.get(FINANCE_ID)?.name).toBe('Finance')
      expect(second.size).toBe(1)
    })

    it('lets a later call try again after a failed batch instead of replaying the failure', async () => {
      const { graph } = recordingGraph()
      const batchGet = graph.batchGet as ReturnType<typeof vi.fn>
      batchGet.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce([finance])
      const ds = createLiveDataSource(graph)

      await expect(ds.getSiteDetails([FINANCE_ID])).rejects.toThrow('boom')
      expect((await ds.getSiteDetails([FINANCE_ID])).get(FINANCE_ID)?.name).toBe('Finance')
      expect(batchGet).toHaveBeenCalledTimes(2)
    })
  })
})

describe('getSiteDirectory', () => {
  let nextSite = 0
  const page = (count: number, nextLink?: string) => ({
    value: Array.from({ length: count }, () => {
      const i = nextSite++
      return {
        id: `contoso.sharepoint.com,${i}-site,${i}-web`,
        displayName: `Site ${i}`,
        webUrl: `https://contoso.sharepoint.com/sites/s${i}`,
      }
    }),
    ...(nextLink ? { '@odata.nextLink': nextLink } : {}),
  })

  beforeEach(() => {
    nextSite = 0
  })

  it('walks the delta pages Graph hands back and keys every site it found', async () => {
    const { graph } = recordingGraph()
    const get = graph.get as ReturnType<typeof vi.fn>
    get.mockResolvedValueOnce(page(2, 'https://graph/next')).mockResolvedValueOnce(page(1))

    const directory = await createLiveDataSource(graph).getSiteDirectory()

    expect(get.mock.calls.flat()).toEqual([siteDirectoryPath(), 'https://graph/next'])
    expect(directory.size).toBe(3)
    expect(directory.get('0-site')?.name).toBe('Site 0')
  })

  it('stops at the page limit instead of walking a tenant of any size', async () => {
    const { graph } = recordingGraph()
    const get = graph.get as ReturnType<typeof vi.fn>
    get.mockResolvedValue(page(1, 'https://graph/forever'))

    await createLiveDataSource(graph).getSiteDirectory()

    expect(get).toHaveBeenCalledTimes(10)
  })

  it('walks once and serves later callers from the same walk', async () => {
    const { graph } = recordingGraph()
    const get = graph.get as ReturnType<typeof vi.fn>
    get.mockResolvedValue(page(1))
    const ds = createLiveDataSource(graph)

    const [first, second] = await Promise.all([ds.getSiteDirectory(), ds.getSiteDirectory()])

    expect(get).toHaveBeenCalledTimes(1)
    expect(second).toBe(first)
  })

  it('degrades to no directory when Graph refuses the delta, so the report still renders', async () => {
    const { graph } = recordingGraph()
    const get = graph.get as ReturnType<typeof vi.fn>
    get.mockRejectedValue(new ApiError(403, 'Forbidden', 'accessDenied'))

    await expect(createLiveDataSource(graph).getSiteDirectory()).resolves.toEqual(new Map())
  })

  it('lets a failed walk be retried rather than caching the failure', async () => {
    const { graph } = recordingGraph()
    const get = graph.get as ReturnType<typeof vi.fn>
    get
      .mockRejectedValueOnce(new ApiError(503, 'Service Unavailable', null))
      .mockResolvedValueOnce(page(1))
    const ds = createLiveDataSource(graph)

    expect((await ds.getSiteDirectory()).size).toBe(0)
    expect((await ds.getSiteDirectory()).size).toBe(1)
  })

  it('propagates a failure that is not Graph saying no', async () => {
    const { graph } = recordingGraph()
    const get = graph.get as ReturnType<typeof vi.fn>
    get.mockRejectedValue(new TypeError('network down'))

    await expect(createLiveDataSource(graph).getSiteDirectory()).rejects.toThrow('network down')
  })
})

describe('getOrg', () => {
  it('reports a missing organization as a Graph error the header can fall back from', async () => {
    const { graph } = recordingGraph()
    const error = await createLiveDataSource(graph).getOrg().catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).code).toBe('OrganizationMissing')
  })
})

describe('getLicenses', () => {
  it('reports licences as unavailable when Graph refuses them, so the report still renders', async () => {
    const { graph } = recordingGraph()
    const getAllPages = graph.getAllPages as ReturnType<typeof vi.fn>
    getAllPages.mockRejectedValue(new ApiError(403, 'Insufficient privileges', 'Authorization_RequestDenied'))

    await expect(createLiveDataSource(graph).getLicenses()).resolves.toBeNull()
  })

  it('propagates a licence failure that is not Graph saying no', async () => {
    const { graph } = recordingGraph()
    const getAllPages = graph.getAllPages as ReturnType<typeof vi.fn>
    getAllPages.mockRejectedValue(new TypeError('network down'))

    await expect(createLiveDataSource(graph).getLicenses()).rejects.toThrow('network down')
  })
})

type DataSourceUnderTest = ReturnType<typeof createLiveDataSource>
