import { describe, it, expect, vi } from 'vitest'
import { createLiveDataSource } from './live'
import type { GraphClient } from '../clients/graphClient'
import type { ArmClient } from '../clients/armClient'

const arm = {} as ArmClient

/** Capture every URL passed to the graph client across get/getAllPages. */
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

describe('createLiveDataSource report endpoints', () => {
  // Report functions only return JSON on /beta; /v1.0 rejects
  // $format=application/json with "JSON format is not supported."
  it.each([
    ['getSharePoint', (ds: ReturnType<typeof createLiveDataSource>) => ds.getSharePoint('D30')],
    ['getActiveUsers', (ds: ReturnType<typeof createLiveDataSource>) => ds.getActiveUsers('D30')],
    ['getOneDriveUsage', (ds: ReturnType<typeof createLiveDataSource>) => ds.getOneDriveUsage('D30')],
    ['getTeamsActivity', (ds: ReturnType<typeof createLiveDataSource>) => ds.getTeamsActivity('D30')],
    ['getMailbox', (ds: ReturnType<typeof createLiveDataSource>) => ds.getMailbox('D30')],
    ['getEmailActivity', (ds: ReturnType<typeof createLiveDataSource>) => ds.getEmailActivity('D30')],
  ])('%s targets the /beta reports endpoint', async (_name, call) => {
    const { graph, urls } = recordingGraph()
    await call(createLiveDataSource(graph, arm))

    expect(urls.length).toBeGreaterThan(0)
    for (const url of urls) {
      expect(url.startsWith(BETA)).toBe(true)
      expect(url).toContain('$format=application/json')
    }
  })
})
