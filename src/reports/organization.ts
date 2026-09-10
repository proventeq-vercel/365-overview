import type { OrgInfo } from '../types/oversharing'

export interface RawOrganization {
  displayName?: string
  verifiedDomains?: { name?: string }[]
}

export function parseOrganization(raw: RawOrganization | undefined): OrgInfo {
  return {
    displayName: raw?.displayName ?? '',
    verifiedDomains: (raw?.verifiedDomains ?? [])
      .map((d) => d.name?.toLowerCase() ?? '')
      .filter((name) => name !== ''),
  }
}
