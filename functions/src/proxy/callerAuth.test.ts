import { createLocalJWKSet, SignJWT } from 'jose'
import { beforeAll, describe, expect, it } from 'vitest'
import { generateLocalKeyPair, type LocalKeyPair } from '../../local/keys.js'
import { acceptedIssuers, createCallerVerifier, type CallerVerifier } from './callerAuth.js'
import { DIRECTORY_ROLES, readConfig, type ProxyConfig } from './config.js'
import type { ProxyError } from './errors.js'

const TENANT = '11111111-2222-4333-8444-555555555555'
const OTHER_TENANT = '99999999-2222-4333-8444-555555555555'
const OID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
const AUDIENCE = 'api://proxy'

const baseEnv = {
  GRAPH_CLIENT_ID: 'graph-app',
  GRAPH_CLIENT_SECRET: 'secret',
  PROXY_AUDIENCES: `${AUDIENCE},proxy`,
  PROXY_ALLOWED_ORIGINS: 'http://localhost:5173',
}

let key: LocalKeyPair

beforeAll(async () => {
  key = await generateLocalKeyPair('test-issuer')
})

interface TokenShape {
  tid?: string
  aud?: string
  iss?: string
  scp?: string
  oid?: string | null
  wids?: string[]
  exp?: number
}

async function token(shape: TokenShape = {}): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const claims: Record<string, unknown> = {
    tid: shape.tid ?? TENANT,
    scp: shape.scp ?? 'access_as_user',
    wids: shape.wids ?? [DIRECTORY_ROLES.reportsReader],
  }
  if (shape.oid !== null) claims.oid = shape.oid ?? OID
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: 'test-issuer' })
    .setIssuer(shape.iss ?? `https://login.microsoftonline.com/${shape.tid ?? TENANT}/v2.0`)
    .setAudience(shape.aud ?? AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(shape.exp ?? now + 600)
    .sign(key.privateKey)
}

const verifier = (env: Record<string, string> = {}): CallerVerifier => {
  const config: ProxyConfig = readConfig({ ...baseEnv, ...env })
  return createCallerVerifier(config, createLocalJWKSet({ keys: [key.publicJwk] }))
}

const rejection = async (verify: CallerVerifier, header: string | null): Promise<ProxyError> => {
  try {
    await verify(header)
  } catch (error) {
    return error as ProxyError
  }
  throw new Error('expected the caller to be rejected')
}

describe('createCallerVerifier', () => {
  it('returns the tenant, user and roles of a valid token', async () => {
    const caller = await verifier()(`Bearer ${await token()}`)
    expect(caller).toEqual({ tenantId: TENANT, objectId: OID, directoryRoles: [DIRECTORY_ROLES.reportsReader] })
  })

  it('accepts a v1-style sts.windows.net issuer for the public authority', async () => {
    const caller = await verifier()(`Bearer ${await token({ iss: `https://sts.windows.net/${TENANT}/` })}`)
    expect(caller.tenantId).toBe(TENANT)
  })

  it('accepts either configured audience', async () => {
    await expect(verifier()(`Bearer ${await token({ aud: 'proxy' })}`)).resolves.toBeDefined()
  })

  it.each<[string, () => Promise<string | null>, number, string]>([
    ['a missing header', async () => null, 401, 'Unauthorized'],
    ['a non-bearer header', async () => 'Basic abc', 401, 'Unauthorized'],
    ['garbage', async () => 'Bearer not.a.jwt', 401, 'InvalidToken'],
    ['a wrong audience', async () => `Bearer ${await token({ aud: 'https://graph.microsoft.com' })}`, 401, 'InvalidToken'],
    ['an expired token', async () => `Bearer ${await token({ exp: Math.floor(Date.now() / 1000) - 120 })}`, 401, 'InvalidToken'],
    ['an issuer of another tenant', async () => `Bearer ${await token({ iss: `https://login.microsoftonline.com/${OTHER_TENANT}/v2.0` })}`, 401, 'InvalidToken'],
    ['an issuer on another host', async () => `Bearer ${await token({ iss: `https://evil.example/${TENANT}/v2.0` })}`, 401, 'InvalidToken'],
    ['a non-guid tenant', async () => `Bearer ${await token({ tid: 'common', iss: 'https://login.microsoftonline.com/common/v2.0' })}`, 401, 'InvalidToken'],
    ['a token without the proxy scope', async () => `Bearer ${await token({ scp: 'User.Read' })}`, 401, 'InvalidToken'],
    ['a token without a user', async () => `Bearer ${await token({ oid: null })}`, 401, 'InvalidToken'],
    ['a user without an admin role', async () => `Bearer ${await token({ wids: [] })}`, 403, 'DirectoryRoleRequired'],
    ['a user with an unrelated role', async () => `Bearer ${await token({ wids: ['00000000-0000-0000-0000-000000000000'] })}`, 403, 'DirectoryRoleRequired'],
  ])('rejects %s', async (_label, header, status, code) => {
    const error = await rejection(verifier(), await header())
    expect(error.status).toBe(status)
    expect(error.code).toBe(code)
  })

  it('rejects a token signed by an unknown key', async () => {
    const other = await generateLocalKeyPair('other')
    const forged = await new SignJWT({ tid: TENANT, oid: OID, scp: 'access_as_user', wids: [DIRECTORY_ROLES.globalAdministrator] })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-issuer' })
      .setIssuer(`https://login.microsoftonline.com/${TENANT}/v2.0`)
      .setAudience(AUDIENCE)
      .setExpirationTime('5m')
      .sign(other.privateKey)
    const error = await rejection(verifier(), `Bearer ${forged}`)
    expect(error.code).toBe('InvalidToken')
  })

  it('locks the proxy to the configured tenants', async () => {
    const verify = verifier({ PROXY_ALLOWED_TENANT_IDS: OTHER_TENANT })
    const error = await rejection(verify, `Bearer ${await token()}`)
    expect(error.status).toBe(403)
    expect(error.code).toBe('TenantNotAllowed')
    await expect(verify(`Bearer ${await token({ tid: OTHER_TENANT })}`)).resolves.toMatchObject({ tenantId: OTHER_TENANT })
  })

  it('honours an explicit directory role list instead of the default four', async () => {
    const custom = '12345678-1234-4123-8123-123456789012'
    const verify = verifier({ PROXY_REQUIRED_DIRECTORY_ROLES: custom.toUpperCase() })
    await expect(verify(`Bearer ${await token({ wids: [custom] })}`)).resolves.toBeDefined()
    const error = await rejection(verify, `Bearer ${await token({ wids: [DIRECTORY_ROLES.globalAdministrator] })}`)
    expect(error.code).toBe('DirectoryRoleRequired')
  })

  it('only trusts sts.windows.net issuers on the public authority host', () => {
    expect(acceptedIssuers('https://login.microsoftonline.com', TENANT)).toEqual([
      `https://login.microsoftonline.com/${TENANT}/v2.0`,
      `https://sts.windows.net/${TENANT}/`,
    ])
    expect(acceptedIssuers('http://127.0.0.1:7080', TENANT)).toEqual([`http://127.0.0.1:7080/${TENANT}/v2.0`])
  })
})
