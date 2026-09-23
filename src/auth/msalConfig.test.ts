import { describe, expect, it } from 'vitest'
import { parseConfig } from '../config/appConfig'
import { GRAPH_SCOPES, tokenScopesFor } from './msalConfig'

const ORIGIN = 'https://365-overview.vercel.app'

describe('tokenScopesFor', () => {
  it('asks Graph directly for the delegated report scopes when no proxy is configured', () => {
    expect(tokenScopesFor(parseConfig({}, ORIGIN))).toBe(GRAPH_SCOPES)
    expect(GRAPH_SCOPES).toEqual(['User.Read', 'Reports.Read.All', 'Organization.Read.All', 'Sites.Read.All'])
  })

  it('asks only for the proxy scope when the proxy is configured, so no delegated Graph consent is requested', () => {
    expect(tokenScopesFor(parseConfig({ VITE_GRAPH_PROXY_URL: 'https://proxy.example/api/graph' }, ORIGIN))).toEqual([
      'api://84e24db0-8904-41f8-8556-14a2b6863b1a/access_as_user',
    ])
  })
})
