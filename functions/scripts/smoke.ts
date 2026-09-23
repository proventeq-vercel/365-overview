const proxyUrl = (process.env.PROXY_URL ?? 'http://127.0.0.1:7071/api/graph').replace(/\/+$/, '')
const entraUrl = (process.env.ENTRA_URL ?? 'http://127.0.0.1:7080').replace(/\/+$/, '')
const explicitToken = process.env.USER_TOKEN

interface Check {
  name: string
  run: () => Promise<string>
}

const failures: string[] = []

async function userToken(): Promise<string> {
  if (explicitToken) return explicitToken
  const response = await fetch(`${entraUrl}/local/user-token`)
  if (!response.ok) throw new Error(`fake Entra at ${entraUrl} answered ${response.status}`)
  return ((await response.json()) as { access_token: string }).access_token
}

const token = await userToken()
const authed = (path: string, init: RequestInit = {}) =>
  fetch(`${proxyUrl}/${path}`, { ...init, headers: { authorization: `Bearer ${token}`, ...init.headers } })

async function pageCount(path: string): Promise<{ rows: number; pages: number }> {
  let url: string | undefined = `${proxyUrl}/${path}`
  let rows = 0
  let pages = 0
  while (url) {
    const response: Response = await fetch(url, { headers: { authorization: `Bearer ${token}` } })
    if (response.status === 429) {
      const wait = Number(response.headers.get('retry-after') ?? '2')
      await new Promise((resolve) => setTimeout(resolve, wait * 1000))
      continue
    }
    if (!response.ok) throw new Error(`${response.status} on ${url}: ${(await response.text()).slice(0, 200)}`)
    const page = (await response.json()) as { value: unknown[]; '@odata.nextLink'?: string }
    rows += page.value.length
    pages++
    url = page['@odata.nextLink']
    if (url && !url.startsWith(proxyUrl)) throw new Error(`nextLink escaped the proxy: ${url}`)
  }
  return { rows, pages }
}

const reports = [
  'getSharePointSiteUsageDetail',
  'getOneDriveUsageAccountDetail',
  'getSharePointSiteUsageStorage',
  'getOneDriveUsageStorage',
]

const checks: Check[] = [
  ...reports.map((report) => ({
    name: `beta/reports/${report}`,
    run: async () => {
      const { rows, pages } = await pageCount(`beta/reports/${report}(period='D180')?$format=application/json`)
      if (rows === 0) throw new Error('no rows')
      return `${rows} rows over ${pages} page(s)`
    },
  })),
  {
    name: 'v1.0/subscribedSkus',
    run: async () => `${(await pageCount('v1.0/subscribedSkus')).rows} SKUs`,
  },
  {
    name: 'v1.0/organization',
    run: async () => {
      const response = await authed('v1.0/organization?$format=application/json')
      if (!response.ok) throw new Error(String(response.status))
      const org = ((await response.json()) as { value: { displayName: string }[] }).value[0]
      return org.displayName
    },
  },
  {
    name: 'v1.0/$batch site names',
    run: async () => {
      const first = await authed("beta/reports/getSharePointSiteUsageDetail(period='D180')?$format=application/json")
      const ids = ((await first.json()) as { value: { siteId: string }[] }).value.slice(0, 20).map((row) => row.siteId)
      const response = await authed('v1.0/$batch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          requests: ids.map((id, i) => ({ id: String(i), method: 'GET', url: `/sites/${encodeURIComponent(id)}?$select=id,displayName,webUrl` })),
        }),
      })
      if (!response.ok) throw new Error(String(response.status))
      const { responses } = (await response.json()) as { responses: { status: number }[] }
      return `${responses.filter((r) => r.status === 200).length}/${responses.length} resolved`
    },
  },
  {
    name: 'v1.0/sites/delta',
    run: async () => {
      const { rows, pages } = await pageCount('v1.0/sites/delta?$select=id,displayName,webUrl')
      return `${rows} sites over ${pages} page(s)`
    },
  },
  {
    name: 'no token is refused',
    run: async () => {
      const response = await fetch(`${proxyUrl}/v1.0/organization`)
      if (response.status !== 401) throw new Error(`expected 401, got ${response.status}`)
      return '401'
    },
  },
  {
    name: 'a path outside the allowlist is refused',
    run: async () => {
      const response = await authed('v1.0/users')
      if (response.status !== 404) throw new Error(`expected 404, got ${response.status}`)
      return '404'
    },
  },
  {
    name: 'preflight from the SPA origin',
    run: async () => {
      const response = await fetch(`${proxyUrl}/v1.0/organization`, {
        method: 'OPTIONS',
        headers: { origin: 'http://localhost:5173', 'access-control-request-method': 'GET' },
      })
      const allow = response.headers.get('access-control-allow-origin')
      if (response.status !== 204 || allow !== 'http://localhost:5173') throw new Error(`${response.status} allow=${allow}`)
      return 'allowed'
    },
  },
]

console.log(`Smoke against ${proxyUrl}\n`)
for (const check of checks) {
  try {
    console.log(`  ok    ${check.name}: ${await check.run()}`)
  } catch (error) {
    failures.push(check.name)
    console.log(`  FAIL  ${check.name}: ${error instanceof Error ? error.message : String(error)}`)
  }
}
console.log(failures.length === 0 ? '\nAll checks passed.' : `\n${failures.length} check(s) failed.`)
process.exit(failures.length === 0 ? 0 : 1)
