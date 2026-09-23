import { describe, expect, it, vi } from 'vitest'
import { adminConsentUrl, adminConsentUrlFor, buildAdminConsentUrl, consentClientIdFor } from './adminConsent'
import { parseConfig } from './appConfig'

const envState = vi.hoisted(() => ({ useMock: false }))

vi.mock('./env', () => ({
  env: {
    get useMock() {
      return envState.useMock
    },
    get usesMsal() {
      return !envState.useMock
    },
  },
}))

describe('buildAdminConsentUrl', () => {
  it('points at the multi-tenant organizations consent endpoint', () => {
    expect(buildAdminConsentUrl('client-123', 'https://oversharing.example/')).toBe(
      'https://login.microsoftonline.com/organizations/adminconsent?client_id=client-123&redirect_uri=https%3A%2F%2Foversharing.example%2F',
    )
  })
})

describe('adminConsentUrlFor', () => {
  it('links the built-in registration when no auth env is set', () => {
    expect(adminConsentUrlFor(parseConfig({}, 'https://365-overview.vercel.app'))).toBe(
      'https://login.microsoftonline.com/organizations/adminconsent?client_id=84e24db0-8904-41f8-8556-14a2b6863b1a&redirect_uri=https%3A%2F%2F365-overview.vercel.app%2F',
    )
  })

  it('links the registration the env names', () => {
    expect(
      adminConsentUrlFor(
        parseConfig(
          { VITE_CLIENT_ID: 'client-123', VITE_REDIRECT_URI: 'http://localhost:5173/' },
          'https://365-overview.vercel.app',
        ),
      ),
    ).toBe(
      'https://login.microsoftonline.com/organizations/adminconsent?client_id=client-123&redirect_uri=http%3A%2F%2Flocalhost%3A5173%2F',
    )
  })
})

describe('consentClientIdFor', () => {
  it('consents the proxy registration when the proxy scope names a different app', () => {
    const config = parseConfig(
      {
        VITE_CLIENT_ID: 'spa-app',
        VITE_GRAPH_PROXY_URL: 'https://proxy.example/api/graph',
        VITE_GRAPH_PROXY_SCOPE: 'api://proxy-app/access_as_user',
      },
      'https://365-overview.vercel.app',
    )
    expect(consentClientIdFor(config)).toBe('proxy-app')
    expect(adminConsentUrlFor(config)).toContain('client_id=proxy-app')
  })

  it('reads the app id, not the tenant domain, from the domain-qualified scope form', () => {
    const config = parseConfig(
      {
        VITE_CLIENT_ID: 'spa-app',
        VITE_GRAPH_PROXY_URL: 'https://proxy.example/api/graph',
        VITE_GRAPH_PROXY_SCOPE: 'api://proventeq.com/proxy-app/access_as_user',
      },
      'https://365-overview.vercel.app',
    )
    expect(consentClientIdFor(config)).toBe('proxy-app')
  })

  it('consents the SPA registration when the proxy shares it', () => {
    const config = parseConfig(
      { VITE_CLIENT_ID: 'spa-app', VITE_GRAPH_PROXY_URL: 'https://proxy.example/api/graph' },
      'https://365-overview.vercel.app',
    )
    expect(consentClientIdFor(config)).toBe('spa-app')
  })

  it('consents the SPA registration when there is no proxy', () => {
    expect(consentClientIdFor(parseConfig({ VITE_CLIENT_ID: 'spa-app' }, 'https://x.example'))).toBe('spa-app')
  })
})

describe('adminConsentUrl', () => {
  it('always has a link in live mode, from the resolved config', () => {
    envState.useMock = false
    expect(adminConsentUrl()).toBe(
      `https://login.microsoftonline.com/organizations/adminconsent?client_id=84e24db0-8904-41f8-8556-14a2b6863b1a&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2F`,
    )
  })

  it('has no link in mock mode', () => {
    envState.useMock = true
    expect(adminConsentUrl()).toBeNull()
  })
})
