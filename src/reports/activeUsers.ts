import { bool } from './sharePointSites'

export interface RawActiveUserRow {
  userPrincipalName?: string
  hasOneDriveLicense?: string | boolean
}

export type OneDriveLicences = ReadonlyMap<string, boolean>

export function parseOneDriveLicences(rows: RawActiveUserRow[]): OneDriveLicences {
  const licences = new Map<string, boolean>()
  for (const row of rows) {
    const user = row.userPrincipalName?.toLowerCase()
    if (user) licences.set(user, bool(row.hasOneDriveLicense))
  }
  return licences
}
