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
  }
  return { graph, urls }
}

const BETA = 'https://graph.microsoft.com/beta/reports/'
const SITE_DIRECTORY = '/sites?search=*'

const reportUrls = (urls: string[]) => urls.filter((url) => url !== SITE_DIRECTORY)

describe('createLiveDataSource', () => {
  it.each([
    ['getSites', (ds: DataSourceUnderTest) => ds.getSites()],
    ['getDrives', (ds: DataSourceUnderTest) => ds.getDrives()],
    ['getSharePointTrend', (ds: DataSourceUnderTest) => ds.getSharePointTrend()],
    ['getOneDriveTrend', (ds: DataSourceUnderTest) => ds.getOneDriveTrend()],
  ])('%s targets the /beta reports endpoint with JSON format', async (_name, call) => {
    const { graph, urls } = recordingGraph()
    await call(createLiveDataSource(graph))

    const reports = reportUrls(urls)
    expect(reports.length).toBeGreaterThan(0)
    for (const url of reports) {
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
    const reports = reportUrls(urls)
    expect(reports).toHaveLength(4)
    for (const url of reports) expect(url).toContain("(period='D180')")
  })

  it('resolves site names and URLs from the tenant site directory, which the usage report leaves blank', async () => {
    const { graph, urls } = recordingGraph()
    const getAllPages = graph.getAllPages as ReturnType<typeof vi.fn>
    getAllPages.mockImplementation(async (path: string) => {
      urls.push(path)
      if (path === SITE_DIRECTORY) {
        return [
          {
            id: 'contoso.sharepoint.com,8f3c1a2b-9d4e-4f60-a1b2-c3d4e5f60718,web',
            displayName: 'Finance',
            webUrl: 'https://contoso.sharepoint.com/sites/finance',
          },
        ]
      }
      return [
        {
          siteId: '8f3c1a2b-9d4e-4f60-a1b2-c3d4e5f60718',
          siteUrl: '',
          ownerDisplayName: 'SharePoint Admin',
          storageUsedInBytes: '10',
        },
        { siteId: 'gone', siteUrl: '', ownerDisplayName: 'SharePoint Admin', isDeleted: 'True' },
      ]
    })

    const sites = await createLiveDataSource(graph).getSites()

    expect(urls).toContain(SITE_DIRECTORY)
    expect(sites[0]).toMatchObject({
      name: 'Finance',
      url: 'https://contoso.sharepoint.com/sites/finance',
      ownerDisplayName: 'SharePoint Admin',
    })
    expect(sites[1]).toMatchObject({ url: '', isDeleted: true })
    expect(sites[1].name).toBeUndefined()
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
    const requested = getAllPages.mock.calls.map(([path]) => path as string)
    expect(reportUrls(requested)).toHaveLength(2)
  })

  it('shares one paged site fetch between the rows and the refresh date', async () => {
    const { graph, urls } = recordingGraph()
    const ds = createLiveDataSource(graph)
    await Promise.all([ds.getSites(), ds.getReportRefreshDate()])
    expect(reportUrls(urls)).toHaveLength(1)
  })
})

type DataSourceUnderTest = ReturnType<typeof createLiveDataSource>
