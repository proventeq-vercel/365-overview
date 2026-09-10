import { describe, it, expect } from 'vitest'
import { parseOneDriveAccounts } from './oneDriveAccounts'

const row = (over: Record<string, unknown> = {}) => ({
  reportRefreshDate: '2026-08-30',
  siteUrl: 'https://contoso-my.sharepoint.com/personal/ada',
  ownerDisplayName: 'Ada Lovelace',
  ownerPrincipalName: 'ada@contoso.com',
  isDeleted: 'False',
  lastActivityDate: '2026-08-29',
  fileCount: '900',
  activeFileCount: '120',
  storageUsedInBytes: '900000000',
  storageAllocatedInBytes: '1099511627776',
  ...over,
})

describe('parseOneDriveAccounts', () => {
  it('tags every row as the OneDrive pool', () => {
    expect(parseOneDriveAccounts([row()])[0].pool).toBe('OneDrive')
  })

  it('does populate allocatedBytes, because a drive cap is real', () => {
    expect(parseOneDriveAccounts([row()])[0].allocatedBytes).toBe(1_099_511_627_776)
  })

  it('identifies the drive by owner principal name when present', () => {
    expect(parseOneDriveAccounts([row()])[0].id).toBe('ada@contoso.com')
  })

  it('falls back to the drive URL when the principal name is concealed', () => {
    expect(parseOneDriveAccounts([row({ ownerPrincipalName: undefined })])[0].id).toBe(
      'https://contoso-my.sharepoint.com/personal/ada',
    )
  })

  it('never populates a template, because drives have none', () => {
    expect(parseOneDriveAccounts([row()])[0].template).toBeUndefined()
  })

  it('coerces string numerics and True/False booleans', () => {
    const [drive] = parseOneDriveAccounts([row({ isDeleted: 'True' })])
    expect(drive.storageUsedBytes).toBe(900_000_000)
    expect(drive.fileCount).toBe(900)
    expect(drive.isDeleted).toBe(true)
  })

  it('turns an empty lastActivityDate into null', () => {
    expect(parseOneDriveAccounts([row({ lastActivityDate: '' })])[0].lastActivityDate).toBeNull()
  })
})
