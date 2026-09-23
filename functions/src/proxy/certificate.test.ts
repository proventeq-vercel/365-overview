import { generateKeyPairSync } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { createSelfSignedCertificate } from '../../local/certificate.js'
import { generateLocalAppCertificate } from '../../local/keys.js'
import { normaliseThumbprint, readCertificateCredential } from './certificate.js'
import type { ProxyError } from './errors.js'

const registered = generateLocalAppCertificate('certificate-test')

const refuses = (pem: string, thumbprint: string | null = null, now = new Date()) => {
  try {
    readCertificateCredential(pem, thumbprint, now)
  } catch (error) {
    return error as ProxyError
  }
  throw new Error('readCertificateCredential accepted the credential')
}

describe('readCertificateCredential', () => {
  it('derives the thumbprint from the bundled certificate and keeps only the key block', () => {
    const credential = readCertificateCredential(registered.pemBundle, null)
    expect(credential.thumbprintHex).toBe(registered.thumbprintHex)
    expect(credential.thumbprintHex).toMatch(/^[0-9a-f]{40}$/)
    expect(credential.privateKeyPem).toContain('-----BEGIN PRIVATE KEY-----')
    expect(credential.privateKeyPem).not.toContain('CERTIFICATE')
  })

  it('reads a bundle whose newlines were escaped into one app-setting line', () => {
    const singleLine = registered.pemBundle.replace(/\n/g, '\\n')
    expect(readCertificateCredential(singleLine, null).thumbprintHex).toBe(registered.thumbprintHex)
  })

  it('accepts a declared thumbprint that agrees with the certificate, however it is punctuated', () => {
    const punctuated = registered.thumbprintHex.toUpperCase().replace(/(..)(?=.)/g, '$1:')
    expect(readCertificateCredential(registered.pemBundle, punctuated).thumbprintHex).toBe(
      registered.thumbprintHex,
    )
  })

  it('refuses a declared thumbprint that disagrees with the certificate', () => {
    const other = generateLocalAppCertificate('other')
    const error = refuses(registered.pemBundle, other.thumbprintHex)
    expect(error.code).toBe('InvalidConfiguration')
    expect(error.message).toContain(other.thumbprintHex)
    expect(error.message).toContain(registered.thumbprintHex)
  })

  it('trusts a declared thumbprint when the PEM carries no certificate', () => {
    const credential = readCertificateCredential(registered.privateKeyPem, registered.thumbprintHex)
    expect(credential.thumbprintHex).toBe(registered.thumbprintHex)
  })

  it('refuses a key-only PEM with no thumbprint to pair it with', () => {
    expect(refuses(registered.privateKeyPem).message).toContain('GRAPH_CERT_THUMBPRINT')
  })

  it('refuses a thumbprint that is not 40 hex characters', () => {
    expect(refuses(registered.privateKeyPem, 'deadbeef').message).toContain('40-character')
  })

  it('refuses a private key that does not belong to the certificate beside it', () => {
    const other = generateLocalAppCertificate('other')
    const mixed = `${other.privateKeyPem}${registered.certificatePem}`
    expect(refuses(mixed).message).toContain('does not belong')
  })

  it('refuses an expired certificate rather than letting Entra reject it', () => {
    const stale = createSelfSignedCertificate({
      commonName: 'stale',
      now: new Date('2020-01-01T00:00:00Z'),
      days: 1,
    })
    expect(refuses(`${stale.privateKeyPem}${stale.certificatePem}`).message).toContain('expired')
  })

  it('refuses a certificate that is not valid yet', () => {
    const future = createSelfSignedCertificate({ commonName: 'future', now: new Date('2040-01-01T00:00:00Z') })
    const error = refuses(`${future.privateKeyPem}${future.certificatePem}`)
    expect(error.message).toContain('not valid until')
  })

  it('refuses a PKCS#1 key with the command that converts it', () => {
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
    const pkcs1 = privateKey.export({ type: 'pkcs1', format: 'pem' }).toString()
    expect(refuses(pkcs1, registered.thumbprintHex).message).toContain('openssl pkcs8 -topk8 -nocrypt')
  })

  it('refuses a key that cannot sign RS256', () => {
    const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' })
    const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
    expect(refuses(pem, registered.thumbprintHex).message).toContain('RSA key is required')
  })

  it('finds the leaf in a chain, whichever order the bundle lists it in', () => {
    const intermediate = generateLocalAppCertificate('intermediate')
    const leafLast = `${registered.privateKeyPem}${intermediate.certificatePem}${registered.certificatePem}`
    const leafFirst = `${registered.privateKeyPem}${registered.certificatePem}${intermediate.certificatePem}`
    expect(readCertificateCredential(leafLast, null).thumbprintHex).toBe(registered.thumbprintHex)
    expect(readCertificateCredential(leafFirst, null).thumbprintHex).toBe(registered.thumbprintHex)
  })

  it('refuses a chain in which no certificate matches the key', () => {
    const one = generateLocalAppCertificate('one')
    const two = generateLocalAppCertificate('two')
    const chain = `${registered.privateKeyPem}${one.certificatePem}${two.certificatePem}`
    expect(refuses(chain).message).toContain('None of the 2 certificates')
  })

  it('reads a bundle whose CRLF newlines were escaped into one app-setting line', () => {
    const escapedCrlf = registered.pemBundle.replace(/\n/g, '\\r\\n')
    expect(readCertificateCredential(escapedCrlf, null).thumbprintHex).toBe(registered.thumbprintHex)
  })

  it('reads a bundle that carries real CRLF newlines', () => {
    const crlf = registered.pemBundle.replace(/\n/g, '\r\n')
    expect(readCertificateCredential(crlf, null).thumbprintHex).toBe(registered.thumbprintHex)
  })

  it('refuses a PEM with no private key at all', () => {
    expect(refuses(registered.certificatePem).message).toContain('PKCS#8')
  })

  it('refuses an unreadable certificate block', () => {
    const broken = `${registered.privateKeyPem}-----BEGIN CERTIFICATE-----\nbm90LWEtY2VydA==\n-----END CERTIFICATE-----\n`
    expect(refuses(broken).message).toContain('unreadable certificate')
  })
})

describe('normaliseThumbprint', () => {
  it('strips the punctuation the portal shows and lowercases the hex', () => {
    expect(normaliseThumbprint('98:F9 06A6')).toBe('98f906a6')
  })
})
