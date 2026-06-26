import type { OrgInfo, UsagePoint } from '../types/reports'

export interface RawOrg {
  displayName: string
  countryLetterCode: string | null
  verifiedDomains: { name: string; isDefault: boolean }[]
}

export function parseOrg(raw: RawOrg): OrgInfo {
  const def = raw.verifiedDomains.find((d) => d.isDefault) ?? raw.verifiedDomains[0]
  return { displayName: raw.displayName, verifiedDomain: def?.name ?? '', country: raw.countryLetterCode }
}

export function parseUsageCounts(rows: Record<string, string>[], valueKey: string): UsagePoint[] {
  return rows
    .filter((r) => r['Report Date'])
    .map((r) => ({ date: r['Report Date'], value: Number(r[valueKey] ?? 0) || 0 }))
}
