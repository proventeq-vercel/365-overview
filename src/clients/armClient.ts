import { ApiError } from './apiError'

const BASE = 'https://management.azure.com'

function withVersion(path: string, version: string): string {
  const url = path.startsWith('http') ? path : `${BASE}${path}`
  return url.includes('api-version=') ? url : `${url}${url.includes('?') ? '&' : '?'}api-version=${version}`
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = res.statusText
    try {
      const body = (await res.json()) as { error?: { message?: string } }
      message = body.error?.message ?? message
    } catch { /* ignore */ }
    throw new ApiError(res.status, message)
  }
  return (await res.json()) as T
}

export interface ArmClient {
  get<T>(path: string, apiVersion?: string): Promise<T>
  post<T>(path: string, body: unknown, apiVersion: string): Promise<T>
}

export function createArmClient(getToken: () => Promise<string>, fetchImpl: typeof fetch = fetch): ArmClient {
  return {
    async get<T>(path: string, apiVersion = '2021-04-01'): Promise<T> {
      const token = await getToken()
      return handle<T>(await fetchImpl(withVersion(path, apiVersion), { headers: { Authorization: `Bearer ${token}` } }))
    },
    async post<T>(path: string, body: unknown, apiVersion: string): Promise<T> {
      const token = await getToken()
      return handle<T>(await fetchImpl(withVersion(path, apiVersion), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }))
    },
  }
}
