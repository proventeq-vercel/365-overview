import { describe, it, expect } from 'vitest'
import { readEnv } from './env'

describe('readEnv', () => {
  it('reads ids and defaults redirectUri to origin', () => {
    const env = readEnv({ VITE_AAD_CLIENT_ID: 'c', VITE_AAD_TENANT_ID: 't', VITE_USE_MOCK: 'false' }, 'http://localhost:3000')
    expect(env).toEqual({ clientId: 'c', tenantId: 't', redirectUri: 'http://localhost:3000', useMock: false })
  })
  it('parses useMock true and explicit redirectUri', () => {
    const env = readEnv({ VITE_AAD_CLIENT_ID: 'c', VITE_AAD_TENANT_ID: 't', VITE_AAD_REDIRECT_URI: 'http://x', VITE_USE_MOCK: 'true' }, 'http://localhost:3000')
    expect(env.useMock).toBe(true)
    expect(env.redirectUri).toBe('http://x')
  })
})
