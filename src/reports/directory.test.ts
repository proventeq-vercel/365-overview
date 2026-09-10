import { describe, expect, it } from 'vitest'
import { parseGroups, parseGuests } from './directory'

describe('parseGuests', () => {
  it('keeps the invitation state so pending guests can be told from accepted ones', () => {
    expect(
      parseGuests([
        {
          id: 'g1',
          mail: 'ada@fabrikam.com',
          userPrincipalName: 'ada_fabrikam.com#EXT#@contoso.onmicrosoft.com',
          externalUserState: 'PendingAcceptance',
          accountEnabled: true,
        },
      ]),
    ).toEqual([
      {
        id: 'g1',
        mail: 'ada@fabrikam.com',
        userPrincipalName: 'ada_fabrikam.com#EXT#@contoso.onmicrosoft.com',
        externalUserState: 'PendingAcceptance',
        accountEnabled: true,
      },
    ])
  })

  it('nulls a missing mail rather than blanking it, so the UPN fallback can run', () => {
    const [guest] = parseGuests([{ id: 'g2', mail: null, userPrincipalName: 'x_y.com#EXT#@t.onmicrosoft.com' }])
    expect(guest.mail).toBeNull()
    expect(guest.userPrincipalName).toBe('x_y.com#EXT#@t.onmicrosoft.com')
  })

  it('treats an omitted accountEnabled as enabled and an explicit false as disabled', () => {
    expect(parseGuests([{ id: 'g3' }])[0].accountEnabled).toBe(true)
    expect(parseGuests([{ id: 'g4', accountEnabled: false }])[0].accountEnabled).toBe(false)
  })
})

describe('parseGroups', () => {
  it('marks only Public visibility as public', () => {
    const groups = parseGroups([
      { id: 'a', displayName: 'All Company', visibility: 'Public' },
      { id: 'b', displayName: 'Finance', visibility: 'Private' },
      { id: 'c', displayName: 'Legacy', visibility: null },
    ])
    expect(groups.map((g) => g.isPublic)).toEqual([true, false, false])
  })
})
