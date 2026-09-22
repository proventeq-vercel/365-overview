import { describe, expect, it } from 'vitest'
import { generateLocalAppCertificate } from '../../local/keys.js'
import {
  DEFAULT_REQUIRED_DIRECTORY_ROLES,
  PUBLIC_AUTHORITY_HOST,
  PUBLIC_GRAPH_ORIGIN,
  readConfig,
} from './config.js'
import { ProxyError } from './errors.js'

const appCertificate = generateLocalAppCertificate('config-test')

const complete = {
  GRAPH_CLIENT_ID: 'client-id',
  GRAPH_CERT_PEM: appCertificate.pemBundle,
  PROXY_AUDIENCES: 'api://client-id, client-id',
  PROXY_ALLOWED_ORIGINS: 'http://localhost:5173',
}

describe('readConfig', () => {
  it('names every missing setting in one error', () => {
    const error = (() => {
      try {
        readConfig({})
      } catch (e) {
        return e as ProxyError
      }
      return null
    })()
    expect(error).toBeInstanceOf(ProxyError)
    expect(error?.status).toBe(500)
    expect(error?.code).toBe('InvalidConfiguration')
    expect(error?.message).toContain('GRAPH_CLIENT_ID')
    expect(error?.message).toContain('GRAPH_CERT_PEM')
    expect(error?.message).toContain('PROXY_AUDIENCES')
    expect(error?.message).toContain('PROXY_ALLOWED_ORIGINS')
  })

  it('unescapes a single-line PEM, derives the thumbprint and prefers the certificate over a secret', () => {
    const singleLine = appCertificate.pemBundle.replace(/\n/g, '\\n')
    const config = readConfig({ ...complete, GRAPH_CERT_PEM: singleLine, GRAPH_CLIENT_SECRET: 'secret' })
    expect(config.credential).toEqual({
      kind: 'certificate',
      privateKeyPem: appCertificate.privateKeyPem.trimEnd(),
      thumbprintHex: appCertificate.thumbprintHex,
    })
  })

  it('falls back to a client secret when no certificate is configured', () => {
    const { GRAPH_CERT_PEM: _pem, ...rest } = complete
    expect(readConfig({ ...rest, GRAPH_CLIENT_SECRET: 'secret' }).credential).toEqual({
      kind: 'secret',
      clientSecret: 'secret',
    })
  })

  it('applies the public defaults and the four admin directory roles', () => {
    const config = readConfig(complete)
    expect(config.audiences).toEqual(['api://client-id', 'client-id'])
    expect(config.scope).toBe('access_as_user')
    expect(config.authorityHost).toBe(PUBLIC_AUTHORITY_HOST)
    expect(config.graphOrigin).toBe(PUBLIC_GRAPH_ORIGIN)
    expect(config.allowedTenantIds).toBeNull()
    expect(config.allowedOrigins).toEqual(['http://localhost:5173'])
    expect(config.publicUrl).toBeNull()
    expect(config.requiredDirectoryRoles).toEqual(DEFAULT_REQUIRED_DIRECTORY_ROLES)
    expect(config.requiredDirectoryRoles).toHaveLength(4)
  })

  it('lower-cases tenant and role ids and trims trailing slashes off hosts', () => {
    const config = readConfig({
      ...complete,
      PROXY_ALLOWED_TENANT_IDS: 'AAAA, bbbb',
      PROXY_REQUIRED_DIRECTORY_ROLES: 'ROLE-1',
      PROXY_ALLOWED_ORIGINS: 'http://localhost:5173/',
      ENTRA_AUTHORITY_HOST: 'http://127.0.0.1:7080/',
      GRAPH_ORIGIN: 'http://127.0.0.1:7090/',
      PROXY_PUBLIC_URL: 'https://proxy.example/',
    })
    expect(config.allowedTenantIds).toEqual(['aaaa', 'bbbb'])
    expect(config.requiredDirectoryRoles).toEqual(['role-1'])
    expect(config.allowedOrigins).toEqual(['http://localhost:5173'])
    expect(config.authorityHost).toBe('http://127.0.0.1:7080')
    expect(config.graphOrigin).toBe('http://127.0.0.1:7090')
    expect(config.publicUrl).toBe('https://proxy.example')
  })
})
