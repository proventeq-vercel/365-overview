import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { LOCAL_TENANT_ID } from '../../local/fakeEntra.js'
import { APP_TOKEN_PREFIX, isMissingFromDirectory, siteIdOf } from '../../local/fakeGraph.js'
import { generateLocalAppCertificate } from '../../local/keys.js'
import { startNodeHost, type NodeHost } from '../../local/nodeHost.js'
import { startLocalStack, type LocalStack } from '../../local/stack.js'
import { createProxyDeps } from './deps.js'

const UNCONSENTED_TENANT = '77777777-2222-4333-8444-555555555555'
const SITE_COUNT = 230
const PAGE_SIZE = 100

let stack: LocalStack
let host: NodeHost
let userToken: string

beforeAll(async () => {
  stack = await startLocalStack({
    unconsentedTenantIds: [UNCONSENTED_TENANT],
    graph: { siteCount: SITE_COUNT, pageSize: PAGE_SIZE, throttleFirstSiteReport: true },
  })
  host = await startNodeHost(createProxyDeps(stack.env))
  userToken = await stack.entra.issueUserToken()
}, 20_000)

afterAll(async () => {
  await host?.close()
  await stack?.close()
})

const graph = (path: string, init: RequestInit = {}) =>
  fetch(`${host.url}/api/graph/${path}`, {
    ...init,
    headers: { authorization: `Bearer ${userToken}`, origin: 'http://localhost:5173', ...init.headers },
  })

interface Page<T> {
  value: T[]
  '@odata.nextLink'?: string
  '@odata.deltaLink'?: string
}

async function allPages<T>(firstPath: string): Promise<{ rows: T[]; pages: number; last: Page<T> }> {
  const rows: T[] = []
  let url: string | undefined = `${host.url}/api/graph/${firstPath}`
  let pages = 0
  let last: Page<T> = { value: [] }
  while (url) {
    const response = await fetch(url, { headers: { authorization: `Bearer ${userToken}` } })
    expect(response.status).toBe(200)
    last = (await response.json()) as Page<T>
    rows.push(...last.value)
    url = last['@odata.nextLink']
    pages++
  }
  return { rows, pages, last }
}

describe('proxy end to end on the local stack', () => {
  it('signs a usage report request with a certificate-issued app token and pages it through its own host', async () => {
    const throttled = await graph("beta/reports/getSharePointSiteUsageDetail(period='D180')?$format=application/json")
    expect(throttled.status).toBe(429)
    expect(throttled.headers.get('retry-after')).toBe('1')
    expect(throttled.headers.get('access-control-allow-origin')).toBe('http://localhost:5173')

    const { rows, pages } = await allPages<{ siteId: string; siteUrl: string }>(
      "beta/reports/getSharePointSiteUsageDetail(period='D180')?$format=application/json",
    )
    expect(pages).toBe(Math.ceil(SITE_COUNT / PAGE_SIZE))
    expect(rows).toHaveLength(SITE_COUNT)
    expect(rows[0].siteId).toBe(siteIdOf(0))
    expect(rows[0].siteUrl).toBe('')

    expect(stack.entra.tokenRequests).toEqual([{ tenantId: LOCAL_TENANT_ID, credential: 'assertion' }])
    const seenByGraph = stack.graph.requests.map((r) => r.authorization)
    expect(seenByGraph.length).toBeGreaterThan(0)
    for (const authorization of seenByGraph) {
      expect(authorization).toMatch(new RegExp(`^Bearer ${APP_TOKEN_PREFIX}${LOCAL_TENANT_ID}\\.`))
    }
  })

  it('resolves site names through $batch exactly as the app asks, missing ones as 404', async () => {
    const ids = [0, 5, 7]
    const response = await graph('v1.0/$batch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        requests: ids.map((i) => ({ id: String(i), method: 'GET', url: `/sites/${encodeURIComponent(siteIdOf(i))}?$select=id,displayName,webUrl` })),
      }),
    })
    expect(response.status).toBe(200)
    const { responses } = (await response.json()) as { responses: { id: string; status: number; body: { displayName?: string } }[] }
    expect(responses.map((r) => [r.id, r.status])).toEqual(ids.map((i) => [String(i), isMissingFromDirectory(i) ? 404 : 200]))
    expect(responses[0].body.displayName).toBe('Team Site 0')
  })

  it('sends Graph the sub-request url it validated, with the caller’s dot segments and fragment gone', async () => {
    const id = siteIdOf(1)
    const response = await graph('v1.0/$batch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        requests: [{ id: '1', method: 'GET', url: `/sites/./${encodeURIComponent(id)}?$select=id#/../../users` }],
      }),
    })
    expect(response.status).toBe(200)
    const sent = stack.graph.requests.filter((request) => request.batchUrls).at(-1)
    expect(sent?.batchUrls).toEqual([`/sites/${encodeURIComponent(id)}?$select=id`])
  })

  it('refuses a batch sub-request for the whole site directory', async () => {
    const response = await graph('v1.0/$batch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ requests: [{ id: '1', method: 'GET', url: '/sites/getAllSites' }] }),
    })
    expect(response.status).toBe(400)
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe('InvalidBatch')
  })

  it('refuses the getAllSites tenant walk on the direct route', async () => {
    const before = stack.graph.requests.length
    const response = await graph('v1.0/sites/getAllSites')
    expect(response.status).toBe(404)
    expect(stack.graph.requests.length).toBe(before)
  })

  it('walks sites/delta to a deltaLink that also points back at the proxy', async () => {
    const { rows, last } = await allPages<{ id: string; webUrl: string }>('v1.0/sites/delta?$select=id,displayName,webUrl')
    expect(rows).toHaveLength(SITE_COUNT)
    expect(last['@odata.deltaLink']).toBe(`${host.url}/api/graph/v1.0/sites/delta?token=latest`)
  })

  it('serves the remaining app calls', async () => {
    for (const path of [
      "beta/reports/getOneDriveUsageAccountDetail(period='D180')?$format=application/json",
      "beta/reports/getSharePointSiteUsageStorage(period='D180')?$format=application/json",
      "beta/reports/getOneDriveUsageStorage(period='D180')?$format=application/json",
      'v1.0/subscribedSkus',
      'v1.0/organization?$format=application/json',
    ]) {
      const response = await graph(path)
      expect(response.status, path).toBe(200)
      expect(((await response.json()) as { value: unknown[] }).value.length, path).toBeGreaterThan(0)
    }
  })

  it('reuses the cached app token across calls of the same tenant', async () => {
    const before = stack.entra.tokenRequests.length
    const first = await graph('v1.0/organization')
    const second = await graph('v1.0/organization')
    expect([first.status, second.status]).toEqual([200, 200])
    expect(((await first.json()) as { value: unknown[] }).value.length).toBeGreaterThan(0)
    expect(stack.entra.tokenRequests.length).toBe(before)
  })

  it('answers a tenant whose admin has not consented with 403 AdminConsentRequired', async () => {
    const token = await stack.entra.issueUserToken({ tenantId: UNCONSENTED_TENANT })
    const response = await fetch(`${host.url}/api/graph/v1.0/organization`, { headers: { authorization: `Bearer ${token}` } })
    expect(response.status).toBe(403)
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe('AdminConsentRequired')
  })

  it('refuses a signed-in user without an admin directory role', async () => {
    const token = await stack.entra.issueUserToken({ wids: [] })
    const response = await fetch(`${host.url}/api/graph/v1.0/organization`, { headers: { authorization: `Bearer ${token}` } })
    expect(response.status).toBe(403)
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe('DirectoryRoleRequired')
  })

  it('refuses a token minted for another audience', async () => {
    const token = await stack.entra.issueUserToken({ audience: 'https://graph.microsoft.com' })
    const response = await fetch(`${host.url}/api/graph/v1.0/organization`, { headers: { authorization: `Bearer ${token}` } })
    expect(response.status).toBe(401)
    expect(((await response.json()) as { error: { code: string } }).error.code).toBe('InvalidToken')
  })

  it.each([
    ['certificate', () => ({ GRAPH_CERT_PEM: generateLocalAppCertificate('imposter').pemBundle })],
    [
      'thumbprint',
      () => ({
        GRAPH_CERT_PEM: generateLocalAppCertificate('imposter').privateKeyPem,
        GRAPH_CERT_THUMBPRINT: stack.appCertificate.thumbprintHex,
      }),
    ],
  ])('cannot obtain an app token with an unregistered %s', async (_label, override) => {
    const imposter = await startNodeHost(createProxyDeps({ ...stack.env, ...override() }))
    try {
      const response = await fetch(`${imposter.url}/api/graph/v1.0/organization`, { headers: { authorization: `Bearer ${userToken}` } })
      expect(response.status).toBe(502)
      expect(((await response.json()) as { error: { code: string } }).error.code).toBe('TokenAcquisitionFailed')
    } finally {
      await imposter.close()
    }
  })

  it('never forwards a path outside the allowlist, even for an admin', async () => {
    const before = stack.graph.requests.length
    const response = await graph('v1.0/users?$select=mail')
    expect(response.status).toBe(404)
    expect(stack.graph.requests.length).toBe(before)
  })
})
