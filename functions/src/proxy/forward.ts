import type { BatchRequest, GraphRequest } from './allowlist.js'
import { ProxyError, type ProxyResponse } from './errors.js'
import { encodePath } from './graphPath.js'

const LINK_KEYS = new Set(['@odata.nextLink', '@odata.deltaLink'])
const FORWARDED_RESPONSE_HEADERS = ['content-type', 'retry-after']
const GRAPH_TIMEOUT_MS = 90_000
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])

export interface ForwardOptions {
  graphOrigin: string
  proxyGraphBase: string
  appToken: string
  fetchImpl?: typeof fetch
}

export function rewriteGraphLinks(value: unknown, graphOrigin: string, proxyGraphBase: string): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => rewriteGraphLinks(item, graphOrigin, proxyGraphBase))
  }
  if (!value || typeof value !== 'object') return value
  const out: Record<string, unknown> = Object.create(null) as Record<string, unknown>
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    out[key] =
      LINK_KEYS.has(key) && typeof item === 'string'
        ? rewriteLink(item, graphOrigin, proxyGraphBase)
        : rewriteGraphLinks(item, graphOrigin, proxyGraphBase)
  }
  return out
}

function rewriteLink(link: string, graphOrigin: string, proxyGraphBase: string): string {
  let parsed: URL
  try {
    parsed = new URL(link)
  } catch {
    return link
  }
  if (parsed.origin !== new URL(graphOrigin).origin) return link
  return `${proxyGraphBase}${parsed.pathname}${parsed.search}`
}

export function graphUrl(graphOrigin: string, request: GraphRequest): string {
  return `${graphOrigin}/${request.version}/${encodePath(request.path)}${request.search}`
}

export function graphTarget(url: string, graphOrigin: string): string {
  const target = new URL(url)
  if (target.origin !== new URL(graphOrigin).origin) {
    throw new ProxyError(404, 'RouteNotAllowed', 'The proxy only forwards to Microsoft Graph.')
  }
  return `${graphOrigin}${target.pathname}${target.search}`
}

async function followDownload(response: Response, fetchImpl: typeof fetch): Promise<Response> {
  const location = response.headers.get('location')
  if (!location) {
    throw new ProxyError(502, 'GraphUnreachable', 'Graph redirected the report without saying where.')
  }
  let target: URL
  try {
    target = new URL(location)
  } catch {
    throw new ProxyError(502, 'GraphUnreachable', 'Graph redirected the report to an unreadable address.')
  }
  if (target.protocol !== 'https:') {
    throw new ProxyError(502, 'GraphUnreachable', 'Graph redirected the report to a non-HTTPS address.')
  }
  try {
    return await fetchImpl(target.toString(), {
      method: 'GET',
      headers: { accept: 'application/json' },
      redirect: 'manual',
      signal: AbortSignal.timeout(GRAPH_TIMEOUT_MS),
    })
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new ProxyError(502, 'GraphUnreachable', `The report download did not answer: ${reason}`)
  }
}

async function relay(url: string, init: RequestInit, options: ForwardOptions): Promise<ProxyResponse> {
  const fetchImpl = options.fetchImpl ?? fetch
  const target = graphTarget(url, options.graphOrigin)
  let response: Response
  try {
    response = await fetchImpl(target, {
      ...init,
      headers: {
        ...init.headers,
        authorization: `Bearer ${options.appToken}`,
        accept: 'application/json',
      },
      redirect: 'manual',
      signal: AbortSignal.timeout(GRAPH_TIMEOUT_MS),
    })
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new ProxyError(502, 'GraphUnreachable', `Graph did not answer: ${reason}`)
  }
  if (REDIRECT_STATUSES.has(response.status)) {
    response = await followDownload(response, fetchImpl)
  }
  const headers: Record<string, string> = {}
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = response.headers.get(name)
    if (value) headers[name] = value
  }
  const text = await response.text()
  const body = rewriteBody(text, headers['content-type'], options)
  return { status: response.status, headers, body }
}

function rewriteBody(text: string, contentType: string | undefined, options: ForwardOptions): string {
  if (!contentType?.includes('json') || text.length === 0) return text
  try {
    return JSON.stringify(rewriteGraphLinks(JSON.parse(text), options.graphOrigin, options.proxyGraphBase))
  } catch {
    return text
  }
}

export function forwardGet(request: GraphRequest, options: ForwardOptions): Promise<ProxyResponse> {
  return relay(graphUrl(options.graphOrigin, request), { method: 'GET' }, options)
}

export function forwardBatch(requests: BatchRequest[], options: ForwardOptions): Promise<ProxyResponse> {
  return relay(
    `${options.graphOrigin}/v1.0/$batch`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ requests }),
    },
    options,
  )
}
