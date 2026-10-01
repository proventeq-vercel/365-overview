import { describe, expect, it } from 'vitest'
import { parseConfig } from '../config/appConfig'
import { GRAPH_SCOPES, loginRequestFor, tokenScopesFor } from './msalConfig'

const ORIGIN = 'https://365-overview.vercel.app'

describe('tokenScopesFor', () => {
  it('asks Graph directly for what the registration was granted when no proxy is configured, so a missing optional permission never blocks sign-in', () => {
    expect(tokenScopesFor(parseConfig({}, ORIGIN))).toBe(GRAPH_SCOPES)
    expect(GRAPH_SCOPES).toEqual(['https://graph.microsoft.com/.default'])
  })

  it('asks only for the proxy scope when the proxy is configured, so no delegated Graph consent is requested', () => {
    expect(tokenScopesFor(parseConfig({ VITE_GRAPH_PROXY_URL: 'https://proxy.example/api/graph' }, ORIGIN))).toEqual([
      'api://84e24db0-8904-41f8-8556-14a2b6863b1a/access_as_user',
    ])
  })
})

describe('loginRequestFor', () => {
  it('signs a delegated site in with every Graph permission the app has, so one prompt covers sign-in and the report', () => {
    expect(loginRequestFor(parseConfig({}, ORIGIN))).toEqual({ scopes: ['https://graph.microsoft.com/.default'] })
  })

  it('signs a proxy site in with the proxy scope only', () => {
    expect(loginRequestFor(parseConfig({ VITE_GRAPH_PROXY_URL: 'https://proxy.example/api/graph' }, ORIGIN))).toEqual({
      scopes: ['api://84e24db0-8904-41f8-8556-14a2b6863b1a/access_as_user'],
    })
  })
})
