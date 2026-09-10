import type { OrgInfo } from '../types/reports'

export interface RawOrg {
  displayName: string
  countryLetterCode: string | null
  verifiedDomains: { name: string; isDefault: boolean }[]
}

export function parseOrg(raw: RawOrg): OrgInfo {
  const def = raw.verifiedDomains.find((d) => d.isDefault) ?? raw.verifiedDomains[0]
  return {
    displayName: raw.displayName,
    verifiedDomain: def?.name ?? '',
    country: raw.countryLetterCode,
  }
}
