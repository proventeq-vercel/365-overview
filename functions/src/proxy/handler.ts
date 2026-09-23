import { assertAllowed, BATCH_PATH, isGraphVersion, parseBatch, type GraphRequest } from './allowlist.js'
import type { AppTokenSource } from './appToken.js'
import type { CallerVerifier } from './callerAuth.js'
import type { ProxyConfig } from './config.js'
import { errorResponse, ProxyError, type ProxyResponse } from './errors.js'
import { decodePath } from './graphPath.js'
import { forwardBatch, forwardGet } from './forward.js'

export interface ProxyRequest {
  method: string
  url: string
  header: (name: string) => string | null
  text: () => Promise<string>
}

export interface ProxyDeps {
  config: ProxyConfig
  verifyCaller: CallerVerifier
  appToken: AppTokenSource
  fetchImpl?: typeof fetch
  log?: (message: string) => void
}

export const GRAPH_ROUTE_PREFIX = '/api/graph/'

const PREFLIGHT_MAX_AGE_S = 600

const PRIVATE_RESPONSE_HEADERS = {
  'cache-control': 'no-store',
  vary: 'Origin, Authorization',
}

const matchedOrigin = (origin: string, config: ProxyConfig): string | null =>
  config.allowedOrigins.find((allowed) => allowed === origin.replace(/\/+$/, '').toLowerCase()) ?? null

function corsHeaders(origin: string | null, config: ProxyConfig): Record<string, string> {
  const allowed = origin ? matchedOrigin(origin, config) : null
  if (!allowed) return {}
  return {
    'access-control-allow-origin': allowed,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-expose-headers': 'retry-after',
    'access-control-max-age': String(PREFLIGHT_MAX_AGE_S),
  }
}

const ROUTE_PREFIX = GRAPH_ROUTE_PREFIX.replace(/\/$/, '')

export function proxyGraphBase(publicUrl: string): string {
  const trimmed = publicUrl.replace(/\/+$/, '')
  return trimmed.toLowerCase().endsWith(ROUTE_PREFIX) ? trimmed : `${trimmed}${ROUTE_PREFIX}`
}

function parseGraphRequest(url: URL): GraphRequest {
  const pathname = decodePath(url.pathname)
  if (!pathname.toLowerCase().startsWith(GRAPH_ROUTE_PREFIX)) {
    throw new ProxyError(404, 'RouteNotAllowed', `The proxy only serves ${GRAPH_ROUTE_PREFIX}.`)
  }
  const rest = pathname.slice(GRAPH_ROUTE_PREFIX.length)
  const slash = rest.indexOf('/')
  const version = slash === -1 ? rest : rest.slice(0, slash)
  const path = slash === -1 ? '' : rest.slice(slash + 1)
  if (!isGraphVersion(version) || path.length === 0) {
    throw new ProxyError(404, 'RouteNotAllowed', 'Requests take the form /api/graph/{v1.0|beta}/{path}.')
  }
  return { version, path, search: url.search }
}

async function route(request: ProxyRequest, deps: ProxyDeps): Promise<ProxyResponse> {
  const url = new URL(request.url)
  const caller = await deps.verifyCaller(request.header('authorization'))
  const graphRequest = parseGraphRequest(url)
  const isBatch =
    request.method === 'POST' && graphRequest.version === 'v1.0' && graphRequest.path === BATCH_PATH
  if (!isBatch && request.method !== 'GET') {
    throw new ProxyError(404, 'RouteNotAllowed', `The proxy does not forward ${request.method} requests.`)
  }
  const batch = isBatch ? parseBatch(await request.text()) : null
  if (!batch) assertAllowed(graphRequest)

  const options = {
    graphOrigin: deps.config.graphOrigin,
    proxyGraphBase: proxyGraphBase(deps.config.publicUrl ?? url.origin),
    appToken: await deps.appToken(caller.tenantId),
    fetchImpl: deps.fetchImpl,
  }
  return batch ? forwardBatch(batch, options) : forwardGet(graphRequest, options)
}

export async function handleProxyRequest(request: ProxyRequest, deps: ProxyDeps): Promise<ProxyResponse> {
  const origin = request.header('origin')
  const cors = corsHeaders(origin, deps.config)
  const headers = { ...PRIVATE_RESPONSE_HEADERS, ...cors }
  if (origin && Object.keys(cors).length === 0) {
    return { status: 403, headers, body: '' }
  }
  if (request.method === 'OPTIONS') {
    return { status: 204, headers, body: '' }
  }
  let response: ProxyResponse
  try {
    response = await route(request, deps)
  } catch (error) {
    if (error instanceof ProxyError) {
      if (error.status >= 500) deps.log?.(`${error.code}: ${error.message}`)
      response = errorResponse(error)
    } else {
      deps.log?.(`Unhandled proxy error: ${error instanceof Error ? error.stack ?? error.message : String(error)}`)
      response = errorResponse(new ProxyError(500, 'InternalError', 'The proxy failed unexpectedly.'))
    }
  }
  return { ...response, headers: { ...response.headers, ...headers } }
}
