import { createSign, generateKeyPairSync, randomBytes, X509Certificate } from 'node:crypto'

export interface SelfSignedCertificate {
  privateKeyPem: string
  certificatePem: string
  thumbprintHex: string
  notAfter: Date
}

export interface SelfSignedCertificateOptions {
  commonName: string
  days?: number
  now?: Date
  modulusLength?: number
}

const DEFAULT_DAYS = 730
const DEFAULT_MODULUS_LENGTH = 2048
const DAY_MS = 86_400_000

const SHA256_WITH_RSA_OID = '1.2.840.113549.1.1.11'
const COMMON_NAME_OID = '2.5.4.3'
const BASIC_CONSTRAINTS_OID = '2.5.29.19'
const KEY_USAGE_OID = '2.5.29.15'

function encodeLength(length: number): Buffer {
  if (length < 0x80) return Buffer.from([length])
  const bytes: number[] = []
  let rest = length
  while (rest > 0) {
    bytes.unshift(rest & 0xff)
    rest = Math.floor(rest / 256)
  }
  return Buffer.from([0x80 | bytes.length, ...bytes])
}

function tlv(tag: number, ...content: Buffer[]): Buffer {
  const body = Buffer.concat(content)
  return Buffer.concat([Buffer.from([tag]), encodeLength(body.length), body])
}

const sequence = (...items: Buffer[]) => tlv(0x30, ...items)
const set = (...items: Buffer[]) => tlv(0x31, ...items)
const octetString = (value: Buffer) => tlv(0x04, value)
const utf8String = (value: string) => tlv(0x0c, Buffer.from(value, 'utf8'))
const explicit = (index: number, ...items: Buffer[]) => tlv(0xa0 | index, ...items)
const boolean = (value: boolean) => Buffer.from([0x01, 0x01, value ? 0xff : 0x00])
const NULL = Buffer.from([0x05, 0x00])

function integer(value: Buffer): Buffer {
  const padded = value.length > 0 && (value[0] & 0x80) !== 0 ? Buffer.concat([Buffer.from([0]), value]) : value
  return tlv(0x02, padded)
}

export function serialNumber(random = randomBytes(16)): Buffer {
  const bytes = Buffer.from(random)
  bytes[0] = (bytes[0] & 0x7f) | 0x01
  return bytes
}

function bitString(value: Buffer, unusedBits = 0): Buffer {
  return tlv(0x03, Buffer.from([unusedBits]), value)
}

export function objectIdentifier(oid: string): Buffer {
  const parts = oid.split('.').map(Number)
  if (parts.length < 2 || parts.some((part) => !Number.isInteger(part) || part < 0)) {
    throw new Error(`Not an object identifier: ${oid}`)
  }
  const bytes = [parts[0] * 40 + parts[1]]
  for (const part of parts.slice(2)) {
    const chunk: number[] = []
    let rest = part
    do {
      chunk.unshift((rest & 0x7f) | (chunk.length > 0 ? 0x80 : 0))
      rest = Math.floor(rest / 128)
    } while (rest > 0)
    bytes.push(...chunk)
  }
  return tlv(0x06, Buffer.from(bytes))
}

const pad2 = (value: number) => String(value).padStart(2, '0')

export function utcTime(date: Date): Buffer {
  const year = date.getUTCFullYear()
  if (year < 1950 || year >= 2050) {
    throw new Error(`UTCTime cannot carry the year ${year}; shorten the certificate lifetime.`)
  }
  const text = [
    pad2(year % 100),
    pad2(date.getUTCMonth() + 1),
    pad2(date.getUTCDate()),
    pad2(date.getUTCHours()),
    pad2(date.getUTCMinutes()),
    pad2(date.getUTCSeconds()),
  ].join('')
  return tlv(0x17, Buffer.from(`${text}Z`, 'ascii'))
}

const distinguishedName = (commonName: string) =>
  sequence(set(sequence(objectIdentifier(COMMON_NAME_OID), utf8String(commonName))))

const extension = (oid: string, critical: boolean, value: Buffer) =>
  critical
    ? sequence(objectIdentifier(oid), boolean(true), octetString(value))
    : sequence(objectIdentifier(oid), octetString(value))

export function toPem(label: string, der: Buffer): string {
  const body = der.toString('base64').replace(/(.{64})/g, '$1\n').replace(/\n$/, '')
  return `-----BEGIN ${label}-----\n${body}\n-----END ${label}-----\n`
}

export function createSelfSignedCertificate(
  options: SelfSignedCertificateOptions,
): SelfSignedCertificate {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: options.modulusLength ?? DEFAULT_MODULUS_LENGTH,
  })
  const notBefore = options.now ?? new Date()
  const notAfter = new Date(notBefore.getTime() + (options.days ?? DEFAULT_DAYS) * DAY_MS)

  const tbsCertificate = sequence(
    explicit(0, integer(Buffer.from([2]))),
    integer(serialNumber()),
    sequence(objectIdentifier(SHA256_WITH_RSA_OID), NULL),
    distinguishedName(options.commonName),
    sequence(utcTime(notBefore), utcTime(notAfter)),
    distinguishedName(options.commonName),
    publicKey.export({ type: 'spki', format: 'der' }),
    explicit(
      3,
      sequence(
        extension(BASIC_CONSTRAINTS_OID, true, sequence()),
        extension(KEY_USAGE_OID, true, bitString(Buffer.from([0x80]), 7)),
      ),
    ),
  )

  const signature = createSign('RSA-SHA256').update(tbsCertificate).sign(privateKey)
  const certificatePem = toPem(
    'CERTIFICATE',
    sequence(tbsCertificate, sequence(objectIdentifier(SHA256_WITH_RSA_OID), NULL), bitString(signature)),
  )

  const certificate = new X509Certificate(certificatePem)
  if (!certificate.checkPrivateKey(privateKey)) {
    throw new Error('The generated certificate does not match its own private key.')
  }

  return {
    privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    certificatePem,
    thumbprintHex: certificate.fingerprint.replace(/:/g, '').toLowerCase(),
    notAfter,
  }
}
