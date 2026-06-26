# M365 + Azure Estate Dashboard — Design

**Date:** 2026-06-26
**Status:** Approved (pending spec review)

## Purpose

A tenant-wide admin dashboard that authenticates an M365 administrator via MSAL
(browser, authorization-code + PKCE) and surfaces reporting data from the
Microsoft Graph reporting API and Azure Resource Manager / Cost Management APIs.
It answers: how many SharePoint sites and files exist, how much storage is used,
what licenses are subscribed and consumed, cross-workload estate usage (users,
OneDrive, Teams, Exchange), and real Azure resource inventory plus month-to-date
spend in dollars.

## Scope

Tenant-wide admin view. The signed-in user is expected to be an admin with the
required Graph scopes (admin-consented) and Azure RBAC roles. The app degrades
gracefully when a permission is missing rather than failing wholesale.

## Architecture — pure browser SPA (no backend)

Keep the existing React 19 + TypeScript + Vite SPA. Authentication and all data
fetching happen in the browser.

- **Auth:** `@azure/msal-browser` + `@azure/msal-react`, authorization-code flow
  with PKCE. Single login; tokens acquired on demand per resource.
- **Two token audiences:**
  - Microsoft Graph — scopes `Reports.Read.All`, `Organization.Read.All`,
    `User.Read`.
  - Azure ARM — scope `https://management.azure.com/user_impersonation`
    (covers both Resource Manager and Cost Management calls).
- All API calls go directly browser → Microsoft. Both Graph and ARM support CORS
  for SPA redirect-registered apps.

**Alternative considered and rejected for v1:** a BFF/backend proxy (more secure
token handling, enables app-only auth). Rejected because the requirement is MSAL
browser login and the repo is already a client-only Vite app. The UI is built so
a future BFF can be introduced without a rewrite (all network access goes through
thin client modules).

## Stack additions

| Package | Purpose |
|---|---|
| `@azure/msal-browser`, `@azure/msal-react` | Auth (login, token acquisition) |
| `@tanstack/react-query` | Caching, loading, and error state for ~20 report calls |
| `recharts` | Trend charts (storage, file counts, active users) |
| `react-router-dom` | One route per section tab |
| `papaparse` | Parse report endpoints that return CSV (request JSON via `?$format=application/json` where supported) |
| `vitest` | Unit tests for parsers and clients |

## Configuration

Read from Vite env vars, with an `.env.example`:

- `VITE_AAD_CLIENT_ID` — Entra ID app (SPA) client ID
- `VITE_AAD_TENANT_ID` — tenant ID (authority `https://login.microsoftonline.com/<tenant>`)
- `VITE_AAD_REDIRECT_URI` — defaults to app origin

Scopes are defined as constants in code (not env), grouped by resource.

## Sections (tabs / routes)

1. **Overview** (`/`) — top-line KPI cards aggregated across workloads: total
   sites, total files, total storage, active users, license seats used/available,
   Azure month-to-date spend. Each card links to its section.
2. **SharePoint** (`/sharepoint`) — `getSharePointSiteUsageDetail`,
   `getSharePointSiteUsageFileCounts`, `getSharePointSiteUsageStorage`. Shows
   total sites, total/active files, storage used vs allocated, a per-site table,
   and storage + file-count trend charts.
3. **Licensing** (`/licensing`) — `/subscribedSkus`. Table of SKUs with assigned
   vs available seats and consumption bars. Note: actual billing/invoice dollar
   amounts are NOT available in Graph; license consumption is the proxy here
   (real $ spend appears in the Azure section via Cost Management).
4. **Estate** (`/estate`) — `/organization` (tenant info),
   `getOffice365ActiveUserCounts`/`Detail` (active users), `getOneDriveUsage*`
   (OneDrive), `getTeamsUserActivityUserCounts` (Teams).
5. **Exchange** (`/exchange`) — `getMailboxUsageMailboxCounts`,
   `getMailboxUsageStorage`, `getEmailActivityCounts`. Mailbox count, storage,
   email volume.
6. **Azure** (`/azure`) — ARM: `GET /subscriptions`, resource-group and resource
   counts by type (`/resources`). Cost Management `POST
   /providers/Microsoft.CostManagement/query` for real month-to-date spend per
   subscription.

## Cross-cutting concerns

- **Period selector** (D7 / D30 / D90 / D180, default D30) on usage-based
  sections; drives the Graph report `period` argument and is part of the React
  Query cache key.
- **Error handling:** per-section error boundaries plus React Query error states.
  A missing scope, missing admin role, or missing Azure RBAC produces a clear,
  actionable message ("admin consent needed for Reports.Read.All", "Cost
  Management Reader role required on subscription X") instead of a generic
  failure. One failing section never blanks the others.
- **Concealed reports:** if the tenant de-identifies user/site names in usage
  reports (admin privacy setting), show a non-blocking notice; aggregate counts
  still render.
- **Loading/empty states:** skeletons while loading; explicit empty states when a
  report returns no rows.

## Module boundaries

- `src/auth/` — MSAL config, `MsalProvider` setup, token acquisition helpers
  (`getGraphToken`, `getArmToken`).
- `src/clients/graphClient.ts` — typed fetch wrapper for Graph (handles auth
  header, JSON vs CSV, paging via `@odata.nextLink`).
- `src/clients/armClient.ts` — typed fetch wrapper for ARM + Cost Management.
- `src/reports/` — pure functions: parse a raw report response (CSV or JSON) into
  typed rows and aggregates. Independently unit-testable, no network.
- `src/hooks/` — React Query hooks wrapping clients + parsers per report.
- `src/sections/` — one folder per tab (Overview, SharePoint, Licensing, Estate,
  Exchange, Azure), each composing hooks + presentational components.
- `src/components/` — shared UI: KpiCard, DataTable, TrendChart, ConsumptionBar,
  PeriodSelector, ErrorState, SkeletonCard.

## Required permissions (documented in README)

- **Graph (delegated, admin consent):** `Reports.Read.All`,
  `Organization.Read.All`, `User.Read`.
- **Azure RBAC:** `Reader` (resource inventory) + `Cost Management Reader` (spend)
  on each subscription to be reported.
- The Entra app registration must be type **SPA** with the redirect URI matching
  `VITE_AAD_REDIRECT_URI`.

## Testing strategy

- **Unit (Vitest):** report parsers (CSV→typed rows, aggregation math), client
  wrappers (mocked `fetch` — auth header, paging, JSON/CSV branch, error
  mapping). No live-tenant or network tests.
- **Manual:** run against a real tenant with `.env` configured; verify each
  section renders and permission-error messaging works when a scope is absent.

## Out of scope (v1)

- App-only / backend auth (BFF).
- Writing/mutating any tenant data (read-only dashboard).
- Historical persistence/warehousing of report data (always live from API).
- Billing invoices/payment data beyond Azure Cost Management spend.
