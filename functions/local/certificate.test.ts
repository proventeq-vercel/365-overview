import { createPrivateKey, X509Certificate } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { createSelfSignedCertificate, objectIdentifier, toPem, utcTime } from './certificate.js'

const generated = createSelfSignedCertificate({ commonName: 'graph-proxy-test', days: 30 })
const certificate = new X509Certificate(generated.certificatePem)

describe('createSelfSignedCertificate', () => {
  it('produces a v3 certificate Node can parse, named after the common name', () => {
    expect(certificate.subject).toBe('CN=graph-proxy-test')
    expect(certificate.issuer).toBe('CN=graph-proxy-test')
    expect(certificate.ca).toBe(false)
  })

  it('marks itself a critical end-entity certificate that may sign', () => {
    const der = Buffer.from(certificate.raw).toString('hex')
    expect(der).toContain('0603551d130101ff04023000')
    expect(der).toContain('0603551d0f0101ff040403020780')
  })

  it('is signed by its own key, so Entra can verify the chain of one', () => {
    expect(certificate.verify(certificate.publicKey)).toBe(true)
    expect(certificate.checkPrivateKey(createPrivateKey(generated.privateKeyPem))).toBe(true)
  })

  it('reports the SHA-1 thumbprint Entra hashes from the DER, in lowercase hex', () => {
    expect(generated.thumbprintHex).toBe(certificate.fingerprint.replace(/:/g, '').toLowerCase())
    expect(generated.thumbprintHex).toMatch(/^[0-9a-f]{40}$/)
  })

  it('carries an RSA 2048-bit key, the size Entra expects of an uploaded certificate', () => {
    expect(certificate.publicKey.asymmetricKeyType).toBe('rsa')
    expect(certificate.publicKey.asymmetricKeyDetails?.modulusLength).toBe(2048)
  })

  it('dates the certificate from the supplied clock', () => {
    const issued = createSelfSignedCertificate({
      commonName: 'dated',
      now: new Date('2030-03-04T05:06:07Z'),
      days: 10,
    })
    const parsed = new X509Certificate(issued.certificatePem)
    expect(new Date(parsed.validFrom).toISOString()).toBe('2030-03-04T05:06:07.000Z')
    expect(new Date(parsed.validTo).toISOString()).toBe('2030-03-14T05:06:07.000Z')
    expect(issued.notAfter.toISOString()).toBe('2030-03-14T05:06:07.000Z')
  })

  it('gives every certificate its own serial number and key', () => {
    const other = createSelfSignedCertificate({ commonName: 'graph-proxy-test', days: 30 })
    expect(other.thumbprintHex).not.toBe(generated.thumbprintHex)
    expect(new X509Certificate(other.certificatePem).serialNumber).not.toBe(certificate.serialNumber)
  })
})

describe('utcTime', () => {
  it('encodes the year, month and seconds as an ASN.1 UTCTime', () => {
    expect(utcTime(new Date('2026-09-22T04:05:06Z')).subarray(2).toString('ascii')).toBe('260922040506Z')
  })

  it('refuses a year UTCTime cannot express', () => {
    expect(() => utcTime(new Date('2051-01-01T00:00:00Z'))).toThrow('2051')
  })
})

describe('objectIdentifier', () => {
  it('encodes sha256WithRSAEncryption to its known DER bytes', () => {
    expect(objectIdentifier('1.2.840.113549.1.1.11').toString('hex')).toBe('06092a864886f70d01010b')
  })

  it('encodes a short OID by packing the first two arcs into one byte', () => {
    expect(objectIdentifier('2.5.4.3').toString('hex')).toBe('0603550403')
  })

  it('refuses something that is not an OID', () => {
    expect(() => objectIdentifier('1')).toThrow('object identifier')
  })
})

describe('toPem', () => {
  it('wraps base64 at 64 characters between the labelled guards', () => {
    const pem = toPem('CERTIFICATE', Buffer.alloc(120, 1))
    const lines = pem.trimEnd().split('\n')
    expect(lines[0]).toBe('-----BEGIN CERTIFICATE-----')
    expect(lines.at(-1)).toBe('-----END CERTIFICATE-----')
    expect(lines.slice(1, -1).every((line) => line.length <= 64)).toBe(true)
  })
})
