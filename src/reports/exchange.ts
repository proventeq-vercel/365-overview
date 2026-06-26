import type { MailboxSummary, EmailActivityPoint } from '../types/reports'

export interface RawMailboxRow {
  reportDate: number | string
  total: number | string
  active: number | string
}

export interface RawEmailRow {
  reportDate: number | string
  send: number | string
  receive: number | string
  read: number | string
}

const n = (v: number | string | undefined) => Number(v ?? 0) || 0

export function parseMailboxSummary(rows: RawMailboxRow[]): MailboxSummary {
  const latest = rows[rows.length - 1]
  return {
    totalMailboxes: n(latest?.total),
    activeMailboxes: n(latest?.active),
    // note: getMailboxUsageMailboxCounts carries no storage figure (documented
    // limitation) — we deliberately do not issue an extra API call for it.
    storageUsedBytes: 0,
  }
}

export function parseEmailActivity(rows: RawEmailRow[]): EmailActivityPoint[] {
  return rows
    .filter((r) => r.reportDate)
    .map((r) => ({ date: String(r.reportDate), send: n(r.send), receive: n(r.receive), read: n(r.read) }))
}
