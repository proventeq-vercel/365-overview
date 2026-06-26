# M365 + Azure Estate Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a tenant-wide admin dashboard that logs in via MSAL and shows Microsoft Graph reporting data (SharePoint, licensing, estate, Exchange) plus Azure ARM resource inventory and real Cost Management spend.

**Architecture:** Pure React 19 + Vite browser SPA, no backend. MSAL Browser (auth-code + PKCE) acquires two tokens on demand — Microsoft Graph and Azure ARM. Thin typed client modules wrap each API; pure parser functions turn raw responses into typed aggregates; React Query hooks cache them; section components render. A `VITE_USE_MOCK` toggle swaps the real clients for deterministic fixtures (dev + e2e).

**Tech Stack:** React 19, TypeScript, Vite 8, `@azure/msal-browser`, `@azure/msal-react`, `@tanstack/react-query`, `react-router-dom`, `recharts`, `papaparse`, Vitest + Testing Library, Playwright (e2e), oxlint.

## Global Constraints

- TypeScript strict; `npm run build` (`tsc -b && vite build`) must pass with zero errors.
- `npm run lint` (oxlint) must pass with zero errors.
- `npm test` (Vitest) and `npm run e2e` (Playwright) must pass.
- All network access goes through `src/clients/*` — components/hooks never call `fetch` directly.
- Config via `VITE_*` env vars only; never hard-code tenant/client IDs.
- Read-only: the app never mutates tenant data.
- Every report parser is a pure function with no network/MSAL dependency (independently testable).

---

### Task 1: Dependencies, env config, and test tooling

**Files:**
- Modify: `package.json` (deps + scripts)
- Create: `.env.example`, `src/config/env.ts`
- Create: `vitest.config.ts`, `src/test/setup.ts`
- Test: `src/config/env.test.ts`

**Interfaces:**
- Produces: `env` object `{ clientId: string; tenantId: string; redirectUri: string; useMock: boolean }` from `src/config/env.ts`.

- [ ] **Step 1: Install dependencies**

```bash
npm install @azure/msal-browser @azure/msal-react @tanstack/react-query react-router-dom recharts papaparse
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @playwright/test @types/papaparse
```

- [ ] **Step 2: Add scripts to `package.json`**

```json
"test": "vitest run",
"test:watch": "vitest",
"e2e": "playwright test",
"typecheck": "tsc -b --noEmit"
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['**/node_modules/**', '**/e2e/**'],
  },
})
```

- [ ] **Step 4: Create `src/test/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 5: Create `.env.example`**

```
VITE_AAD_CLIENT_ID=00000000-0000-0000-0000-000000000000
VITE_AAD_TENANT_ID=00000000-0000-0000-0000-000000000000
VITE_AAD_REDIRECT_URI=
VITE_USE_MOCK=false
```

- [ ] **Step 6: Write the failing test `src/config/env.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { readEnv } from './env'

describe('readEnv', () => {
  it('reads ids and defaults redirectUri to origin', () => {
    const env = readEnv({ VITE_AAD_CLIENT_ID: 'c', VITE_AAD_TENANT_ID: 't', VITE_USE_MOCK: 'false' }, 'http://localhost:3000')
    expect(env).toEqual({ clientId: 'c', tenantId: 't', redirectUri: 'http://localhost:3000', useMock: false })
  })
  it('parses useMock true and explicit redirectUri', () => {
    const env = readEnv({ VITE_AAD_CLIENT_ID: 'c', VITE_AAD_TENANT_ID: 't', VITE_AAD_REDIRECT_URI: 'http://x', VITE_USE_MOCK: 'true' }, 'http://localhost:3000')
    expect(env.useMock).toBe(true)
    expect(env.redirectUri).toBe('http://x')
  })
})
```

- [ ] **Step 7: Run test, verify it fails** — `npm test -- env` → FAIL (readEnv not defined)

- [ ] **Step 8: Implement `src/config/env.ts`**

```ts
export interface AppEnv {
  clientId: string
  tenantId: string
  redirectUri: string
  useMock: boolean
}

export function readEnv(source: Record<string, string | undefined>, origin: string): AppEnv {
  return {
    clientId: source.VITE_AAD_CLIENT_ID ?? '',
    tenantId: source.VITE_AAD_TENANT_ID ?? '',
    redirectUri: source.VITE_AAD_REDIRECT_URI || origin,
    useMock: source.VITE_USE_MOCK === 'true',
  }
}

export const env: AppEnv = readEnv(
  import.meta.env as unknown as Record<string, string | undefined>,
  typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
)
```

- [ ] **Step 9: Run test, verify it passes** — `npm test -- env` → PASS

- [ ] **Step 10: Commit** — `git add -A && git commit -m "chore: deps, env config, test tooling"`

---

### Task 2: Domain types

**Files:**
- Create: `src/types/reports.ts`
- Test: none (type-only; verified by `tsc`)

**Interfaces:**
- Produces: types consumed by all parsers/hooks/sections:
  - `SharePointSite { siteId: string; siteUrl: string; ownerDisplayName: string; fileCount: number; activeFileCount: number; storageUsedBytes: number; storageAllocatedBytes: number }`
  - `SharePointSummary { totalSites: number; totalFiles: number; activeFiles: number; storageUsedBytes: number; storageAllocatedBytes: number; sites: SharePointSite[] }`
  - `LicenseSku { skuId: string; skuPartNumber: string; consumed: number; enabled: number; available: number }`
  - `OrgInfo { displayName: string; verifiedDomain: string; country: string | null }`
  - `UsagePoint { date: string; value: number }`
  - `MailboxSummary { totalMailboxes: number; activeMailboxes: number; storageUsedBytes: number }`
  - `EmailActivityPoint { date: string; send: number; receive: number; read: number }`
  - `AzureSubscription { subscriptionId: string; displayName: string; state: string }`
  - `AzureResourceCount { type: string; count: number }`
  - `AzureCost { subscriptionId: string; currency: string; amount: number }`

- [ ] **Step 1: Create `src/types/reports.ts`** with the interfaces above (export each).
- [ ] **Step 2: Run `npm run typecheck`** → PASS
- [ ] **Step 3: Commit** — `git commit -am "feat: domain report types"`

---

### Task 3: MSAL auth config and token helpers

**Files:**
- Create: `src/auth/msalConfig.ts`, `src/auth/tokens.ts`
- Test: `src/auth/tokens.test.ts`

**Interfaces:**
- Consumes: `env` (Task 1).
- Produces:
  - `msalConfig`, `GRAPH_SCOPES: string[]`, `ARM_SCOPES: string[]` from `msalConfig.ts`.
  - `acquireToken(instance: IPublicClientApplication, account: AccountInfo, scopes: string[]): Promise<string>` from `tokens.ts`.

- [ ] **Step 1: Create `src/auth/msalConfig.ts`**

```ts
import type { Configuration } from '@azure/msal-browser'
import { env } from '../config/env'

export const msalConfig: Configuration = {
  auth: {
    clientId: env.clientId,
    authority: `https://login.microsoftonline.com/${env.tenantId}`,
    redirectUri: env.redirectUri,
  },
  cache: { cacheLocation: 'sessionStorage' },
}

export const GRAPH_SCOPES = ['User.Read', 'Reports.Read.All', 'Organization.Read.All']
export const ARM_SCOPES = ['https://management.azure.com/user_impersonation']
```

- [ ] **Step 2: Write failing test `src/auth/tokens.test.ts`**

```ts
import { describe, it, expect, vi } from 'vitest'
import { InteractionRequiredAuthError } from '@azure/msal-browser'
import { acquireToken } from './tokens'

const account = { homeAccountId: 'a' } as never

describe('acquireToken', () => {
  it('returns silent token when available', async () => {
    const instance = { acquireTokenSilent: vi.fn().mockResolvedValue({ accessToken: 'silent' }) } as never
    expect(await acquireToken(instance, account, ['s'])).toBe('silent')
  })
  it('falls back to popup on InteractionRequired', async () => {
    const instance = {
      acquireTokenSilent: vi.fn().mockRejectedValue(new InteractionRequiredAuthError()),
      acquireTokenPopup: vi.fn().mockResolvedValue({ accessToken: 'popup' }),
    } as never
    expect(await acquireToken(instance, account, ['s'])).toBe('popup')
  })
  it('rethrows other errors', async () => {
    const instance = { acquireTokenSilent: vi.fn().mockRejectedValue(new Error('boom')) } as never
    await expect(acquireToken(instance, account, ['s'])).rejects.toThrow('boom')
  })
})
```

- [ ] **Step 3: Run test, verify it fails** — `npm test -- tokens` → FAIL

- [ ] **Step 4: Implement `src/auth/tokens.ts`**

```ts
import {
  InteractionRequiredAuthError,
  type AccountInfo,
  type IPublicClientApplication,
} from '@azure/msal-browser'

export async function acquireToken(
  instance: IPublicClientApplication,
  account: AccountInfo,
  scopes: string[],
): Promise<string> {
  try {
    const res = await instance.acquireTokenSilent({ account, scopes })
    return res.accessToken
  } catch (e) {
    if (e instanceof InteractionRequiredAuthError) {
      const res = await instance.acquireTokenPopup({ scopes })
      return res.accessToken
    }
    throw e
  }
}
```

- [ ] **Step 5: Run test, verify it passes** — `npm test -- tokens` → PASS
- [ ] **Step 6: Commit** — `git commit -am "feat: MSAL config and token acquisition helper"`

---

### Task 4: Graph client (auth header, JSON, paging, error mapping)

**Files:**
- Create: `src/clients/apiError.ts`, `src/clients/graphClient.ts`
- Test: `src/clients/graphClient.test.ts`

**Interfaces:**
- Produces:
  - `class ApiError extends Error { status: number; constructor(status: number, message: string) }` from `apiError.ts`.
  - `createGraphClient(getToken: () => Promise<string>, fetchImpl?: typeof fetch)` returning `{ get<T>(path: string): Promise<T>; getAllPages<T>(path: string): Promise<T[]> }`.
  - Graph base URL `https://graph.microsoft.com/v1.0`.
- Consumed by: report hooks (Task 8).

- [ ] **Step 1: Create `src/clients/apiError.ts`**

```ts
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
  get isAuth() { return this.status === 401 || this.status === 403 }
}
```

- [ ] **Step 2: Write failing test `src/clients/graphClient.test.ts`**

```ts
import { describe, it, expect, vi } from 'vitest'
import { createGraphClient } from './graphClient'
import { ApiError } from './apiError'

const token = () => Promise.resolve('tok')

function jsonResponse(body: unknown, status = 200) {
  return { ok: status < 400, status, json: () => Promise.resolve(body), text: () => Promise.resolve('') } as Response
}

describe('graphClient', () => {
  it('sends bearer token and returns json', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ value: [1] }))
    const client = createGraphClient(token, fetchImpl)
    const res = await client.get<{ value: number[] }>('/x')
    expect(res.value).toEqual([1])
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://graph.microsoft.com/v1.0/x')
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer tok' })
  })
  it('throws ApiError with status on failure', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ error: { message: 'nope' } }, 403))
    const client = createGraphClient(token, fetchImpl)
    await expect(client.get('/x')).rejects.toBeInstanceOf(ApiError)
  })
  it('follows @odata.nextLink in getAllPages', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ value: [1], '@odata.nextLink': 'https://graph.microsoft.com/v1.0/x?p=2' }))
      .mockResolvedValueOnce(jsonResponse({ value: [2] }))
    const client = createGraphClient(token, fetchImpl)
    expect(await client.getAllPages<number>('/x')).toEqual([1, 2])
  })
})
```

- [ ] **Step 3: Run test, verify it fails** — `npm test -- graphClient` → FAIL

- [ ] **Step 4: Implement `src/clients/graphClient.ts`**

```ts
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
```

- [ ] **Step 5: Run test, verify it passes** — `npm test -- graphClient` → PASS
- [ ] **Step 6: Commit** — `git commit -am "feat: Graph client with paging and error mapping"`

---

### Task 5: ARM client (subscriptions, resources, Cost Management query)

**Files:**
- Create: `src/clients/armClient.ts`
- Test: `src/clients/armClient.test.ts`

**Interfaces:**
- Consumes: `ApiError` (Task 4).
- Produces: `createArmClient(getToken, fetchImpl?)` returning
  - `get<T>(path: string): Promise<T>` (auto-appends `api-version` when absent, default `2021-04-01`)
  - `post<T>(path: string, body: unknown, apiVersion: string): Promise<T>`
  - ARM base URL `https://management.azure.com`.

- [ ] **Step 1: Write failing test `src/clients/armClient.test.ts`**

```ts
import { describe, it, expect, vi } from 'vitest'
import { createArmClient } from './armClient'

const token = () => Promise.resolve('tok')
const ok = (body: unknown) => ({ ok: true, status: 200, json: () => Promise.resolve(body), text: () => Promise.resolve('') } as Response)

describe('armClient', () => {
  it('adds bearer + default api-version on get', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok({ value: [] }))
    await createArmClient(token, fetchImpl).get('/subscriptions')
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://management.azure.com/subscriptions?api-version=2021-04-01')
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer tok' })
  })
  it('posts json body with given api-version', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(ok({ properties: {} }))
    await createArmClient(token, fetchImpl).post('/q', { a: 1 }, '2023-11-01')
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toContain('api-version=2023-11-01')
    expect((init as RequestInit).method).toBe('POST')
    expect((init as RequestInit).body).toBe('{"a":1}')
  })
})
```

- [ ] **Step 2: Run test, verify it fails** — `npm test -- armClient` → FAIL

- [ ] **Step 3: Implement `src/clients/armClient.ts`**

```ts
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
```

- [ ] **Step 4: Run test, verify it passes** — `npm test -- armClient` → PASS
- [ ] **Step 5: Commit** — `git commit -am "feat: ARM client with cost-management post"`

---

### Task 6: SharePoint report parser

**Files:**
- Create: `src/reports/sharepoint.ts`
- Test: `src/reports/sharepoint.test.ts`

**Interfaces:**
- Consumes: types (Task 2).
- Produces: `parseSharePointDetail(rows: RawSpoRow[]): SharePointSummary` where `RawSpoRow` matches Graph JSON keys (`"Site Id"`, `"Site URL"`, `"Owner Display Name"`, `"File Count"`, `"Active File Count"`, `"Storage Used (Byte)"`, `"Storage Allocated (Byte)"`).

- [ ] **Step 1: Write failing test `src/reports/sharepoint.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { parseSharePointDetail } from './sharepoint'

const rows = [
  { 'Site Id': 's1', 'Site URL': 'https://a', 'Owner Display Name': 'A', 'File Count': '10', 'Active File Count': '3', 'Storage Used (Byte)': '1000', 'Storage Allocated (Byte)': '5000' },
  { 'Site Id': 's2', 'Site URL': 'https://b', 'Owner Display Name': 'B', 'File Count': '20', 'Active File Count': '5', 'Storage Used (Byte)': '2000', 'Storage Allocated (Byte)': '5000' },
]

describe('parseSharePointDetail', () => {
  it('aggregates totals and maps sites', () => {
    const s = parseSharePointDetail(rows)
    expect(s.totalSites).toBe(2)
    expect(s.totalFiles).toBe(30)
    expect(s.activeFiles).toBe(8)
    expect(s.storageUsedBytes).toBe(3000)
    expect(s.sites[0]).toMatchObject({ siteId: 's1', fileCount: 10, storageUsedBytes: 1000 })
  })
  it('handles empty input', () => {
    expect(parseSharePointDetail([])).toMatchObject({ totalSites: 0, totalFiles: 0, sites: [] })
  })
})
```

- [ ] **Step 2: Run test, verify it fails** — `npm test -- reports/sharepoint` → FAIL

- [ ] **Step 3: Implement `src/reports/sharepoint.ts`**

```ts
import type { SharePointSite, SharePointSummary } from '../types/reports'

export interface RawSpoRow {
  'Site Id': string
  'Site URL': string
  'Owner Display Name': string
  'File Count': string
  'Active File Count': string
  'Storage Used (Byte)': string
  'Storage Allocated (Byte)': string
}

const num = (v: string | undefined) => Number(v ?? 0) || 0

export function parseSharePointDetail(rows: RawSpoRow[]): SharePointSummary {
  const sites: SharePointSite[] = rows.map((r) => ({
    siteId: r['Site Id'],
    siteUrl: r['Site URL'],
    ownerDisplayName: r['Owner Display Name'],
    fileCount: num(r['File Count']),
    activeFileCount: num(r['Active File Count']),
    storageUsedBytes: num(r['Storage Used (Byte)']),
    storageAllocatedBytes: num(r['Storage Allocated (Byte)']),
  }))
  return {
    totalSites: sites.length,
    totalFiles: sites.reduce((a, s) => a + s.fileCount, 0),
    activeFiles: sites.reduce((a, s) => a + s.activeFileCount, 0),
    storageUsedBytes: sites.reduce((a, s) => a + s.storageUsedBytes, 0),
    storageAllocatedBytes: sites.reduce((a, s) => a + s.storageAllocatedBytes, 0),
    sites,
  }
}
```

- [ ] **Step 4: Run test, verify it passes** → PASS
- [ ] **Step 5: Commit** — `git commit -am "feat: SharePoint report parser"`

---

### Task 7: Licensing, Estate, Exchange, and Azure parsers

**Files:**
- Create: `src/reports/licensing.ts`, `src/reports/estate.ts`, `src/reports/exchange.ts`, `src/reports/azure.ts`
- Test: `src/reports/licensing.test.ts`, `src/reports/estate.test.ts`, `src/reports/exchange.test.ts`, `src/reports/azure.test.ts`

**Interfaces:**
- Produces:
  - `parseSubscribedSkus(raw: RawSku[]): LicenseSku[]` — `available = enabled - consumed`.
  - `parseOrg(raw: RawOrg): OrgInfo`.
  - `parseUsageCounts(rows, valueKey): UsagePoint[]` (shared helper for active-user / OneDrive / Teams time series).
  - `parseMailboxSummary(counts: RawMailboxRow[]): MailboxSummary`.
  - `parseEmailActivity(rows: RawEmailRow[]): EmailActivityPoint[]`.
  - `parseSubscriptions(raw): AzureSubscription[]`, `parseResourceCounts(raw): AzureResourceCount[]`, `parseCostQuery(raw, subscriptionId): AzureCost`.

- [ ] **Step 1 (Licensing): Write failing test `licensing.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { parseSubscribedSkus } from './licensing'

describe('parseSubscribedSkus', () => {
  it('computes available seats', () => {
    const skus = parseSubscribedSkus([
      { skuId: '1', skuPartNumber: 'ENTERPRISEPACK', consumedUnits: 80, prepaidUnits: { enabled: 100 } },
    ])
    expect(skus[0]).toEqual({ skuId: '1', skuPartNumber: 'ENTERPRISEPACK', consumed: 80, enabled: 100, available: 20 })
  })
})
```

- [ ] **Step 2: Implement `licensing.ts`**

```ts
import type { LicenseSku } from '../types/reports'

export interface RawSku {
  skuId: string
  skuPartNumber: string
  consumedUnits: number
  prepaidUnits: { enabled: number }
}

export function parseSubscribedSkus(raw: RawSku[]): LicenseSku[] {
  return raw.map((s) => ({
    skuId: s.skuId,
    skuPartNumber: s.skuPartNumber,
    consumed: s.consumedUnits,
    enabled: s.prepaidUnits.enabled,
    available: s.prepaidUnits.enabled - s.consumedUnits,
  }))
}
```

- [ ] **Step 3 (Estate): Write failing test `estate.test.ts`** covering `parseOrg` (maps `displayName`, first `verifiedDomains[].name` where `isDefault`, `countryLetterCode`) and `parseUsageCounts` (maps `[{ 'Report Date': '2026-06-01', 'Total': '5' }]` with key `'Total'` → `[{ date: '2026-06-01', value: 5 }]`).

- [ ] **Step 4: Implement `estate.ts`**

```ts
import type { OrgInfo, UsagePoint } from '../types/reports'

export interface RawOrg {
  displayName: string
  countryLetterCode: string | null
  verifiedDomains: { name: string; isDefault: boolean }[]
}

export function parseOrg(raw: RawOrg): OrgInfo {
  const def = raw.verifiedDomains.find((d) => d.isDefault) ?? raw.verifiedDomains[0]
  return { displayName: raw.displayName, verifiedDomain: def?.name ?? '', country: raw.countryLetterCode }
}

export function parseUsageCounts(rows: Record<string, string>[], valueKey: string): UsagePoint[] {
  return rows
    .filter((r) => r['Report Date'])
    .map((r) => ({ date: r['Report Date'], value: Number(r[valueKey] ?? 0) || 0 }))
}
```

- [ ] **Step 5 (Exchange): Write failing test `exchange.test.ts`** for `parseMailboxSummary` (rows with `'Total Mailboxes'`, plus latest `'Storage Used (Byte)'`) and `parseEmailActivity` (maps `'Send'`/`'Receive'`/`'Read'`).

- [ ] **Step 6: Implement `exchange.ts`**

```ts
import type { MailboxSummary, EmailActivityPoint } from '../types/reports'

export interface RawMailboxRow {
  'Report Date': string
  'Total': string
  'Active': string
  'Storage Used (Byte)': string
}
export interface RawEmailRow {
  'Report Date': string
  'Send': string
  'Receive': string
  'Read': string
}
const n = (v: string | undefined) => Number(v ?? 0) || 0

export function parseMailboxSummary(rows: RawMailboxRow[]): MailboxSummary {
  const latest = rows[rows.length - 1]
  return {
    totalMailboxes: n(latest?.['Total']),
    activeMailboxes: n(latest?.['Active']),
    storageUsedBytes: n(latest?.['Storage Used (Byte)']),
  }
}

export function parseEmailActivity(rows: RawEmailRow[]): EmailActivityPoint[] {
  return rows
    .filter((r) => r['Report Date'])
    .map((r) => ({ date: r['Report Date'], send: n(r['Send']), receive: n(r['Receive']), read: n(r['Read']) }))
}
```

- [ ] **Step 7 (Azure): Write failing test `azure.test.ts`** for `parseSubscriptions`, `parseResourceCounts` (group `value[].type`, count per type, sort desc), `parseCostQuery` (read `properties.columns` to find Cost+Currency indices, sum `properties.rows`).

- [ ] **Step 8: Implement `azure.ts`**

```ts
import type { AzureSubscription, AzureResourceCount, AzureCost } from '../types/reports'

export function parseSubscriptions(raw: { value: { subscriptionId: string; displayName: string; state: string }[] }): AzureSubscription[] {
  return raw.value.map((s) => ({ subscriptionId: s.subscriptionId, displayName: s.displayName, state: s.state }))
}

export function parseResourceCounts(raw: { value: { type: string }[] }): AzureResourceCount[] {
  const counts = new Map<string, number>()
  for (const r of raw.value) counts.set(r.type, (counts.get(r.type) ?? 0) + 1)
  return [...counts.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count)
}

export interface RawCostQuery {
  properties: { columns: { name: string }[]; rows: (string | number)[][] }
}

export function parseCostQuery(raw: RawCostQuery, subscriptionId: string): AzureCost {
  const cols = raw.properties.columns.map((c) => c.name)
  const costIdx = cols.findIndex((c) => c === 'Cost' || c === 'PreTaxCost')
  const curIdx = cols.findIndex((c) => c === 'Currency')
  const amount = raw.properties.rows.reduce((a, row) => a + Number(row[costIdx] ?? 0), 0)
  const currency = curIdx >= 0 ? String(raw.properties.rows[0]?.[curIdx] ?? '') : ''
  return { subscriptionId, currency, amount }
}
```

- [ ] **Step 9: Run all parser tests** — `npm test -- reports` → PASS
- [ ] **Step 10: Commit** — `git commit -am "feat: licensing, estate, exchange, azure parsers"`

---

### Task 8: Mock data layer + data-source provider

**Files:**
- Create: `src/data/fixtures.ts`, `src/data/DataProvider.tsx`, `src/data/useDataSource.ts`
- Test: `src/data/fixtures.test.ts`

**Interfaces:**
- Consumes: all parsers + clients.
- Produces: `DataSource` interface with one async method per report returning typed results:
  `getSharePoint(period), getLicenses(), getOrg(), getActiveUsers(period), getOneDriveUsage(period), getTeamsActivity(period), getMailbox(period), getEmailActivity(period), getAzureSubscriptions(), getAzureResourceCounts(subId), getAzureCost(subId)`.
- `createMockDataSource(): DataSource` (returns fixtures) and `createLiveDataSource(graph, arm): DataSource`.
- `DataProvider` chooses mock vs live from `env.useMock`; `useDataSource()` hook returns the active `DataSource`.

- [ ] **Step 1: Write failing test `src/data/fixtures.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { createMockDataSource } from './fixtures'

describe('mock data source', () => {
  it('returns non-empty sharepoint summary', async () => {
    const s = await createMockDataSource().getSharePoint('D30')
    expect(s.totalSites).toBeGreaterThan(0)
    expect(s.sites.length).toBe(s.totalSites)
  })
  it('returns licenses and azure cost', async () => {
    const ds = createMockDataSource()
    expect((await ds.getLicenses()).length).toBeGreaterThan(0)
    expect((await ds.getAzureCost('sub1')).amount).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Define `DataSource` interface + `createMockDataSource` in `src/data/fixtures.ts`** with realistic hardcoded fixtures for every method (≥3 SharePoint sites, ≥2 SKUs, org info, time series of ≥7 points, one subscription, several resource types, a cost amount). Run test → PASS.

- [ ] **Step 3: Implement `createLiveDataSource(graph, arm)` in `src/data/live.ts`** mapping each method to the correct Graph/ARM path + parser:
  - SharePoint: `graph.get('/reports/getSharePointSiteUsageDetail(period=\'<P>\')?$format=application/json')` → `parseSharePointDetail(value)`.
  - Licenses: `graph.getAllPages('/subscribedSkus')` → `parseSubscribedSkus`.
  - Org: `graph.get('/organization?$format=application/json')` → first `value` → `parseOrg`.
  - Active users / OneDrive / Teams / mailbox / email: corresponding `getOffice365ActiveUserCounts` / `getOneDriveUsageStorage` / `getTeamsUserActivityCounts` / `getMailboxUsageMailboxCounts` / `getEmailActivityCounts` with `?$format=application/json` → matching parser.
  - Azure subs: `arm.get('/subscriptions', '2020-01-01')`. Resources: `arm.get('/subscriptions/<id>/resources')`. Cost: `arm.post('/subscriptions/<id>/providers/Microsoft.CostManagement/query', costBody, '2023-11-01')` with `costBody = { type: 'ActualCost', timeframe: 'MonthToDate', dataset: { granularity: 'None', aggregation: { totalCost: { name: 'Cost', function: 'Sum' } }, grouping: [] } }`.

- [ ] **Step 4: Implement `DataProvider.tsx` + `useDataSource.ts`** — provider builds token getters via MSAL `useMsal()` + `acquireToken`, constructs live or mock source per `env.useMock`, exposes via context.

- [ ] **Step 5: `npm run typecheck`** → PASS
- [ ] **Step 6: Commit** — `git commit -am "feat: data source abstraction with mock + live implementations"`

---

### Task 9: React Query hooks

**Files:**
- Create: `src/hooks/useReports.ts`
- Test: `src/hooks/useReports.test.tsx`

**Interfaces:**
- Consumes: `useDataSource` (Task 8).
- Produces: one hook per report (`useSharePoint(period)`, `useLicenses()`, `useOrg()`, `useActiveUsers(period)`, `useOneDrive(period)`, `useTeams(period)`, `useMailbox(period)`, `useEmailActivity(period)`, `useAzureSubscriptions()`, `useAzureResourceCounts(subId)`, `useAzureCost(subId)`), each wrapping `useQuery` with a stable key including period/subId.

- [ ] **Step 1: Write failing test `useReports.test.tsx`** — render `useSharePoint('D30')` inside a `QueryClientProvider` + a mock `DataProvider`, assert it resolves to the fixture summary (use `@testing-library/react` `renderHook` + `waitFor`).
- [ ] **Step 2: Implement hooks** in `src/hooks/useReports.ts`.
- [ ] **Step 3: Run test** → PASS
- [ ] **Step 4: Commit** — `git commit -am "feat: react-query report hooks"`

---

### Task 10: Shared UI components

**Files:**
- Create: `src/components/{KpiCard,DataTable,TrendChart,ConsumptionBar,PeriodSelector,ErrorState,SkeletonCard,FormatBytes}.tsx`
- Create: `src/lib/format.ts`
- Test: `src/lib/format.test.ts`, `src/components/ConsumptionBar.test.tsx`

**Interfaces:**
- Produces: `formatBytes(bytes: number): string` (e.g. `1536 → '1.5 KB'`), `formatNumber(n)`. Presentational components: `KpiCard{label,value,sub?}`, `DataTable<T>{columns,rows}`, `TrendChart{data,xKey,series}`, `ConsumptionBar{used,total,label}`, `PeriodSelector{value,onChange}`, `ErrorState{error}`, `SkeletonCard`.

- [ ] **Step 1: Write failing test `src/lib/format.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { formatBytes } from './format'

describe('formatBytes', () => {
  it('formats units', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(1073741824)).toBe('1 GB')
  })
})
```

- [ ] **Step 2: Implement `src/lib/format.ts`** (binary units, 1 decimal, trim `.0`).
- [ ] **Step 3: Run format test** → PASS.
- [ ] **Step 4: Write failing test `ConsumptionBar.test.tsx`** — renders label and computed percent text (`used/total`), asserts `getByText('80%')` for `used=80,total=100`.
- [ ] **Step 5: Implement `ConsumptionBar.tsx`** and the other presentational components (`ErrorState` shows `error.message` and, when `error instanceof ApiError && error.isAuth`, an "admin consent / permissions required" hint).
- [ ] **Step 6: Run tests** → PASS.
- [ ] **Step 7: Commit** — `git commit -am "feat: shared UI components and formatters"`

---

### Task 11: App shell — MSAL provider, routing, login gate, layout

**Files:**
- Modify: `src/main.tsx`, `src/App.tsx`, `src/App.css`, `src/index.css`
- Create: `src/app/Layout.tsx`, `src/app/LoginGate.tsx`, `src/app/queryClient.ts`
- Test: `src/app/LoginGate.test.tsx`

**Interfaces:**
- Consumes: `msalConfig`, `DataProvider`, hooks, components.
- Produces: routed app with nav tabs (Overview, SharePoint, Licensing, Estate, Exchange, Azure). `LoginGate` shows a "Sign in" button when unauthenticated (`useIsAuthenticated()`), renders children when authed. In mock mode the gate auto-passes.

- [ ] **Step 1: Write failing test `LoginGate.test.tsx`** — with `env.useMock=true` (or an injected `authenticated` prop), renders children; otherwise renders a "Sign in" button. Use Testing Library.
- [ ] **Step 2: Implement `queryClient.ts`, `LoginGate.tsx`, `Layout.tsx`** (nav using `NavLink`).
- [ ] **Step 3: Rewrite `src/main.tsx`** to wrap `<MsalProvider>` → `<QueryClientProvider>` → `<DataProvider>` → `<BrowserRouter>` → `<App/>`; call `msalInstance.initialize()` and `handleRedirectPromise()` before render.
- [ ] **Step 4: Rewrite `src/App.tsx`** to define `<Routes>` for the six sections inside `<Layout>` and `<LoginGate>`. Remove the Vite starter markup/assets.
- [ ] **Step 5: Replace starter CSS** with a dark dashboard theme (CSS variables, grid for KPI cards, sidebar/topbar nav). Keep it in `index.css` + `App.css`.
- [ ] **Step 6: Run tests + typecheck + lint** → PASS.
- [ ] **Step 7: Commit** — `git commit -am "feat: app shell, routing, MSAL provider, login gate, theme"`

---

### Task 12: Section pages — SharePoint, Licensing, Estate, Exchange, Azure, Overview

**Files:**
- Create: `src/sections/{Overview,SharePoint,Licensing,Estate,Exchange,Azure}/index.tsx` (+ small subcomponents as needed)
- Test: `src/sections/SharePoint/SharePoint.test.tsx`, `src/sections/Overview/Overview.test.tsx`

**Interfaces:**
- Consumes: hooks (Task 9) + components (Task 10). Each section: handles loading (skeletons), error (`ErrorState`), and renders data. Sections with usage data include a `PeriodSelector` (period held in `Layout` context or URL search param `?period=D30`).

- [ ] **Step 1: Write failing test `SharePoint.test.tsx`** — render `<SharePoint/>` wrapped in mock `DataProvider` + `QueryClientProvider`; `await` and assert it shows the fixture total sites and a row per site. Expected FAIL (component missing).
- [ ] **Step 2: Implement `SharePoint/index.tsx`** — KPI cards (sites, files, active files, storage used via `formatBytes`), storage `ConsumptionBar`, per-site `DataTable`, `TrendChart` placeholder fed from storage series (reuse active-users-style series or site storage). Run test → PASS.
- [ ] **Step 3: Implement `Licensing/index.tsx`** — `DataTable` of SKUs + `ConsumptionBar` per SKU (consumed/enabled).
- [ ] **Step 4: Implement `Estate/index.tsx`** — org info card + active users / OneDrive / Teams `TrendChart`s + `PeriodSelector`.
- [ ] **Step 5: Implement `Exchange/index.tsx`** — mailbox KPI cards + email activity `TrendChart`.
- [ ] **Step 6: Implement `Azure/index.tsx`** — subscription selector, resource-count `DataTable`, MTD cost KPI card (currency + amount).
- [ ] **Step 7: Write failing test `Overview.test.tsx`** — asserts KPI cards for sites, licenses, and Azure spend appear from fixtures. Implement `Overview/index.tsx` aggregating across hooks. Run → PASS.
- [ ] **Step 8: Run full suite + typecheck + lint** → PASS.
- [ ] **Step 9: Commit** — `git commit -am "feat: all dashboard section pages"`

---

### Task 13: End-to-end tests (Playwright, mock mode)

**Files:**
- Create: `playwright.config.ts`, `e2e/dashboard.spec.ts`
- Modify: `package.json` (ensure `e2e` script; Playwright webserver runs `vite` with `VITE_USE_MOCK=true`)

**Interfaces:**
- Consumes: the built app in mock mode (no real tenant/MSAL).

- [ ] **Step 1: Create `playwright.config.ts`** with `webServer: { command: 'VITE_USE_MOCK=true npm run dev', url: 'http://localhost:5173', reuseExistingServer: !process.env.CI }` and `use.baseURL`.
- [ ] **Step 2: Install browsers** — `npx playwright install --with-deps chromium`.
- [ ] **Step 3: Write `e2e/dashboard.spec.ts`** — visits `/`, asserts Overview KPI cards visible; navigates to each tab (SharePoint, Licensing, Estate, Exchange, Azure) via nav links and asserts a known fixture value renders (e.g. SharePoint site count, an SKU part number, the Azure currency/amount).
- [ ] **Step 4: Run `npm run e2e`** → PASS.
- [ ] **Step 5: Commit** — `git commit -am "test: e2e dashboard flow in mock mode"`

---

### Task 14: README, permissions doc, and final verification

**Files:**
- Modify: `README.md`

**Interfaces:** none.

- [ ] **Step 1: Rewrite `README.md`** — setup, `.env` config, the Entra app registration steps (SPA platform, redirect URI, Graph scopes `Reports.Read.All`/`Organization.Read.All`/`User.Read` + admin consent), Azure RBAC (`Reader` + `Cost Management Reader`), `VITE_USE_MOCK` dev mode, and all npm scripts.
- [ ] **Step 2: Run the full gate**

```bash
npm run typecheck && npm run lint && npm test && npm run build && npm run e2e
```
Expected: all PASS.

- [ ] **Step 3: Commit** — `git commit -am "docs: README with setup, permissions, and run instructions"`

---

## Self-Review Notes

- **Spec coverage:** SharePoint (T6/T12), Licensing (T7/T12), Estate incl. OneDrive/Teams (T7/T12), Exchange (T7/T12), Azure resources + real cost (T5/T7/T12), MSAL two-token auth (T3/T8), period selector (T12), permission-error messaging (T10 `ErrorState`), config via env (T1), tests incl. e2e (T1/T13), README permissions (T14). All covered.
- **Billing clarification** preserved: real $ only via Azure Cost Management (T7 `parseCostQuery`, T12 Azure section); licensing is consumption-only.
- **Type consistency:** parser outputs match `src/types/reports.ts` (T2); `DataSource` method names reused verbatim across T8/T9/T12.
