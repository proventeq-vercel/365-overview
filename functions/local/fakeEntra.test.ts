import { decodeJwt, importPKCS8 } from 'jose'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildClientAssertion, tokenEndpoint } from '../src/proxy/appToken.js'
import { startFakeEntra, LOCAL_TENANT_ID, type FakeEntra } from './fakeEntra.js'
import { generateLocalAppCertificate, generateLocalKeyPair, type LocalAppCertificate } from './keys.js'

const CLIENT_ID = '0f0f0f0f-1111-4222-8333-444444444444'

let entra: FakeEntra
let registered: LocalAppCertificate

beforeAll(async () => {
  registered = generateLocalAppCertificate('fake-entra-test')
  entra = await startFakeEntra({
    issuerKey: await generateLocalKeyPair('issuer'),
    app: { clientId: CLIENT_ID, certificatePem: registered.certificatePem },
    proxyAudience: `api://${CLIENT_ID}`,
    proxyScope: 'access_as_user',
  })
})

afterAll(async () => {
  await entra?.close()
})

const post = (assertion: string) =>
  fetch(tokenEndpoint(entra.url, LOCAL_TENANT_ID), {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'client_credentials',
      scope: 'https://graph.microsoft.com/.default',
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: assertion,
    }),
  })

const assertionWith = async (thumbprintHex: string, keyPem = registered.privateKeyPem) =>
  buildClientAssertion(
    CLIENT_ID,
    tokenEndpoint(entra.url, LOCAL_TENANT_ID),
    { kind: 'certificate', privateKeyPem: keyPem, thumbprintHex },
    await importPKCS8(keyPem, 'RS256'),
  )

describe('the fake Entra token endpoint, as a stand-in for the real one', () => {
  it('issues a token for an assertion signed by the registered certificate', async () => {
    const response = await post(await assertionWith(registered.thumbprintHex))
    expect(response.status).toBe(200)
    const claims = decodeJwt(((await response.json()) as { access_token: string }).access_token)
    expect(claims).toMatchObject({
      tid: LOCAL_TENANT_ID,
      roles: ['Reports.Read.All', 'Sites.Read.All', 'Organization.Read.All'],
    })
  })

  it('refuses an assertion whose x5t names a certificate it never registered', async () => {
    const stranger = generateLocalAppCertificate('stranger')
    const response = await post(await assertionWith(stranger.thumbprintHex))
    expect(response.status).toBe(400)
    expect(((await response.json()) as { error_description: string }).error_description).toContain(
      'AADSTS700027',
    )
  })

  it('refuses the right x5t signed by the wrong key', async () => {
    const stranger = generateLocalAppCertificate('stranger')
    const response = await post(await assertionWith(registered.thumbprintHex, stranger.privateKeyPem))
    expect(response.status).toBe(400)
    expect(((await response.json()) as { error_description: string }).error_description).toContain(
      'AADSTS700027',
    )
  })
})
