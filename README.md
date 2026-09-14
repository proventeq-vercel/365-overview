# M365 Storage Overview

A browser-only SPA that shows a Microsoft 365 tenant administrator what their SharePoint and
OneDrive storage looks like today, how fast it is growing, and where the volume sits — a
sneak-peek of the Proventeq 365 storage-optimisation report, built from the tenant's own Graph
usage reports. Nothing leaves the browser: there is no backend, no lead capture and no telemetry.

Built with React 19, TypeScript, and Vite.

## The report

| Section | What it shows |
|---|---|
| **Current storage distribution** | Pooled SharePoint usage against the tenant's entitlement, and usage split by workload and by site template |
| **Future state & growth impact** | The measured 180-day storage trend, the average monthly growth, the projected exhaustion date and the cost of doing nothing |
| **Main offenders** | The largest sites and OneDrive drives, every site in a windowed detail table, and deleted sites and drives that still consume quota |

Four KPI cards sit above the sections: storage used, entitlement, remaining headroom and average
monthly growth. SharePoint and OneDrive are reported as two separate pools — OneDrive volume is
never counted against the SharePoint entitlement.

> **Entitlement note:** Microsoft Graph does not publish a tenant's pooled storage entitlement.
> The report estimates it the way Proventeq 365 does — 1 TiB plus 10 GB per licence whose service
> plans include SharePoint storage (1 GB per Extra File Storage unit, 0.5 GB per OneDrive standalone
> licence) — and marks every dependent figure *Estimated* until the administrator enters the real
> figure from the SharePoint admin centre in the report settings. The entered value is kept in
> the browser's `localStorage` only.

---

## Prerequisites

- **Node.js** 20 or later (LTS recommended)
- A **Microsoft Entra ID** work or school tenant (unless running in mock mode)

---

## Install

```bash
npm install
```

---

## Environment configuration

All configuration is via **build-time Vite env vars** (`import.meta.env.VITE_*`),
baked into the bundle at build time. For local dev, copy the example and fill in
your values:

```bash
cp .env.example .env
```

`.env` is git-ignored (it holds real local values). On **Vercel**, set these in
**Project Settings > Environment Variables** — no config file is deployed, and
the same repo builds cleanly for any environment.

### Auth config (live mode only)

| Var | Required | Description |
|---|---|---|
| `VITE_CLIENT_ID` | Yes (live) | Application (client) ID of the multi-tenant Entra ID app registration |
| `VITE_AUTHORITY_URI` | Yes (live) | `https://login.microsoftonline.com/organizations` — any work or school tenant. A tenant GUID here pins the app to one tenant and defeats multi-tenancy |
| `VITE_REDIRECT_URI` | Yes (live) | OAuth redirect URI (SPA), e.g. `http://localhost:5173/` for dev |

MSAL is configured with `cacheLocation: localStorage` and uses **redirect-based**
login and token acquisition (`acquireTokenSilent` → `acquireTokenRedirect` on
interaction-required / browser-auth errors).

### Mock flag — `VITE_USE_MOCK`

When `VITE_USE_MOCK=true`, the app runs on built-in fixture data with **no MSAL
and no auth config** — no Entra ID tenant required, and the three `VITE_*` auth
vars above are not needed. This is the mode used by the unit tests and Playwright
e2e. See `.env.example`.

### Mock scenario — `VITE_MOCK_SCENARIO`

Mock mode serves one of four fixture tenants so every caveat state can be seen and demoed
without a live tenant. Ignored unless `VITE_USE_MOCK=true`; an unrecognised value falls back to
`healthy`.

| Value | Tenant |
|---|---|
| `healthy` (default) | Estimated entitlement, steady growth, ~2,500 sites |
| `over-entitlement` | Already using more than the estimated entitlement — no exhaustion date to project |
| `concealed` | Report names concealed in the Microsoft 365 admin centre — the banner explains the hashes |
| `short-history` | Fewer than six months of trend data — no forecast, explicitly not an all-clear |

---

## Entra ID app registration

The app uses **MSAL with authorization-code + PKCE** and acquires a single Microsoft Graph token.
One registration serves every tenant that consents to it.

1. In the [Azure portal](https://portal.azure.com), go to **Entra ID > App registrations > New registration**.
2. Enter a name (e.g. `M365 Storage Overview`).
3. Under **Supported account types**, choose **Accounts in any organizational directory** (`AzureADMultipleOrgs`).
4. Under **Redirect URI**, select platform **Single-page application (SPA)** and enter the URI where the app is served (e.g. `http://localhost:5173/` for dev, your production URL for prod). This must match `VITE_REDIRECT_URI`.
5. Under **Branding & properties**, set a **verified publisher domain** — without it, tenant administrators see an unverified-publisher warning on the consent prompt.
6. Go to **API permissions > Add a permission > Microsoft Graph > Delegated permissions** and add `User.Read`, `Reports.Read.All` and `Organization.Read.All`.
7. Copy the **Application (client) ID** into `VITE_CLIENT_ID`. Leave `VITE_AUTHORITY_URI` at `https://login.microsoftonline.com/organizations`.

`Reports.Read.All` and `Organization.Read.All` require **admin consent** in each tenant that uses
the app; a signed-in administrator who has not yet consented is shown the consent screen with a
link to grant it.

> **Role requirement:** consent alone is not enough. `Reports.Read.All` additionally requires the
> signed-in user to hold **Global Reader**, **Reports Reader** or an equivalent directory role. A
> consented user without such a role gets a permission failure, and the app tells them which role
> to ask for rather than asking them to consent again.

---

## One report, or a menu of reports

The app renders the Storage Optimisation report in the Proventeq 365 look: a sticky
header (the proventeq365 wordmark, tenant name, in live mode the signed-in user, and
one **⋯ Options** menu whose items each carry an icon and a one-line description:
**Refresh data**, **Report settings**, and in live mode **Switch account** and
**Sign out**), KPI rails, panels, monochrome charts and the full site table. There is no navigation by default — it runs as a single report.

Reports are declared in `src/features/registry.ts`, each behind a feature flag named the
way the Proventeq 365 licence flags are (`optimization.storage.report.overview`,
`optimization.storage.report.onedrive`). `VITE_FEATURES` lists the enabled flags; only
those reports are built in and routable. With one report enabled there is no menu at
all; with two or more, a hamburger in the header opens a floating menu of the enabled
reports. The root path falls back to the first enabled report. The OneDrive Usage report
is the proof of concept for a second report and reuses the same model and data.

**Report settings** opens a dialog with the cost per GB per month (with the currency
picked from a list), and the SharePoint entitlement in TB — the licence estimate is shown as the
hint so the admin knows what they are replacing. Settings live in the browser's
localStorage only.

## Running the app

### Development (live tenant)

```bash
npm run dev
```

### Development (mock mode — no tenant required)

```bash
VITE_USE_MOCK=true npm run dev
VITE_USE_MOCK=true VITE_MOCK_SCENARIO=concealed npm run dev
```

Mock mode uses built-in fixture data. No Entra ID credentials are needed. This is the fastest way to explore the UI.

### Production build

```bash
npm run build
```

The output is written to `dist/`. Serve with any static file host.

### Preview production build locally

```bash
npm run preview
```

---

## npm scripts

| Script | Description |
|---|---|
| `dev` | Start Vite dev server with HMR |
| `build` | TypeScript compile then Vite production bundle (output: `dist/`) |
| `preview` | Serve the production build locally for inspection |
| `lint` | Run Oxlint static analysis |
| `typecheck` | TypeScript type-check without emitting files |
| `test` | Run Vitest unit tests (single run) |
| `test:watch` | Run Vitest in interactive watch mode |
| `e2e` | Run Playwright end-to-end tests against the mock dev server (started automatically) |

---

## Project structure

```
src/
  app/           # Shell: AppShell, Header, HeaderActions, AccountChip, FloatingMenu, SettingsDialog, SettingsProvider
  auth/          # MSAL: getMsalInstance, GRAPH_SCOPES, tokens, MsalAuthProvider/Handler
  clients/       # graphClient — thin fetch wrapper + ApiError
  config/        # env.ts (VITE_USE_MOCK, VITE_MOCK_SCENARIO, VITE_FEATURES), featureFlags.ts, appConfig.ts (VITE_* auth config)
  data/          # live.ts (the five Graph calls), fixtures.ts (four mock tenants + DataSource interface)
  reports/       # Pure parsers for each Graph response shape
  model/         # buildStorageOverview — the single derivation of every figure on screen
  lib/           # entitlement, forecast, cost, concealment, settings, topNWithOther, format
  hooks/         # useStorageOverview — fetches the inputs once, rebuilds the model on settings change
  design/        # P365 design system: theme tokens, StatCard, panels, charts, AlertPanel, skeleton, logo
  features/      # registry.ts (reports + their feature flags) + one folder per report (storageOptimization, oneDriveUsage)
  types/         # StorageOverview, StorageRow and the other shared types
  components/    # Shared UI (SiteTable, CaveatBanner, ErrorState, shadcn primitives)
  test/          # Test utilities and setup
e2e/             # Playwright end-to-end tests
```

---

## Data flow

1. In live mode, `MsalAuthProvider` initialises the MSAL singleton and `MsalAuthHandler` gates the app — with no signed-in account it calls `loginRedirect()`.
2. `useStorageOverview` issues the five Graph calls once — SharePoint site detail, OneDrive account detail, both 180-day storage trends and the subscribed SKUs — plus `/organization` for the header. The `/reports/*` functions are read from the `/beta` endpoint, which is the only one that serves them as JSON.
3. The parsed inputs go through `buildStorageOverview`, which produces every figure the screen shows. Sections render the model; none of them compute a number.
4. The Graph scopes are consented on the first token round-trip, so an unconsented organisation fails there with `AADSTS65001`: `MsalAuthHandler` keeps the error object and `AuthErrorScreen` shows the Global Administrator action with the admin-consent link (built for the multi-tenant `organizations` endpoint, `redirect_uri` included). Once signed in, a failed Graph call is classified the same way in `AccessFailure`: consent error → consent screen; any other authorisation failure → the role screen; anything else → the generic error state.
