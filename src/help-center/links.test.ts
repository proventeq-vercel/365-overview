import { describe, expect, it } from 'vitest'
import { helpHref, isExternalHref, resolveDocLink, slugOfPath } from './links'

describe('resolveDocLink', () => {
  it('resolves a sibling, a parent and a folder index relative to the linking file', () => {
    expect(resolveDocLink('reports/a/cards.md', 'growth.md')).toEqual({ slug: 'reports/a/growth', hash: '' })
    expect(resolveDocLink('reports/a/cards.md', '../../reference/settings.md#rate')).toEqual({
      slug: 'reference/settings',
      hash: 'rate',
    })
    expect(resolveDocLink('index.md', 'reports/a/index.md')).toEqual({ slug: 'reports/a', hash: '' })
  })

  it('points a bare anchor at the linking page', () => {
    expect(resolveDocLink('reference/settings.md', '#currency')).toEqual({ slug: 'reference/settings', hash: 'currency' })
  })

  it('leaves external, absolute and non-markdown links alone', () => {
    expect(resolveDocLink('index.md', 'https://learn.microsoft.com')).toBeNull()
    expect(resolveDocLink('index.md', 'mailto:help@example.com')).toBeNull()
    expect(resolveDocLink('index.md', '/storage-optimisation')).toBeNull()
    expect(resolveDocLink('index.md', 'image.png')).toBeNull()
  })
})

describe('isExternalHref', () => {
  it('treats schemes and protocol-relative links as external', () => {
    expect(isExternalHref('https://x')).toBe(true)
    expect(isExternalHref('//cdn.example.com')).toBe(true)
    expect(isExternalHref('page.md')).toBe(false)
  })
})

describe('helpHref', () => {
  it('builds the address of a page with its query and anchor', () => {
    expect(helpHref('/help', { slug: 'reference/settings', hash: 'rate' }, '?audience=application')).toBe(
      '/help/reference/settings?audience=application#rate',
    )
    expect(helpHref('/help/', { slug: '', hash: '' })).toBe('/help')
  })
})

describe('slugOfPath', () => {
  it('reads the page slug under the base path', () => {
    expect(slugOfPath('/help', '/help')).toBe('')
    expect(slugOfPath('/help', '/help/')).toBe('')
    expect(slugOfPath('/help', '/help/reports/a')).toBe('reports/a')
  })

  it('keeps a malformed escape as it is instead of throwing, so the page reads as not found', () => {
    expect(slugOfPath('/help', '/help/reports/%E0%A4%A')).toBe('reports/%E0%A4%A')
    expect(slugOfPath('/help', '/help/site%20names')).toBe('site names')
  })

  it('returns null outside the base path', () => {
    expect(slugOfPath('/help', '/helpdesk')).toBeNull()
    expect(slugOfPath('/help', '/')).toBeNull()
  })
})
