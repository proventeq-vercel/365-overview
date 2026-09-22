import { exportJWK, exportPKCS8, generateKeyPair, type CryptoKey, type JWK } from 'jose'
import { createSelfSignedCertificate } from './certificate.js'

export interface LocalKeyPair {
  privateKey: CryptoKey
  publicKey: CryptoKey
  privateKeyPem: string
  publicJwk: JWK
}

export interface LocalAppCertificate {
  privateKeyPem: string
  certificatePem: string
  thumbprintHex: string
  pemBundle: string
}

export async function generateLocalKeyPair(kid: string): Promise<LocalKeyPair> {
  const { privateKey, publicKey } = await generateKeyPair('RS256', { extractable: true })
  return {
    privateKey,
    publicKey,
    privateKeyPem: await exportPKCS8(privateKey),
    publicJwk: { ...(await exportJWK(publicKey)), kid, use: 'sig', alg: 'RS256' },
  }
}

export function generateLocalAppCertificate(commonName = 'local-graph-proxy'): LocalAppCertificate {
  const { privateKeyPem, certificatePem, thumbprintHex } = createSelfSignedCertificate({ commonName })
  return { privateKeyPem, certificatePem, thumbprintHex, pemBundle: `${privateKeyPem}${certificatePem}` }
}
