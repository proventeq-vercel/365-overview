import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'

export interface FakeGraphOptions {
  port?: number
  siteCount?: number
  driveCount?: number
  pageSize?: number
  throttleFirstSiteReport?: boolean
}

export interface RecordedRequest {
  method: string
  url: string
  authorization: string | null
  batchUrls?: string[]
}

export interface FakeGraph {
  url: string
  requests: RecordedRequest[]
  close(): Promise<void>
}

export const APP_TOKEN_PREFIX = 'local-app-token.'
export const REPORT_REFRESH_DATE = '2026-09-19'
const HOST = 'contoso-local.sharepoint.com'
const MB = 1_048_576
const GB = 1024 * MB
const TREND_DAYS = 180
const TEMPLATES = ['STS#3', 'GROUP#0', 'TEAMCHANNEL#1', 'SITEPAGEPUBLISHING#0']

const guid = (seed: number, salt: number) => {
  const hex = (n: number) => ((Math.imul(n, 2654435761) >>> 0).toString(16) + '00000000').slice(0, 8)
  return `${hex(seed + salt)}-${hex(seed * 3 + salt).slice(0, 4)}-4${hex(seed * 7 + salt).slice(0, 3)}-8${hex(seed * 11 + salt).slice(0, 3)}-${hex(seed * 13 + salt)}${hex(seed * 17 + salt).slice(0, 4)}`
}

export const siteIdOf = (index: number) => `${HOST},${guid(index, 1)},${guid(index, 2)}`
export const isMissingFromDirectory = (index: number) => index % 13 === 5

const siteRow = (index: number) => {
  const bigConsumer = index % 50 === 0
  const bytes = (bigConsumer ? 120 * GB : 40 * MB + ((index * 97) % 900) * MB) + index
  const files = 40 + ((index * 31) % 5000)
  return {
    reportRefreshDate: REPORT_REFRESH_DATE,
    siteId: siteIdOf(index),
    siteUrl: '',
    ownerDisplayName: index % 7 === 0 ? 'SharePoint Admin' : `Owner ${index}`,
    isDeleted: index % 40 === 3 ? 'True' : 'False',
    lastActivityDate: index % 9 === 0 ? '' : `2026-0${(index % 8) + 1}-1${index % 10}`,
    fileCount: String(files),
    activeFileCount: String(Math.round(files / 10)),
    storageUsedInBytes: String(bytes),
    storageAllocatedInBytes: String(25 * 1024 * GB),
    rootWebTemplate: TEMPLATES[index % TEMPLATES.length],
  }
}

const driveRow = (index: number) => ({
  reportRefreshDate: REPORT_REFRESH_DATE,
  siteUrl: `https://${HOST.replace('.sharepoint.', '-my.sharepoint.')}/personal/user${index}_contoso_local`,
  ownerDisplayName: `User ${index}`,
  ownerPrincipalName: `user${index}@contoso.local`,
  isDeleted: index % 60 === 7 ? 'True' : 'False',
  lastActivityDate: `2026-09-0${(index % 9) + 1}`,
  fileCount: String(100 + ((index * 13) % 3000)),
  activeFileCount: String(10 + (index % 90)),
  storageUsedInBytes: String((index % 25 === 0 ? 900 * GB : 2 * GB + ((index * 53) % 40) * GB) + index),
  storageAllocatedInBytes: String(1024 * GB),
})

const trendRows = (siteType: string, startBytes: number, dailyGrowth: number) =>
  Array.from({ length: TREND_DAYS }, (_, day) => {
    const date = new Date(Date.UTC(2026, 8, 19) - (TREND_DAYS - 1 - day) * 86_400_000)
    return {
      reportRefreshDate: REPORT_REFRESH_DATE,
      reportDate: date.toISOString().slice(0, 10),
      siteType,
      storageUsedInBytes: String(startBytes + day * dailyGrowth),
    }
  })

const SKUS = [
  {
    skuId: '6fd2c87f-b296-42f0-b197-1e91e994b900',
    skuPartNumber: 'ENTERPRISEPACK',
    consumedUnits: 180,
    prepaidUnits: { enabled: 200 },
    servicePlans: [{ servicePlanName: 'SHAREPOINTENTERPRISE' }, { servicePlanName: 'EXCHANGE_S_ENTERPRISE' }],
  },
  {
    skuId: 'f30db892-07e9-47e9-837c-80727f46fd3d',
    skuPartNumber: 'FLOW_FREE',
    consumedUnits: 12,
    prepaidUnits: { enabled: 10000 },
    servicePlans: [{ servicePlanName: 'FLOW_P2_VIRAL' }],
  },
]

const ORG = {
  id: '99999999-8888-4777-8666-555555555555',
  displayName: 'Contoso Local',
  countryLetterCode: 'GB',
  verifiedDomains: [{ name: 'contoso.local', isDefault: true }],
}

const graphError = (response: ServerResponse, status: number, code: string, message: string) =>
  json(response, status, { error: { code, message } })

const json = (response: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) => {
  response.writeHead(status, { 'content-type': 'application/json; odata.metadata=minimal', ...headers })
  response.end(JSON.stringify(body))
}

const readBody = (request: IncomingMessage) =>
  new Promise<string>((resolve) => {
    let data = ''
    request.on('data', (chunk: Buffer) => {
      data += chunk.toString()
    })
    request.on('end', () => resolve(data))
  })

export async function startFakeGraph(options: FakeGraphOptions = {}): Promise<FakeGraph> {
  const siteCount = options.siteCount ?? 260
  const driveCount = options.driveCount ?? 120
  const pageSize = options.pageSize ?? 100
  const requests: RecordedRequest[] = []
  let throttlePending = options.throttleFirstSiteReport ?? false
  let url = ''

  const siteIndexById = new Map<string, number>()
  for (let index = 0; index < siteCount; index++) siteIndexById.set(siteIdOf(index).toLowerCase(), index)

  const directoryEntry = (rawId: string) => {
    const index = siteIndexById.get(decodeURIComponent(rawId).toLowerCase())
    if (index === undefined || isMissingFromDirectory(index)) return null
    return {
      id: siteIdOf(index),
      displayName: `Team Site ${index}`,
      webUrl: `https://${HOST}/sites/team-${index}`,
    }
  }

  const pageOf = <T>(rows: T[], skip: number, nextUrl: (skip: number) => string) => {
    const value = rows.slice(skip, skip + pageSize)
    const next = skip + pageSize < rows.length ? { '@odata.nextLink': nextUrl(skip + pageSize) } : {}
    return { '@odata.context': `${url}/$metadata`, value, ...next }
  }

  const server = createServer(async (request, response) => {
    const requestUrl = new URL(request.url ?? '/', url)
    const authorization = request.headers.authorization ?? null
    requests.push({ method: request.method ?? '', url: request.url ?? '', authorization })

    if (!authorization?.startsWith(`Bearer ${APP_TOKEN_PREFIX}`)) {
      return graphError(response, 401, 'InvalidAuthenticationToken', 'Access token is empty or not issued by the local Entra.')
    }
    const path = decodeURIComponent(requestUrl.pathname)
    const skip = Number(requestUrl.searchParams.get('$skiptoken') ?? 0)
    const reportLink = (report: string) => (next: number) =>
      `${url}/beta/reports/${report}(period='D180')?$format=application/json&$skiptoken=${next}`

    if (request.method === 'GET') {
      if (path === "/beta/reports/getSharePointSiteUsageDetail(period='D180')") {
        if (throttlePending) {
          throttlePending = false
          return json(
            response,
            429,
            { error: { code: 'TooManyRequests', message: 'Throttled once by the local Graph.' } },
            { 'retry-after': '1' },
          )
        }
        const rows = Array.from({ length: siteCount }, (_, index) => siteRow(index))
        return json(response, 200, pageOf(rows, skip, reportLink('getSharePointSiteUsageDetail')))
      }
      if (path === "/beta/reports/getOneDriveUsageAccountDetail(period='D180')") {
        const rows = Array.from({ length: driveCount }, (_, index) => driveRow(index))
        return json(response, 200, pageOf(rows, skip, reportLink('getOneDriveUsageAccountDetail')))
      }
      if (path === "/beta/reports/getSharePointSiteUsageStorage(period='D180')") {
        return json(response, 200, { value: trendRows('All', 6_100 * GB, 4 * GB) })
      }
      if (path === "/beta/reports/getOneDriveUsageStorage(period='D180')") {
        return json(response, 200, { value: trendRows('OneDrive', 3_200 * GB, 2 * GB) })
      }
      if (path === '/v1.0/subscribedSkus') return json(response, 200, { value: SKUS })
      if (path === '/v1.0/organization') return json(response, 200, { value: [ORG] })
      if (path === '/v1.0/sites/delta') {
        const token = requestUrl.searchParams.get('token')
        const start = token && token !== 'latest' ? Number(token) : 0
        const sites = Array.from({ length: siteCount }, (_, index) => ({
          id: siteIdOf(index),
          displayName: `Team Site ${index}`,
          webUrl: `https://${HOST}/sites/team-${index}`,
          lastModifiedDateTime: '2026-09-18T10:00:00Z',
        }))
        const page = pageOf(sites, start, (next) => `${url}/v1.0/sites/delta?token=${next}`)
        return json(response, 200, '@odata.nextLink' in page ? page : { ...page, '@odata.deltaLink': `${url}/v1.0/sites/delta?token=latest` })
      }
      const site = /^\/v1\.0\/sites\/([^/]+)$/.exec(path)
      if (site) {
        const entry = directoryEntry(site[1])
        return entry
          ? json(response, 200, entry)
          : graphError(response, 404, 'itemNotFound', 'Requested site could not be found')
      }
    }
    if (request.method === 'POST' && path === '/v1.0/$batch') {
      const { requests: batch } = JSON.parse(await readBody(request)) as { requests: { id: string; url: string }[] }
      requests[requests.length - 1].batchUrls = batch.map((entry) => entry.url)
      const responses = batch.map(({ id, url: subUrl }) => {
        const match = /^\/sites\/([^/?]+)/.exec(subUrl)
        const entry = match ? directoryEntry(match[1]) : null
        return entry
          ? { id, status: 200, headers: { 'content-type': 'application/json' }, body: entry }
          : { id, status: 404, headers: { 'content-type': 'application/json' }, body: { error: { code: 'itemNotFound', message: 'Requested site could not be found' } } }
      })
      return json(response, 200, { responses })
    }
    graphError(response, 404, 'BadRequest', `Resource not found for the segment '${path}'.`)
  })

  await new Promise<void>((resolve) => server.listen(options.port ?? 0, '127.0.0.1', resolve))
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  return {
    url,
    requests,
    close: () => new Promise((resolve) => server.close(() => resolve())),
  }
}
