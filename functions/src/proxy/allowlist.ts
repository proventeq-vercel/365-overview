import { ProxyError } from './errors.js'
import { decodePath } from './graphPath.js'

export type GraphVersion = 'v1.0' | 'beta'

export interface AllowedRoute {
  version: GraphVersion
  path: RegExp
  query: ReadonlySet<string>
}

export interface GraphRequest {
  version: GraphVersion
  path: string
  search: string
}

export interface BatchRequest {
  id: string
  method: 'GET'
  url: string
}

export const BATCH_LIMIT = 20

const SITE_ID = String.raw`[A-Za-z0-9][A-Za-z0-9._,-]*`
const REPORT_PERIOD = String.raw`\(period='D(?:7|30|90|180)'\)`
const USAGE_REPORTS = [
  'getSharePointSiteUsageDetail',
  'getOneDriveUsageAccountDetail',
  'getSharePointSiteUsageStorage',
  'getOneDriveUsageStorage',
].join('|')

const PAGING = ['$top', '$skiptoken']

export const SITE_ROUTE: AllowedRoute = {
  version: 'v1.0',
  path: new RegExp(`^sites/${SITE_ID}$`),
  query: new Set(['$select']),
}

export const ALLOWED_ROUTES: readonly AllowedRoute[] = [
  {
    version: 'v1.0',
    path: /^sites\/delta$/,
    query: new Set(['$select', 'token', '$deltatoken', ...PAGING]),
  },
  SITE_ROUTE,
  {
    version: 'v1.0',
    path: /^subscribedSkus$/,
    query: new Set(['$select', ...PAGING]),
  },
  {
    version: 'v1.0',
    path: /^organization$/,
    query: new Set(['$select', '$format']),
  },
  {
    version: 'beta',
    path: new RegExp(`^reports/(?:${USAGE_REPORTS})${REPORT_PERIOD}$`),
    query: new Set(['$format', ...PAGING]),
  },
]

export const BATCH_PATH = '$batch'

const notAllowed = (detail: string) =>
  new ProxyError(404, 'RouteNotAllowed', `The proxy does not forward ${detail}.`)

export function isGraphVersion(value: string): value is GraphVersion {
  return value === 'v1.0' || value === 'beta'
}

export function assertAllowed(request: GraphRequest): void {
  const route = ALLOWED_ROUTES.find(
    (candidate) => candidate.version === request.version && candidate.path.test(request.path),
  )
  if (!route) throw notAllowed(`${request.version}/${request.path}`)
  const params = new URLSearchParams(request.search)
  for (const key of params.keys()) {
    if (!route.query.has(key)) throw notAllowed(`the ${key} option on ${request.path}`)
  }
}

function batchEntry(entry: unknown, index: number): BatchRequest {
  if (!entry || typeof entry !== 'object') {
    throw new ProxyError(400, 'InvalidBatch', `Batch request ${index} is not an object.`)
  }
  const { id, method, url } = entry as Record<string, unknown>
  if (typeof id !== 'string' || id.length === 0 || id.length > 64) {
    throw new ProxyError(400, 'InvalidBatch', `Batch request ${index} has no usable id.`)
  }
  if (method !== 'GET') {
    throw new ProxyError(400, 'InvalidBatch', `Batch request ${id} must be a GET.`)
  }
  if (typeof url !== 'string' || !url.startsWith('/') || url.startsWith('//')) {
    throw new ProxyError(400, 'InvalidBatch', `Batch request ${id} must carry a relative URL.`)
  }
  const parsed = new URL(`https://batch.invalid${url}`)
  const request: GraphRequest = {
    version: 'v1.0',
    path: decodePath(parsed.pathname.slice(1)),
    search: parsed.search,
  }
  if (!SITE_ROUTE.path.test(request.path)) {
    throw new ProxyError(400, 'InvalidBatch', `Batch request ${id} must be a GET of v1.0/sites/{id}.`)
  }
  assertAllowed(request)
  return { id, method: 'GET', url }
}

export function parseBatch(body: string): BatchRequest[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    throw new ProxyError(400, 'InvalidBatch', 'The batch body is not JSON.')
  }
  const requests = (parsed as { requests?: unknown })?.requests
  if (!Array.isArray(requests) || requests.length === 0) {
    throw new ProxyError(400, 'InvalidBatch', 'The batch body carries no requests.')
  }
  if (requests.length > BATCH_LIMIT) {
    throw new ProxyError(400, 'InvalidBatch', `A batch may carry at most ${BATCH_LIMIT} requests.`)
  }
  const entries = requests.map(batchEntry)
  if (new Set(entries.map((entry) => entry.id)).size !== entries.length) {
    throw new ProxyError(400, 'InvalidBatch', 'Batch request ids must be unique.')
  }
  return entries
}
