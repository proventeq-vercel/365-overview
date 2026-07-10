import type { MailboxSummary, EmailActivityPoint } from '../types/reports'

export interface RawMailboxRow {
  reportDate: number | string
  total: number | string
  active: number | string
}

export interface RawMailboxStorageRow {
  reportDate: number | string
  storageUsedInBytes: number | string | undefined
}

export interface RawEmailRow {
  reportDate: number | string
  send: number | string
  receive: number | string
  read: number | string
}

const n = (v: number | string | undefined) => Number(v ?? 0) || 0

export function parseMailboxStorage(rows: RawMailboxStorageRow[]): number {
  const latest = rows[rows.length - 1]
  return n(latest?.storageUsedInBytes)
}

export function parseMailboxSummary(rows: RawMailboxRow[], storageUsedBytes: number = 0): MailboxSummary {
  const latest = rows[rows.length - 1]
  return {
    totalMailboxes: n(latest?.total),
    activeMailboxes: n(latest?.active),
    storageUsedBytes,
  }
}

export function parseEmailActivity(rows: RawEmailRow[]): EmailActivityPoint[] {
  return rows
    .filter((r) => r.reportDate)
    .map((r) => ({ date: String(r.reportDate), send: n(r.send), receive: n(r.receive), read: n(r.read) }))
}
