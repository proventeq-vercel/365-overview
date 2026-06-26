import type { MailboxSummary, EmailActivityPoint } from '../types/reports'

export interface RawMailboxRow {
  'Report Date': string
  'Total': string
  'Active': string
  'Storage Used (Byte)': string
}

export interface RawEmailRow {
  'Report Date': string
  'Send': string
  'Receive': string
  'Read': string
}

const n = (v: string | undefined) => Number(v ?? 0) || 0

export function parseMailboxSummary(rows: RawMailboxRow[]): MailboxSummary {
  const latest = rows[rows.length - 1]
  return {
    totalMailboxes: n(latest?.['Total']),
    activeMailboxes: n(latest?.['Active']),
    storageUsedBytes: n(latest?.['Storage Used (Byte)']),
  }
}

export function parseEmailActivity(rows: RawEmailRow[]): EmailActivityPoint[] {
  return rows
    .filter((r) => r['Report Date'])
    .map((r) => ({ date: r['Report Date'], send: n(r['Send']), receive: n(r['Receive']), read: n(r['Read']) }))
}
