import { describe, it, expect } from 'vitest'
import { parseMailboxSummary, parseEmailActivity, type RawEmailRow } from './exchange'

describe('parseMailboxSummary', () => {
  it('uses the last (latest) row', () => {
    const result = parseMailboxSummary([
      { 'Report Date': '2026-06-01', Total: '100', Active: '60', 'Storage Used (Byte)': '1000000' },
      { 'Report Date': '2026-06-08', Total: '105', Active: '65', 'Storage Used (Byte)': '1050000' },
    ])
    expect(result).toEqual({ totalMailboxes: 105, activeMailboxes: 65, storageUsedBytes: 1050000 })
  })

  it('handles a single row', () => {
    const result = parseMailboxSummary([
      { 'Report Date': '2026-06-01', Total: '50', Active: '30', 'Storage Used (Byte)': '500000' },
    ])
    expect(result.totalMailboxes).toBe(50)
    expect(result.activeMailboxes).toBe(30)
    expect(result.storageUsedBytes).toBe(500000)
  })

  it('handles empty input gracefully (all zeros)', () => {
    const result = parseMailboxSummary([])
    expect(result).toEqual({ totalMailboxes: 0, activeMailboxes: 0, storageUsedBytes: 0 })
  })
})

describe('parseEmailActivity', () => {
  it('maps Send/Receive/Read per dated row', () => {
    const result = parseEmailActivity([
      { 'Report Date': '2026-06-01', Send: '10', Receive: '20', Read: '30' },
      { 'Report Date': '2026-06-02', Send: '5', Receive: '15', Read: '25' },
    ])
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ date: '2026-06-01', send: 10, receive: 20, read: 30 })
    expect(result[1]).toEqual({ date: '2026-06-02', send: 5, receive: 15, read: 25 })
  })

  it('filters rows without Report Date', () => {
    const result = parseEmailActivity([
      { 'Report Date': '2026-06-01', Send: '1', Receive: '2', Read: '3' },
      { Send: '99', Receive: '99', Read: '99' } as RawEmailRow,
    ])
    expect(result).toHaveLength(1)
  })

  it('handles empty input', () => {
    expect(parseEmailActivity([])).toEqual([])
  })
})
