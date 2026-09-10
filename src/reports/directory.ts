import type { GuestAccount, UnifiedGroup } from '../types/oversharing'
import { text } from './graphValues'

export interface RawGuest {
  id?: string
  mail?: string | null
  userPrincipalName?: string
  externalUserState?: string | null
  accountEnabled?: boolean
}

export interface RawGroup {
  id?: string
  displayName?: string
  visibility?: string | null
}

export function parseGuests(rows: RawGuest[]): GuestAccount[] {
  return rows.map((row) => ({
    id: text(row.id),
    mail: text(row.mail) === '' ? null : text(row.mail),
    userPrincipalName: text(row.userPrincipalName) === '' ? null : text(row.userPrincipalName),
    externalUserState: text(row.externalUserState) === '' ? null : text(row.externalUserState),
    accountEnabled: row.accountEnabled !== false,
  }))
}

export function parseGroups(rows: RawGroup[]): UnifiedGroup[] {
  return rows.map((row) => ({
    id: text(row.id),
    displayName: text(row.displayName),
    isPublic: text(row.visibility).trim().toLowerCase() === 'public',
  }))
}
