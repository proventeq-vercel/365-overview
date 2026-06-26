import { describe, it, expect } from 'vitest'
import { parseMailboxSummary, parseEmailActivity, type RawEmailRow } from './exchange'

// Live-shape fixtures: Graph returns camelCase resource property names with
// ?$format=application/json. getMailboxUsageMailboxCounts has NO storage field,
// so storageUsedBytes is always 0 (documented limitation). Numeric values are
// mixed numbers/strings to prove coercion.
describe('parseMailboxSummary', () => {
  it('uses the last (latest) row; storage is always 0', () => {
    const result = parseMailboxSummary([
      { reportDate: '2026-06-01', total: 100, active: 60 },
      { reportDate: '2026-06-08', total: 105, active: 65 },
    ])
    expect(result).toEqual({ totalMailboxes: 105, activeMailboxes: 65, storageUsedBytes: 0 })
  })

  it('handles a single row and coerces numeric strings', () => {
    const result = parseMailboxSummary([
      { reportDate: '2026-06-01', total: '50', active: '30' },
    ])
    expect(result.totalMailboxes).toBe(50)
    expect(result.activeMailboxes).toBe(30)
    expect(result.storageUsedBytes).toBe(0)
  })

  it('handles empty input gracefully (all zeros)', () => {
    const result = parseMailboxSummary([])
    expect(result).toEqual({ totalMailboxes: 0, activeMailboxes: 0, storageUsedBytes: 0 })
  })
})

describe('parseEmailActivity', () => {
  it('maps send/receive/read per dated row', () => {
    const result = parseEmailActivity([
      { reportDate: '2026-06-01', send: 10, receive: 20, read: 30 },
      { reportDate: '2026-06-02', send: '5', receive: '15', read: '25' },
    ])
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ date: '2026-06-01', send: 10, receive: 20, read: 30 })
    expect(result[1]).toEqual({ date: '2026-06-02', send: 5, receive: 15, read: 25 })
  })

  it('filters rows without reportDate', () => {
    const result = parseEmailActivity([
      { reportDate: '2026-06-01', send: 1, receive: 2, read: 3 },
      { send: 99, receive: 99, read: 99 } as RawEmailRow,
    ])
    expect(result).toHaveLength(1)
  })

  it('handles empty input', () => {
    expect(parseEmailActivity([])).toEqual([])
  })
})
