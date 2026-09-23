import { afterEach, describe, expect, it, vi } from 'vitest'
import type { IPublicClientApplication } from '@azure/msal-browser'
import { parseConfig } from '../config/appConfig'
import { buildLiveSource, buildLocalAuthSource } from './sources'

const ORIGIN = 'https://365-overview.vercel.app'
const PROXY = 'http://127.0.0.1:7071/api/graph'

const jsonResponse = (body: unknown) =>
  ({ ok: true, status: 200, headers: new Headers(), json: () => Promise.resolve(body) }) as Response

const fetchSpy = vi.spyOn(globalThis, 'fetch')

afterEach(() => {
  fetchSpy.mockReset()
})

function msalInstance() {
  const acquireTokenSilent = vi.fn().mockResolvedValue({ accessToken: 'user-token' })
  const instance = {
    acquireTokenSilent,
    acquireTokenRedirect: vi.fn(),
    getActiveAccount: () => ({ homeAccountId: 'a' }),
  } as unknown as IPublicClientApplication
  return { instance, acquireTokenSilent }
}

describe('buildLiveSource', () => {
  it('reads Graph directly with the delegated scopes when no proxy is configured', async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ value: [{ displayName: 'Contoso', countryLetterCode: 'GB', verifiedDomains: [] }] }))
    const { instance, acquireTokenSilent } = msalInstance()
    await buildLiveSource(instance, [], parseConfig({}, ORIGIN)).getOrg()
    expect(acquireTokenSilent.mock.calls[0][0].scopes).toEqual(['User.Read', 'Reports.Read.All', 'Organization.Read.All', 'Sites.Read.All'])
    expect(fetchSpy.mock.calls[0][0]).toBe('https://graph.microsoft.com/v1.0/organization?$format=application/json')
  })

  it('reads through the proxy with a token for the proxy scope when one is configured', async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ value: [{ displayName: 'Contoso', countryLetterCode: 'GB', verifiedDomains: [] }] }))
    const { instance, acquireTokenSilent } = msalInstance()
    await buildLiveSource(instance, [], parseConfig({ VITE_GRAPH_PROXY_URL: PROXY }, ORIGIN)).getOrg()
    expect(acquireTokenSilent.mock.calls[0][0].scopes).toEqual(['api://84e24db0-8904-41f8-8556-14a2b6863b1a/access_as_user'])
    expect(fetchSpy.mock.calls[0][0]).toBe(`${PROXY}/v1.0/organization?$format=application/json`)
    expect((fetchSpy.mock.calls[0][1] as RequestInit).headers).toMatchObject({ Authorization: 'Bearer user-token' })
  })
})

describe('buildLocalAuthSource', () => {
  it('mints its token at the local stack and reads through the proxy', async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse({ access_token: 'local-user', expires_in: 3600 }))
      .mockResolvedValueOnce(jsonResponse({ value: [] }))
    await buildLocalAuthSource('http://127.0.0.1:7080', parseConfig({ VITE_GRAPH_PROXY_URL: PROXY }, ORIGIN)).getLicenses()
    expect(fetchSpy.mock.calls[0][0]).toBe('http://127.0.0.1:7080/local/user-token')
    expect(fetchSpy.mock.calls[1][0]).toBe(`${PROXY}/v1.0/subscribedSkus`)
    expect((fetchSpy.mock.calls[1][1] as RequestInit).headers).toMatchObject({ Authorization: 'Bearer local-user' })
  })

  it('refuses to run without a proxy, since a local token is only good for the proxy', () => {
    expect(() => buildLocalAuthSource('http://127.0.0.1:7080', parseConfig({}, ORIGIN))).toThrow('VITE_GRAPH_PROXY_URL')
  })
})
