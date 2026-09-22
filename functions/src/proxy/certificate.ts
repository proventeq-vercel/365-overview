import { createPrivateKey, X509Certificate } from 'node:crypto'
import { ProxyError } from './errors.js'

export interface CertificateCredential {
  privateKeyPem: string
  thumbprintHex: string
}

const PEM_BLOCK = /-----BEGIN ([A-Z0-9 ]+)-----[\s\S]*?-----END \1-----/g
const SHA1_THUMBPRINT = /^[0-9a-f]{40}$/

const invalid = (message: string) => new ProxyError(500, 'InvalidConfiguration', message)

export const normaliseThumbprint = (value: string) => value.replace(/[\s:]/g, '').toLowerCase()

function blocksOf(pem: string): Map<string, string[]> {
  const blocks = new Map<string, string[]>()
  for (const [block, label] of pem.matchAll(PEM_BLOCK)) {
    const found = blocks.get(label)
    if (found) found.push(block)
    else blocks.set(label, [block])
  }
  return blocks
}

function readPrivateKey(blocks: Map<string, string[]>) {
  if (blocks.has('RSA PRIVATE KEY')) {
    throw invalid(
      'GRAPH_CERT_PEM holds a PKCS#1 key. Convert it with `openssl pkcs8 -topk8 -nocrypt` so it begins with -----BEGIN PRIVATE KEY-----.',
    )
  }
  if (blocks.has('ENCRYPTED PRIVATE KEY')) {
    throw invalid('GRAPH_CERT_PEM holds a passphrase-protected key; supply an unencrypted PKCS#8 key.')
  }
  const pem = blocks.get('PRIVATE KEY')?.[0]
  if (!pem) throw invalid('GRAPH_CERT_PEM must contain a PKCS#8 -----BEGIN PRIVATE KEY----- block.')
  let key
  try {
    key = createPrivateKey(pem)
  } catch (error) {
    throw invalid(`GRAPH_CERT_PEM could not be read as a private key: ${(error as Error).message}`)
  }
  if (key.asymmetricKeyType !== 'rsa') {
    throw invalid(
      `GRAPH_CERT_PEM holds a ${key.asymmetricKeyType ?? 'unknown'} key; the client assertion is signed RS256, so an RSA key is required.`,
    )
  }
  return { pem, key }
}

function leafCertificate(
  certificatePems: string[],
  privateKey: ReturnType<typeof createPrivateKey>,
): X509Certificate {
  const parsed = certificatePems.map((pem) => {
    try {
      return new X509Certificate(pem)
    } catch (error) {
      throw invalid(`GRAPH_CERT_PEM holds an unreadable certificate: ${(error as Error).message}`)
    }
  })
  const leaf = parsed.find((certificate) => certificate.checkPrivateKey(privateKey))
  if (!leaf) {
    throw invalid(
      parsed.length > 1
        ? `None of the ${parsed.length} certificates in GRAPH_CERT_PEM belongs to the private key beside them.`
        : 'The certificate in GRAPH_CERT_PEM does not belong to the private key beside it.',
    )
  }
  return leaf
}

function thumbprintOfCertificate(certificate: X509Certificate, now: Date): string {
  if (!(certificate.validToDate > now)) {
    throw invalid(`The certificate in GRAPH_CERT_PEM expired on ${certificate.validTo}; Entra will refuse it.`)
  }
  if (!(certificate.validFromDate <= now)) {
    throw invalid(`The certificate in GRAPH_CERT_PEM is not valid until ${certificate.validFrom}.`)
  }
  return normaliseThumbprint(certificate.fingerprint)
}

export function readCertificateCredential(
  rawPem: string,
  declaredThumbprint: string | null,
  now: Date = new Date(),
): CertificateCredential {
  const pem = rawPem.replace(/\\r\\n|\\r|\\n/g, '\n')
  const blocks = blocksOf(pem)
  const { pem: privateKeyPem, key } = readPrivateKey(blocks)
  const certificatePems = blocks.get('CERTIFICATE')
  const declared = declaredThumbprint ? normaliseThumbprint(declaredThumbprint) : null

  if (declared && !SHA1_THUMBPRINT.test(declared)) {
    throw invalid(
      `GRAPH_CERT_THUMBPRINT must be the certificate's 40-character SHA-1 thumbprint in hex; got "${declaredThumbprint}".`,
    )
  }

  if (!certificatePems) {
    if (!declared) {
      throw invalid(
        'Set GRAPH_CERT_THUMBPRINT, or append the -----BEGIN CERTIFICATE----- block to GRAPH_CERT_PEM so the thumbprint is derived from it.',
      )
    }
    return { privateKeyPem, thumbprintHex: declared }
  }

  const thumbprintHex = thumbprintOfCertificate(leafCertificate(certificatePems, key), now)
  if (declared && declared !== thumbprintHex) {
    throw invalid(
      `GRAPH_CERT_THUMBPRINT (${declared}) does not match the certificate in GRAPH_CERT_PEM (${thumbprintHex}); Entra would reject the client assertion.`,
    )
  }
  return { privateKeyPem, thumbprintHex }
}
