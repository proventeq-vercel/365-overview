import { createHash } from 'node:crypto'
import { exportJWK, exportPKCS8, exportSPKI, generateKeyPair, type CryptoKey, type JWK } from 'jose'

export interface LocalKeyPair {
  privateKey: CryptoKey
  publicKey: CryptoKey
  privateKeyPem: string
  publicJwk: JWK
  thumbprintHex: string
}

export async function generateLocalKeyPair(kid: string): Promise<LocalKeyPair> {
  const { privateKey, publicKey } = await generateKeyPair('RS256', { extractable: true })
  const publicJwk = { ...(await exportJWK(publicKey)), kid, use: 'sig', alg: 'RS256' }
  const spki = await exportSPKI(publicKey)
  return {
    privateKey,
    publicKey,
    privateKeyPem: await exportPKCS8(privateKey),
    publicJwk,
    thumbprintHex: createHash('sha1').update(spki).digest('hex'),
  }
}
