import { ApiError } from './apiError'

const BASE = 'https://graph.microsoft.com/v1.0'

export interface GraphClient {
  get<T>(path: string): Promise<T>
  getAllPages<T>(path: string): Promise<T[]>
}

export function createGraphClient(
  getToken: () => Promise<string>,
  fetchImpl: typeof fetch = fetch,
): GraphClient {
  async function request<T>(url: string): Promise<T> {
    const token = await getToken()
    const res = await fetchImpl(url, { headers: { Authorization: `Bearer ${token}` } })
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
  }
}
