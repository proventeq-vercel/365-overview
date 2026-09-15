import { ApiError } from './apiError'

const BASE = 'https://graph.microsoft.com/v1.0'

export const BATCH_LIMIT = 20

export interface BatchResponse<T> {
  status: number
  body?: T
}

interface BatchEnvelope<T> {
  responses: { id: string; status: number; body?: T }[]
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

export function createGraphClient(
  getToken: () => Promise<string>,
  fetchImpl: typeof fetch = fetch,
): GraphClient {
  async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
    const token = await getToken()
    const res = await fetchImpl(url, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      let message = res.statusText
      try {
        const body = (await res.json()) as { error?: { message?: string } }
        message = body.error?.message ?? message
      } catch { /* ignore non-json error bodies */ }
      throw new ApiError(res.status, message)
    }
    return (await res.json()) as T
  }

  async function batch<T>(paths: string[]): Promise<BatchResponse<T>[]> {
    const envelope = await request<BatchEnvelope<T>>(`${BASE}/$batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: paths.map((url, i) => ({ id: String(i), method: 'GET', url })),
      }),
    })
    const byId = new Map(envelope.responses.map((r) => [r.id, r]))
    return paths.map((_, i) => {
      const response = byId.get(String(i))
      return response ? { status: response.status, body: response.body } : { status: 0 }
    })
  }

  return {
    get: <T>(path: string) => request<T>(path.startsWith('http') ? path : `${BASE}${path}`),
    async getAllPages<T>(path: string): Promise<T[]> {
      const out: T[] = []
      let url: string | undefined = path.startsWith('http') ? path : `${BASE}${path}`
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
