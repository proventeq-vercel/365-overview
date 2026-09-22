import { readCertificateCredential } from './certificate.js'
import { ProxyError } from './errors.js'

export type GraphCredential =
  | { kind: 'certificate'; privateKeyPem: string; thumbprintHex: string }
  | { kind: 'secret'; clientSecret: string }

export interface ProxyConfig {
  graphClientId: string
  credential: GraphCredential
  audiences: string[]
  scope: string
  allowedOrigins: string[]
  allowedTenantIds: string[] | null
  requiredDirectoryRoles: string[]
  authorityHost: string
  graphOrigin: string
  publicUrl: string | null
}

export const PUBLIC_AUTHORITY_HOST = 'https://login.microsoftonline.com'
export const PUBLIC_GRAPH_ORIGIN = 'https://graph.microsoft.com'

export const DIRECTORY_ROLES = {
  globalAdministrator: '62e90394-69f5-4237-9190-012177145e10',
  globalReader: 'f2ef992c-3afb-46b9-b7cf-a126ee74c451',
  sharePointAdministrator: 'f28a1f50-f6e7-4571-818b-6a12f2af6b6c',
  reportsReader: '4a5d8f65-41da-4de4-8968-e035b65339cf',
} as const

export const DEFAULT_REQUIRED_DIRECTORY_ROLES: string[] = Object.values(DIRECTORY_ROLES)

const DEFAULT_SCOPE = 'access_as_user'

type Env = Record<string, string | undefined>

const read = (env: Env, key: string): string | null => {
  const value = env[key]?.trim()
  return value ? value : null
}

const readList = (env: Env, key: string): string[] =>
  (read(env, key) ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

const trimSlash = (url: string) => url.replace(/\/+$/, '')

function readCredential(env: Env, missing: string[]): GraphCredential | null {
  const rawPem = read(env, 'GRAPH_CERT_PEM')
  if (rawPem) {
    return { kind: 'certificate', ...readCertificateCredential(rawPem, read(env, 'GRAPH_CERT_THUMBPRINT')) }
  }
  const clientSecret = read(env, 'GRAPH_CLIENT_SECRET')
  if (clientSecret) return { kind: 'secret', clientSecret }
  missing.push('GRAPH_CERT_PEM (or GRAPH_CLIENT_SECRET)')
  return null
}

export function readConfig(env: Env): ProxyConfig {
  const missing: string[] = []
  const graphClientId = read(env, 'GRAPH_CLIENT_ID')
  if (!graphClientId) missing.push('GRAPH_CLIENT_ID')
  const credential = readCredential(env, missing)
  const audiences = readList(env, 'PROXY_AUDIENCES')
  if (audiences.length === 0) missing.push('PROXY_AUDIENCES')
  const allowedOrigins = readList(env, 'PROXY_ALLOWED_ORIGINS').map(trimSlash)
  if (allowedOrigins.length === 0) missing.push('PROXY_ALLOWED_ORIGINS')
  if (missing.length > 0) {
    throw new ProxyError(500, 'InvalidConfiguration', `Missing settings: ${missing.join(', ')}`)
  }
  const allowedTenantIds = readList(env, 'PROXY_ALLOWED_TENANT_IDS').map((id) => id.toLowerCase())
  const requiredDirectoryRoles = readList(env, 'PROXY_REQUIRED_DIRECTORY_ROLES').map((id) =>
    id.toLowerCase(),
  )
  const publicUrl = read(env, 'PROXY_PUBLIC_URL')
  return {
    graphClientId: graphClientId as string,
    credential: credential as GraphCredential,
    audiences,
    scope: read(env, 'PROXY_SCOPE') ?? DEFAULT_SCOPE,
    allowedOrigins,
    allowedTenantIds: allowedTenantIds.length > 0 ? allowedTenantIds : null,
    requiredDirectoryRoles:
      requiredDirectoryRoles.length > 0 ? requiredDirectoryRoles : DEFAULT_REQUIRED_DIRECTORY_ROLES,
    authorityHost: trimSlash(read(env, 'ENTRA_AUTHORITY_HOST') ?? PUBLIC_AUTHORITY_HOST),
    graphOrigin: trimSlash(read(env, 'GRAPH_ORIGIN') ?? PUBLIC_GRAPH_ORIGIN),
    publicUrl: publicUrl ? trimSlash(publicUrl) : null,
  }
}
