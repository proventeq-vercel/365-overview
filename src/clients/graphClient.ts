import { ApiError } from './apiError'

export const GRAPH_ORIGIN = 'https://graph.microsoft.com'

const VERSIONED_PATH = /^\/(v1\.0|beta)\//

export const BATCH_LIMIT = 20
export const MAX_THROTTLE_RETRIES = 3
export const DEFAULT_RETRY_AFTER_MS = 2_000
export const MAX_RETRY_AFTER_MS = 60_000

const THROTTLED_STATUSES = new Set([429, 503, 504])

export interface BatchResponse<T> {
  status: number
  body?: T
}

interface BatchEnvelope<T> {
  responses: { id: string; status: number; headers?: Record<string, string>; body?: T }[]
}

export interface GraphClient {
  get<T>(path: string): Promise<T>
  getAllPages<T>(path: string): Promise<T[]>
  batchGet<T>(paths: string[]): Promise<BatchResponse<T>[]>
}

const chunk = <T>(items: T[], size: number): T[][] => {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export function retryAfterMs(header: string | null | undefined, now = Date.now()): number {
  if (!header) return DEFAULT_RETRY_AFTER_MS
  const seconds = Number(header)
  const ms = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(header) - now
  if (!Number.isFinite(ms) || ms <= 0) return DEFAULT_RETRY_AFTER_MS
  return Math.min(ms, MAX_RETRY_AFTER_MS)
}

const headerOf = (headers: Record<string, string> | undefined, name: string) =>
  headers
    ? Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1]
    : undefined

export function createGraphClient(
  getToken: () => Promise<string>,
  fetchImpl: typeof fetch = fetch,
  origin: string = GRAPH_ORIGIN,
): GraphClient {
  const resolve = (path: string) => {
    if (path.startsWith('http')) return path
    return VERSIONED_PATH.test(path) ? `${origin}${path}` : `${origin}/v1.0${path}`
  }

  async function apiError(res: Response): Promise<ApiError> {
    let message = res.statusText
    let code: string | null = null
    try {
      const body = (await res.json()) as { error?: { code?: string; message?: string } }
      message = body.error?.message ?? message
      code = body.error?.code ?? null
    } catch { /* ignore non-json error bodies */ }
    return new ApiError(res.status, message, code)
  }

  async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      const token = await getToken()
      const res = await fetchImpl(url, {
        ...init,
        headers: { ...init.headers, Authorization: `Bearer ${token}` },
      })
      if (res.ok) return (await res.json()) as T
      if (!THROTTLED_STATUSES.has(res.status) || attempt >= MAX_THROTTLE_RETRIES) {
        throw await apiError(res)
      }
      await sleep(retryAfterMs(res.headers.get('Retry-After')))
    }
  }

  async function batch<T>(paths: string[]): Promise<BatchResponse<T>[]> {
    const results: BatchResponse<T>[] = paths.map(() => ({ status: 0 }))
    let pending = paths.map((_, i) => i)
    for (let attempt = 0; pending.length > 0; attempt++) {
      const envelope = await request<BatchEnvelope<T>>(resolve('/$batch'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: pending.map((i) => ({ id: String(i), method: 'GET', url: paths[i] })),
        }),
      })
      const byId = new Map(envelope.responses.map((r) => [r.id, r]))
      const throttled: number[] = []
      let waitMs = 0
      for (const i of pending) {
        const response = byId.get(String(i))
        if (!response) continue
        results[i] = { status: response.status, body: response.body }
        if (THROTTLED_STATUSES.has(response.status) && attempt < MAX_THROTTLE_RETRIES) {
          throttled.push(i)
          waitMs = Math.max(waitMs, retryAfterMs(headerOf(response.headers, 'Retry-After')))
        }
      }
      pending = throttled
      if (pending.length > 0) await sleep(waitMs)
    }
    return results
  }

  return {
    get: <T>(path: string) => request<T>(resolve(path)),
    async getAllPages<T>(path: string): Promise<T[]> {
      const out: T[] = []
      let url: string | undefined = resolve(path)
      while (url) {
        const page: { value: T[]; '@odata.nextLink'?: string } = await request(url)
        out.push(...page.value)
        url = page['@odata.nextLink']
      }
      return out
    },
    async batchGet<T>(paths: string[]): Promise<BatchResponse<T>[]> {
      const results = await Promise.all(chunk(paths, BATCH_LIMIT).map((group) => batch<T>(group)))
      return results.flat()
    },
  }
}
