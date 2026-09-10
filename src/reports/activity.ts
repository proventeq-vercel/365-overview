import type { DailySharingCounts, UserSharingActivity } from '../types/oversharing'
import { bool, dateOrNull, num, text } from './graphValues'

export interface RawActivityUserRow {
  userPrincipalName?: string
  sharedInternallyFileCount?: number | string
  sharedExternallyFileCount?: number | string
  lastActivityDate?: string
  isDeleted?: boolean | string
}

export interface RawFileCountsRow {
  reportDate?: string
  reportRefreshDate?: string
  sharedInternally?: number | string
  sharedExternally?: number | string
}

export function parseActivityUsers(rows: RawActivityUserRow[]): UserSharingActivity[] {
  return rows.map((row) => ({
    userPrincipalName: text(row.userPrincipalName),
    sharedInternally: num(row.sharedInternallyFileCount),
    sharedExternally: num(row.sharedExternallyFileCount),
    lastActivityDate: dateOrNull(row.lastActivityDate),
    isDeleted: bool(row.isDeleted),
  }))
}

export function parseFileCounts(rows: RawFileCountsRow[]): DailySharingCounts[] {
  return rows
    .map((row) => ({
      date: text(row.reportDate),
      sharedInternally: num(row.sharedInternally),
      sharedExternally: num(row.sharedExternally),
    }))
    .filter((point) => point.date !== '')
    .sort((a, b) => a.date.localeCompare(b.date))
}
