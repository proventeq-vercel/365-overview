import { describe, expect, it } from 'vitest'
import type { StorageRow } from '@/types/storage'
import { archiveStatus, inactiveSince, isInactiveSince } from './archive'

const withActivity = (lastActivityDate: string | null): StorageRow => ({
  pool: 'SharePoint',
  id: 's1',
  url: '',
  ownerDisplayName: 'Owner',
  storageUsedBytes: 1,
  fileCount: 1,
  activeFileCount: 0,
  lastActivityDate,
  isDeleted: false,
})

const TODAY = new Date('2026-09-30T10:00:00Z')

describe('inactiveSince', () => {
  it('goes back whole years from the report date', () => {
    expect(inactiveSince('2026-08-30', 3, TODAY)).toBe('2023-08-30')
    expect(inactiveSince('2026-08-30', 1, TODAY)).toBe('2025-08-30')
  })

  it('rolls a leap day forward rather than inventing 29 February', () => {
    expect(inactiveSince('2028-02-29', 1, TODAY)).toBe('2027-03-01')
  })

  it('goes back from today when the report carries no usable date', () => {
    expect(inactiveSince('', 3, TODAY)).toBe('2023-09-30')
    expect(inactiveSince('not a date', 3, TODAY)).toBe('2023-09-30')
  })
})

describe('isInactiveSince', () => {
  it('counts a site last active before the cutoff', () => {
    expect(isInactiveSince(withActivity('2023-08-29'), '2023-08-30')).toBe(true)
  })

  it('does not count a site last active on the cutoff day', () => {
    expect(isInactiveSince(withActivity('2023-08-30'), '2023-08-30')).toBe(false)
  })

  it('never counts a site with no recorded activity, which could be a new one', () => {
    expect(isInactiveSince(withActivity(null), '2023-08-30')).toBe(false)
  })
})

describe('archiveStatus', () => {
  it('is healthy up to and including 5% of storage', () => {
    expect(archiveStatus(0)).toBe('healthy')
    expect(archiveStatus(0.05)).toBe('healthy')
  })

  it('needs watching above 5% and up to 50%', () => {
    expect(archiveStatus(0.051)).toBe('watch')
    expect(archiveStatus(0.5)).toBe('watch')
  })

  it('needs attention above 50%', () => {
    expect(archiveStatus(0.501)).toBe('attention')
  })
})
