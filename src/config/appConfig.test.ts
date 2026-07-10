import { describe, it, expect } from 'vitest'
import { parseConfig } from './appConfig'

describe('parseConfig', () => {
  it('returns a valid AppConfig from a well-formed env source', () => {
    const config = parseConfig({
      VITE_CLIENT_ID: 'client-123',
      VITE_AUTHORITY_URI: 'https://login.microsoftonline.com/tenant-abc',
      VITE_REDIRECT_URI: 'http://localhost:5173',
    })
    expect(config).toEqual({
      VITE_CLIENT_ID: 'client-123',
      VITE_AUTHORITY_URI: 'https://login.microsoftonline.com/tenant-abc',
      VITE_REDIRECT_URI: 'http://localhost:5173',
    })
  })

  it('ignores unknown extra keys but keeps the three required ones', () => {
    const config = parseConfig({
      VITE_CLIENT_ID: 'c',
      VITE_AUTHORITY_URI: 'a',
      VITE_REDIRECT_URI: 'r',
      VITE_USE_MOCK: 'false',
      MODE: 'production',
    })
    expect(config).toEqual({
      VITE_CLIENT_ID: 'c',
      VITE_AUTHORITY_URI: 'a',
      VITE_REDIRECT_URI: 'r',
    })
  })

  it('throws on an empty object', () => {
    expect(() => parseConfig({})).toThrow(/VITE_CLIENT_ID/)
  })

  it('throws on null / non-object', () => {
    expect(() => parseConfig(null)).toThrow(/not an object/)
    expect(() => parseConfig('nope')).toThrow(/not an object/)
  })

  it('throws when a required key is missing', () => {
    expect(() =>
      parseConfig({ VITE_CLIENT_ID: 'c', VITE_AUTHORITY_URI: 'a' }),
    ).toThrow(/VITE_REDIRECT_URI/)
  })

  it('throws when a required key is an empty string', () => {
    expect(() =>
      parseConfig({
        VITE_CLIENT_ID: '',
        VITE_AUTHORITY_URI: 'a',
        VITE_REDIRECT_URI: 'r',
      }),
    ).toThrow(/VITE_CLIENT_ID/)
  })
})
