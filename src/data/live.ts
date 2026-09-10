import type { GraphClient } from '../clients/graphClient'
import { parseOrganization, type RawOrganization } from '../reports/organization'
import type { DataSource } from './fixtures'

interface GraphCollection<T> {
  value: T[]
}

export const REPORTS_BASE = 'https://graph.microsoft.com/beta/reports'

export function createLiveDataSource(graph: GraphClient): DataSource {
  return {
    async getOrganization() {
      const res = await graph.get<GraphCollection<RawOrganization>>('/organization')
      return parseOrganization(res.value[0])
    },
  }
}
