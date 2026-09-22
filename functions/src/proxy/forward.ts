import type { BatchRequest, GraphRequest } from './allowlist.js'
import { ProxyError, type ProxyResponse } from './errors.js'
import { encodePath } from './graphPath.js'

const LINK_KEYS = new Set(['@odata.nextLink', '@odata.deltaLink'])
const FORWARDED_RESPONSE_HEADERS = ['content-type', 'retry-after']
const GRAPH_TIMEOUT_MS = 90_000

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
  const out: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    out[key] =
      LINK_KEYS.has(key) && typeof item === 'string' && item.startsWith(`${graphOrigin}/`)
        ? `${proxyGraphBase}/${item.slice(graphOrigin.length + 1)}`
        : rewriteGraphLinks(item, graphOrigin, proxyGraphBase)
  }
  return out
}

export function graphUrl(graphOrigin: string, request: GraphRequest): string {
  return `${graphOrigin}/${request.version}/${encodePath(request.path)}${request.search}`
}

async function relay(url: string, init: RequestInit, options: ForwardOptions): Promise<ProxyResponse> {
  const fetchImpl = options.fetchImpl ?? fetch
  let response: Response
  try {
    response = await fetchImpl(url, {
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
