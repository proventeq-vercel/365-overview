import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from 'jose'
import { PUBLIC_AUTHORITY_HOST, type ProxyConfig } from './config.js'
import { ProxyError } from './errors.js'

export interface Caller {
  tenantId: string
  objectId: string
  directoryRoles: string[]
}

export type CallerVerifier = (authorizationHeader: string | null | undefined) => Promise<Caller>

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const jwksUrl = (authorityHost: string) =>
  new URL(`${authorityHost}/common/discovery/v2.0/keys`)

export function acceptedIssuers(authorityHost: string, tenantId: string): string[] {
  const issuers = [`${authorityHost}/${tenantId}/v2.0`]
  if (authorityHost === PUBLIC_AUTHORITY_HOST) issuers.push(`https://sts.windows.net/${tenantId}/`)
  return issuers
}

const bearerOf = (header: string | null | undefined): string => {
  const match = /^Bearer\s+(\S+)$/i.exec(header?.trim() ?? '')
  if (!match) throw new ProxyError(401, 'Unauthorized', 'A bearer token is required.')
  return match[1]
}

const stringClaim = (payload: JWTPayload, name: string): string | null => {
  const value = payload[name]
  return typeof value === 'string' && value.length > 0 ? value : null
}

const listClaim = (payload: JWTPayload, name: string): string[] => {
  const value = payload[name]
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
  return typeof value === 'string' ? value.split(' ').filter(Boolean) : []
}

export function createCallerVerifier(
  config: ProxyConfig,
  getKey: JWTVerifyGetKey = createRemoteJWKSet(jwksUrl(config.authorityHost)),
): CallerVerifier {
  return async (authorizationHeader) => {
    const token = bearerOf(authorizationHeader)
    let payload: JWTPayload
    try {
      payload = (
        await jwtVerify(token, getKey, { algorithms: ['RS256'], audience: config.audiences })
      ).payload
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'verification failed'
      throw new ProxyError(401, 'InvalidToken', `The bearer token was rejected: ${reason}.`)
    }

    const tenantId = stringClaim(payload, 'tid')?.toLowerCase() ?? null
    if (!tenantId || !GUID.test(tenantId)) {
      throw new ProxyError(401, 'InvalidToken', 'The bearer token carries no tenant id.')
    }
    if (!acceptedIssuers(config.authorityHost, tenantId).includes(payload.iss ?? '')) {
      throw new ProxyError(401, 'InvalidToken', 'The bearer token issuer does not match its tenant.')
    }
    if (!listClaim(payload, 'scp').includes(config.scope)) {
      throw new ProxyError(401, 'InvalidToken', `The bearer token lacks the ${config.scope} scope.`)
    }
    const objectId = stringClaim(payload, 'oid')
    if (!objectId) {
      throw new ProxyError(401, 'InvalidToken', 'The bearer token carries no user object id.')
    }
    if (config.allowedTenantIds && !config.allowedTenantIds.includes(tenantId)) {
      throw new ProxyError(403, 'TenantNotAllowed', 'This tenant is not enabled for the proxy.')
    }
    const directoryRoles = listClaim(payload, 'wids').map((id) => id.toLowerCase())
    if (!directoryRoles.some((id) => config.requiredDirectoryRoles.includes(id))) {
      throw new ProxyError(
        403,
        'DirectoryRoleRequired',
        'The signed-in user holds none of the directory roles this report requires.',
      )
    }
    return { tenantId, objectId, directoryRoles }
  }
}
