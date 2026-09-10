import type { OrgInfo } from '../types/oversharing'

export interface DataSource {
  getOrganization(): Promise<OrgInfo>
}

export const CONTOSO: OrgInfo = {
  displayName: 'Contoso Ltd',
  verifiedDomains: ['contoso.com', 'contoso.onmicrosoft.com'],
}

export function createMockDataSource(): DataSource {
  return {
    getOrganization: () => Promise.resolve(CONTOSO),
  }
}
