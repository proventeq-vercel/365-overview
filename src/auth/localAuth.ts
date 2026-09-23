const REFRESH_SKEW_MS = 60_000

interface LocalTokenResponse {
  access_token: string
  expires_in: number
}

export function localTokenUrl(localAuthUrl: string): string {
  return `${localAuthUrl}/local/user-token`
}

export function createLocalTokenGetter(
  localAuthUrl: string,
  fetchImpl: typeof fetch = fetch,
  now: () => number = Date.now,
): () => Promise<string> {
  let cached: { token: string; expiresAt: number } | null = null
  let inFlight: Promise<string> | null = null

  async function mint(): Promise<string> {
    const res = await fetchImpl(localTokenUrl(localAuthUrl))
    if (!res.ok) {
      throw new Error(`The local auth stack at ${localAuthUrl} answered ${res.status}; is it running?`)
    }
    const body = (await res.json()) as LocalTokenResponse
    cached = { token: body.access_token, expiresAt: now() + body.expires_in * 1000 }
    return body.access_token
  }

  return () => {
    if (cached && cached.expiresAt - REFRESH_SKEW_MS > now()) return Promise.resolve(cached.token)
    inFlight ??= mint().finally(() => {
      inFlight = null
    })
    return inFlight
  }
}
