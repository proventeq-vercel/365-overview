import { describe, expect, it } from 'vitest'
import { rowLabel, rowName } from './rowName'

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

  it('falls back to the owner when the report carries no URL', () => {
    expect(rowName(withoutUrl)).toBe('Ada Lovelace')
  })
})

describe('rowLabel', () => {
  it('is the plain name when the URL is present', () => {
    expect(rowLabel(withUrl)).toBe('finance')
    expect(rowLabel(named)).toBe('Finance & Treasury')
  })

  it('appends the short id to the owner when the URL is blank', () => {
    expect(rowLabel(withoutUrl)).toBe('Ada Lovelace · 8f3c1a2b')
  })

  it('uses the account name of a UPN id, as a OneDrive row carries', () => {
    expect(rowLabel({ ...withoutUrl, id: 'ada.lovelace@contoso.com' })).toBe('Ada Lovelace · ada.lovelace')
  })
})
