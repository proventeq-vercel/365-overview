import { describe, expect, it } from 'vitest'
import type { StorageRow } from '@/types/storage'
import {
  hiddenNameLength,
  hiddenNamePlaceholder,
  hideReportRowNames,
  hideRowNames,
  initialsOf,
  pseudonymOf,
} from './hiddenNames'

const SITE_ID = '8f3c1a2b-9d4e-4f60-a1b2-c3d4e5f60718'

describe('initialsOf', () => {
  it('keeps one capital per word', () => {
    expect(initialsOf('Ada Lovelace')).toBe('A.L.')
    expect(initialsOf('mary-jane o’brien')).toBe('M.J.O.B.')
  })

  it('gives the same answer when applied twice', () => {
    expect(initialsOf(initialsOf('Ada Lovelace'))).toBe('A.L.')
  })

  it('caps a long name at five letters and leaves an empty name empty', () => {
    expect(initialsOf('a b c d e f g')).toBe('A.B.C.D.E.')
    expect(initialsOf('')).toBe('')
  })
})

describe('pseudonymOf', () => {
  it('is sixteen hex characters that do not contain the input', () => {
    const masked = pseudonymOf(SITE_ID)
    expect(masked).toMatch(/^[0-9a-f]{16}$/)
    expect(masked).not.toContain('8f3c1a2b')
  })

  it('is stable, case-insensitive and distinct per input', () => {
    expect(pseudonymOf('Ada@Contoso.com')).toBe(pseudonymOf('ada@contoso.com'))
    expect(pseudonymOf('ada@contoso.com')).not.toBe(pseudonymOf('bob@contoso.com'))
  })

  it('leaves an existing pseudonym and an empty value alone', () => {
    const masked = pseudonymOf(SITE_ID)
    expect(pseudonymOf(masked)).toBe(masked)
    expect(pseudonymOf('')).toBe('')
  })
})

describe('hideReportRowNames', () => {
  it('masks the owner, the site id, the account and the URL of a usage-report row, and nothing else', () => {
    const row = {
      siteId: SITE_ID,
      siteUrl: 'https://contoso.sharepoint.com/sites/finance',
      ownerDisplayName: 'Ada Lovelace',
      ownerPrincipalName: 'ada@contoso.com',
      storageUsedInBytes: 42,
      reportRefreshDate: '2026-09-01',
    }
    expect(hideReportRowNames(row)).toEqual({
      siteId: pseudonymOf(SITE_ID),
      siteUrl: '',
      ownerDisplayName: 'A.L.',
      ownerPrincipalName: pseudonymOf('ada@contoso.com'),
      storageUsedInBytes: 42,
      reportRefreshDate: '2026-09-01',
    })
  })
})

describe('hideRowNames', () => {
  it('drops the name and URL, masks the id and reduces the owner to initials', () => {
    const row: StorageRow = {
      pool: 'SharePoint',
      id: SITE_ID,
      name: 'Finance',
      url: 'https://contoso.sharepoint.com/sites/finance',
      ownerDisplayName: 'Ada Lovelace',
      storageUsedBytes: 42,
      fileCount: 1,
      activeFileCount: 1,
      lastActivityDate: null,
      isDeleted: false,
    }
    expect(hideRowNames(row)).toEqual({
      ...row,
      id: pseudonymOf(SITE_ID),
      name: undefined,
      url: '',
      ownerDisplayName: 'A.L.',
    })
  })
})

describe('hiddenNamePlaceholder', () => {
  const seeds = ['3f9a1c0b7e2d4a65', 'a1b2c3d4e5f60718', '0000000000000000', 'A.L.', 'B.E.', 'x']

  it('is the same neutral placeholder for the same seed and never the seed itself', () => {
    for (const seed of seeds) {
      expect(hiddenNamePlaceholder(seed)).toBe(hiddenNamePlaceholder(seed))
      expect('Lorem ipsum dolor sit amet'.startsWith(hiddenNamePlaceholder(seed))).toBe(true)
      expect(hiddenNamePlaceholder(seed)).not.toContain(seed)
    }
  })

  it('varies its length by seed, between 8 and 21 characters', () => {
    const lengths = seeds.map(hiddenNameLength)
    expect(new Set(lengths).size).toBeGreaterThan(1)
    expect(lengths.every((length) => length >= 8 && length <= 21)).toBe(true)
  })
})
