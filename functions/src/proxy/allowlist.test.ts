import { describe, expect, it } from 'vitest'
import { assertAllowed, BATCH_LIMIT, parseBatch, type GraphRequest } from './allowlist.js'
import { ProxyError } from './errors.js'

const SITE = 'contoso.sharepoint.com,8f3c1a2b-9d4e-4f60-a1b2-c3d4e5f60718,0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c3d'

const failure = (fn: () => void): ProxyError => {
  try {
    fn()
  } catch (error) {
    return error as ProxyError
  }
  throw new Error('expected a ProxyError')
}

describe('assertAllowed', () => {
  it.each<GraphRequest>([
    { version: 'v1.0', path: 'sites/delta', search: '?$select=id,webUrl&token=abc' },
    { version: 'v1.0', path: 'sites/delta', search: '?$deltatoken=xyz&$top=200' },
    { version: 'v1.0', path: `sites/${SITE}`, search: '?$select=id,displayName,webUrl' },
    { version: 'v1.0', path: 'sites/8f3c1a2b-9d4e-4f60-a1b2-c3d4e5f60718', search: '?$select=id' },
    { version: 'v1.0', path: 'subscribedSkus', search: '' },
    { version: 'v1.0', path: 'organization', search: '?$format=application/json' },
    {
      version: 'beta',
      path: "reports/getSharePointSiteUsageDetail(period='D180')",
      search: '?$format=application/json&$skiptoken=100',
    },
    { version: 'beta', path: "reports/getOneDriveUsageAccountDetail(period='D180')", search: '?$format=application/json' },
    { version: 'beta', path: "reports/getSharePointSiteUsageStorage(period='D30')", search: '?$format=application/json' },
    { version: 'beta', path: "reports/getOneDriveUsageStorage(period='D7')", search: '?$format=application/json' },
  ])('allows %o', (request) => {
    expect(() => assertAllowed(request)).not.toThrow()
  })

  it.each<[string, GraphRequest]>([
    ['a write-shaped path', { version: 'v1.0', path: 'sites/root/lists', search: '' }],
    ['users', { version: 'v1.0', path: 'users', search: '' }],
    ['drive items under a site', { version: 'v1.0', path: `sites/${SITE}/drive/root/children`, search: '' }],
    ['a report outside the storage set', { version: 'beta', path: "reports/getMailboxUsageDetail(period='D180')", search: '?$format=application/json' }],
    ['a report period Graph does not offer', { version: 'beta', path: "reports/getSharePointSiteUsageDetail(period='D365')", search: '?$format=application/json' }],
    ['a usage report on v1.0', { version: 'v1.0', path: "reports/getSharePointSiteUsageDetail(period='D180')", search: '?$format=application/json' }],
    ['$expand on a site', { version: 'v1.0', path: `sites/${SITE}`, search: '?$select=id&$expand=drives' }],
    ['$search on delta', { version: 'v1.0', path: 'sites/delta', search: '?$search=finance' }],
    ['a traversal segment', { version: 'v1.0', path: 'sites/../users', search: '' }],
    ['the getAllSites tenant walk', { version: 'v1.0', path: 'sites/getAllSites', search: '' }],
    ['a Graph function dressed as a site id', { version: 'v1.0', path: 'sites/root', search: '' }],
    ['a site id that is neither a GUID nor host,guid,guid', { version: 'v1.0', path: 'sites/contoso.sharepoint.com', search: '' }],
    ['an empty segment', { version: 'v1.0', path: 'sites//delta', search: '' }],
  ])('rejects %s with 404 RouteNotAllowed', (_label, request) => {
    const error = failure(() => assertAllowed(request))
    expect(error.status).toBe(404)
    expect(error.code).toBe('RouteNotAllowed')
  })
})

describe('parseBatch', () => {
  const siteRequest = (id: string) => ({ id, method: 'GET', url: `/sites/${SITE}?$select=id,displayName,webUrl` })

  it.each([
    ['a dot segment', `/sites/./${SITE}?$select=id`],
    ['a fragment the allowlist never sees', `/sites/${SITE}?$select=id#/../../users`],
    ['an embedded tab', `/sites/${SITE}	?$select=id`],
  ])('forwards the string it validated, not the raw one, for %s', (_label, url) => {
    const [entry] = parseBatch(JSON.stringify({ requests: [{ id: '1', method: 'GET', url }] }))
    expect(entry.url).toBe(`/sites/${SITE}?$select=id`)
  })

  it('returns only id, method and url of each allowed sub-request', () => {
    const body = JSON.stringify({
      requests: [{ ...siteRequest('1'), headers: { 'x-extra': 'dropped' }, body: { evil: true } }],
    })
    expect(parseBatch(body)).toEqual([siteRequest('1')])
  })

  it.each<[string, unknown]>([
    ['a non-JSON body', 'not json'],
    ['no requests', { requests: [] }],
    ['a non-array', { requests: 'x' }],
    ['more than the batch limit', { requests: Array.from({ length: BATCH_LIMIT + 1 }, (_, i) => siteRequest(String(i))) }],
    ['a POST sub-request', { requests: [{ ...siteRequest('1'), method: 'POST' }] }],
    ['an absolute sub-URL', { requests: [{ id: '1', method: 'GET', url: 'https://graph.microsoft.com/v1.0/me' }] }],
    ['a protocol-relative sub-URL', { requests: [{ id: '1', method: 'GET', url: '//evil.example/x' }] }],
    ['a sub-URL outside the allowlist', { requests: [{ id: '1', method: 'GET', url: '/me' }] }],
    ['a sub-URL with a disallowed option', { requests: [{ id: '1', method: 'GET', url: `/sites/${SITE}?$expand=drives` }] }],
    ['duplicate ids', { requests: [siteRequest('1'), siteRequest('1')] }],
    ['a sub-URL that traverses to another allowlisted route', { requests: [{ id: '1', method: 'GET', url: '/sites/a/../../subscribedSkus' }] }],
    ['a sub-URL naming an allowlisted route that is not a site', { requests: [{ id: '1', method: 'GET', url: '/subscribedSkus' }] }],
    ['a nested batch', { requests: [{ id: '1', method: 'GET', url: '/$batch' }] }],
    ['a sub-URL with invalid percent-encoding', { requests: [{ id: '1', method: 'GET', url: '/sites/%ZZ' }] }],
    ['a missing id', { requests: [{ method: 'GET', url: `/sites/${SITE}` }] }],
  ])('rejects %s', (_label, body) => {
    const error = failure(() => parseBatch(typeof body === 'string' ? body : JSON.stringify(body)))
    expect(error.status).toBeGreaterThanOrEqual(400)
    expect(error.status).toBeLessThan(500)
    expect(['InvalidBatch', 'RouteNotAllowed']).toContain(error.code)
  })
})
