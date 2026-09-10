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

  it('shares one paged site fetch between the rows and the refresh date', async () => {
    const { graph, urls } = recordingGraph()
    const ds = createLiveDataSource(graph)
    await Promise.all([ds.getSites(), ds.getReportRefreshDate()])
    expect(urls).toHaveLength(1)
    expect(graph.getAllPages).toHaveBeenCalledTimes(1)
  })
})

type DataSourceUnderTest = ReturnType<typeof createLiveDataSource>
