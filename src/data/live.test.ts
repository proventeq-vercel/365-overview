import { describe, it, expect, vi } from 'vitest'
import { createLiveDataSource } from './live'
import type { GraphClient } from '../clients/graphClient'

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
  it('getSharePoint targets the /beta reports endpoint', async () => {
    const { graph, urls } = recordingGraph()
    await createLiveDataSource(graph).getSharePoint('D30')

    expect(urls.length).toBeGreaterThan(0)
    for (const url of urls) {
      expect(url.startsWith(BETA)).toBe(true)
      expect(url).toContain('$format=application/json')
    }
  })
})
