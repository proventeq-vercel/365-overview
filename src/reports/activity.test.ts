import { describe, expect, it } from 'vitest'
import { parseActivityUsers, parseFileCounts } from './activity'

describe('parseActivityUsers', () => {
  it('reads the internal and external sharing counts per user', () => {
    expect(
      parseActivityUsers([
        {
          userPrincipalName: 'ada@contoso.com',
          sharedInternallyFileCount: '18',
          sharedExternallyFileCount: '7',
          lastActivityDate: '2026-09-03',
          isDeleted: 'False',
        },
      ]),
    ).toEqual([
      {
        userPrincipalName: 'ada@contoso.com',
        sharedInternally: 18,
        sharedExternally: 7,
        lastActivityDate: '2026-09-03',
        isDeleted: false,
      },
    ])
  })

  it('keeps a deleted user flagged rather than dropping the row', () => {
    const [user] = parseActivityUsers([{ userPrincipalName: 'gone@contoso.com', isDeleted: 'True' }])
    expect(user.isDeleted).toBe(true)
    expect(user.sharedExternally).toBe(0)
  })
})

describe('parseFileCounts', () => {
  it('returns the daily series in date order', () => {
    expect(
      parseFileCounts([
        { reportDate: '2026-09-02', sharedInternally: '5', sharedExternally: '2' },
        { reportDate: '2026-09-01', sharedInternally: '9', sharedExternally: '1' },
      ]),
    ).toEqual([
      { date: '2026-09-01', sharedInternally: 9, sharedExternally: 1 },
      { date: '2026-09-02', sharedInternally: 5, sharedExternally: 2 },
    ])
  })

  it('drops the dateless summary rows some report responses carry', () => {
    expect(parseFileCounts([{ sharedExternally: '4' }])).toEqual([])
  })
})
