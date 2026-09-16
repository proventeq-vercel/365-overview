import { describe, it, expect } from 'vitest'
import { DEFAULT_AUTH, parseConfig } from './appConfig'

const ORIGIN = 'https://365-overview.vercel.app'

describe('parseConfig', () => {
  it('runs on the built-in registration when no env is set at all', () => {
    expect(parseConfig({}, ORIGIN)).toEqual({
      VITE_CLIENT_ID: '84e24db0-8904-41f8-8556-14a2b6863b1a',
      VITE_AUTHORITY_URI: 'https://login.microsoftonline.com/organizations',
      VITE_REDIRECT_URI: 'https://365-overview.vercel.app/',
    })
    expect(DEFAULT_AUTH).toEqual({
      clientId: '84e24db0-8904-41f8-8556-14a2b6863b1a',
      authority: 'https://login.microsoftonline.com/organizations',
    })
  })

  it('lets the env replace each value', () => {
    expect(
      parseConfig(
        {
          VITE_CLIENT_ID: 'client-123',
          VITE_AUTHORITY_URI: 'https://login.microsoftonline.com/organizations',
          VITE_REDIRECT_URI: 'http://localhost:5173/',
        },
        ORIGIN,
      ),
    ).toEqual({
      VITE_CLIENT_ID: 'client-123',
      VITE_AUTHORITY_URI: 'https://login.microsoftonline.com/organizations',
      VITE_REDIRECT_URI: 'http://localhost:5173/',
    })
  })

  it('treats an empty value like an unset one', () => {
    const config = parseConfig(
      { VITE_CLIENT_ID: '', VITE_AUTHORITY_URI: '  ', VITE_REDIRECT_URI: '' },
      'http://localhost:5173',
    )
    expect(config.VITE_CLIENT_ID).toBe(DEFAULT_AUTH.clientId)
    expect(config.VITE_AUTHORITY_URI).toBe(DEFAULT_AUTH.authority)
    expect(config.VITE_REDIRECT_URI).toBe('http://localhost:5173/')
  })

  it('ignores unknown keys', () => {
    const config = parseConfig({ VITE_USE_MOCK: 'false', MODE: 'production' }, ORIGIN)
    expect(Object.keys(config)).toEqual(['VITE_CLIENT_ID', 'VITE_AUTHORITY_URI', 'VITE_REDIRECT_URI'])
  })

  it('falls back to the defaults for a source that is not an object', () => {
    expect(parseConfig(null, ORIGIN).VITE_CLIENT_ID).toBe(DEFAULT_AUTH.clientId)
    expect(parseConfig('nope', ORIGIN).VITE_REDIRECT_URI).toBe('https://365-overview.vercel.app/')
  })
})
