import { describe, expect, it } from 'vitest'
import { urlPathname } from './url'

describe('urlPathname', () => {
  it('returns the decoded path of a site URL', () => {
    expect(urlPathname('https://contoso.sharepoint.com/sites/Finance%20Team')).toBe(
      '/sites/Finance Team',
    )
  })

  it('returns the root path for a bare host', () => {
    expect(urlPathname('https://contoso.sharepoint.com')).toBe('/')
  })

  it('hands back input it cannot parse', () => {
    expect(urlPathname('not a url')).toBe('not a url')
  })
})
