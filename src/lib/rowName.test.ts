import { describe, expect, it } from 'vitest'
import { rowDetail, rowLabel, rowName } from './rowName'

const withUrl = {
  id: '8f3c1a2b-9d4e-4f60-a1b2-c3d4e5f60718',
  url: 'https://contoso.sharepoint.com/sites/finance/',
  ownerDisplayName: 'Ada Lovelace',
}
const withoutUrl = { ...withUrl, url: '' }

describe('rowName', () => {
  it('names a row by the last URL segment, ignoring a trailing slash', () => {
    expect(rowName(withUrl)).toBe('finance')
  })

  it('falls back to the owner when the report carries no URL', () => {
    expect(rowName(withoutUrl)).toBe('Ada Lovelace')
  })
})

describe('rowDetail', () => {
  it('shows the URL when there is one', () => {
    expect(rowDetail(withUrl)).toBe('https://contoso.sharepoint.com/sites/finance/')
  })

  it('shows the site id when the URL is blank, so same-owner rows stay distinguishable', () => {
    expect(rowDetail(withoutUrl)).toBe('8f3c1a2b-9d4e-4f60-a1b2-c3d4e5f60718')
  })
})

describe('rowLabel', () => {
  it('is the plain name when the URL is present', () => {
    expect(rowLabel(withUrl)).toBe('finance')
  })

  it('appends the short id to the owner when the URL is blank', () => {
    expect(rowLabel(withoutUrl)).toBe('Ada Lovelace · 8f3c1a2b')
  })
})
