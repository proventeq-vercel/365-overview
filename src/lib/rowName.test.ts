import { describe, expect, it } from 'vitest'
import { rowName } from './rowName'

const withUrl = {
  id: '8f3c1a2b-9d4e-4f60-a1b2-c3d4e5f60718',
  url: 'https://contoso.sharepoint.com/sites/finance/',
  ownerDisplayName: 'Ada Lovelace',
}
const withoutUrl = { ...withUrl, url: '' }
const named = { ...withUrl, name: 'Finance & Treasury' }

describe('rowName', () => {
  it('prefers the display name the site directory resolved', () => {
    expect(rowName(named)).toBe('Finance & Treasury')
  })

  it('names a row by the last URL segment, ignoring a trailing slash', () => {
    expect(rowName(withUrl)).toBe('finance')
  })

  it('falls back to the site id, never the owner, when the report carries no URL', () => {
    expect(rowName(withoutUrl)).toBe('8f3c1a2b-9d4e-4f60-a1b2-c3d4e5f60718')
  })

  it('names an unnamed OneDrive row by its account, not its owner', () => {
    expect(rowName({ ...withoutUrl, id: 'ada.lovelace@contoso.com' })).toBe('ada.lovelace@contoso.com')
  })
})
