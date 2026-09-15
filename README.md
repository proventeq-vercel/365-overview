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
| **Main offenders** | The largest sites and OneDrive drives, every site in a paginated, searchable detail table, and deleted sites and drives that still consume quota |

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

**No configuration is required.** With no env at all the app runs on real data
(live mode) with the Storage Optimisation report only, signing in through the
built-in Entra registration (`DEFAULT_AUTH` in `src/config/appConfig.ts`, the
proventeqe5 tenant) with the page's own origin as the redirect URI. Everything
below changes that default; each value is a **build-time Vite env var**
(`import.meta.env.VITE_*`) baked into the bundle, and the three modes can also
be switched per tab from the URL. For local dev, copy the example if you want
to change anything:

```bash
cp .env.example .env
```

`.env` is git-ignored (it holds real local values). On **Vercel**, set these in
**Project Settings > Environment Variables** — no env file is deployed, and
the same repo builds cleanly for any environment. `vercel.json` carries the one
piece of hosting config the app needs: a rewrite of every path to `index.html`,
so a reload on `/onedrive-usage` (or any client-side route) is served by the
app instead of Vercel's 404.

### Auth config (live mode only)

| Var | Default | Description |
|---|---|---|
| `VITE_CLIENT_ID` | the built-in registration | Application (client) ID of the Entra ID app registration |
| `VITE_AUTHORITY_URI` | the built-in registration's tenant | `https://login.microsoftonline.com/organizations` opens the app to any work or school tenant (the registration must be multi-tenant); a tenant GUID pins it to one tenant |
| `VITE_REDIRECT_URI` | the page's own origin + `/` | OAuth redirect URI (SPA); it must be registered on the app registration, which is why localhost and the production host are |

An empty value counts as unset.

MSAL is configured with `cacheLocation: localStorage` and uses **redirect-based**
login and token acquisition (`acquireTokenSilent` → `acquireTokenRedirect` on
interaction-required / browser-auth errors).

### Mock flag — `VITE_USE_MOCK`

When `VITE_USE_MOCK=true`, the app runs on built-in fixture data with **no MSAL
and no auth config** — no Entra ID tenant required. This is the mode used by the unit tests and Playwright
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
One registration serves every tenant that consents to it. The built-in registration already
exists; these steps are for pointing the app at a registration of your own through the auth env.

1. In the [Azure portal](https://portal.azure.com), go to **Entra ID > App registrations > New registration**.
2. Enter a name (e.g. `M365 Storage Overview`).
3. Under **Supported account types**, choose **Accounts in any organizational directory** (`AzureADMultipleOrgs`).
4. Under **Redirect URI**, select platform **Single-page application (SPA)** and enter the URI where the app is served (e.g. `http://localhost:5173/` for dev, your production URL for prod). This must match `VITE_REDIRECT_URI`.
5. Under **Branding & properties**, set a **verified publisher domain** — without it, tenant administrators see an unverified-publisher warning on the consent prompt.
6. Go to **API permissions > Add a permission > Microsoft Graph > Delegated permissions** and add `User.Read`, `Reports.Read.All`, `Organization.Read.All` and `Sites.Read.All`.
7. Copy the **Application (client) ID** into `VITE_CLIENT_ID` and set `VITE_AUTHORITY_URI` to `https://login.microsoftonline.com/organizations`.

`Reports.Read.All`, `Organization.Read.All` and `Sites.Read.All` require **admin consent** in each
tenant that uses the app; a signed-in administrator who has not yet consented is shown the consent
screen with a link to grant it. A tenant that consented before `Sites.Read.All` was added is asked
to consent again.

`Sites.Read.All` exists because the SharePoint site usage report returns a blank `siteUrl` for
every site (a known Microsoft-side issue), so the app looks each site up by the id the report
carries (`GET /sites/{id}?$select=id,displayName,webUrl`, twenty at a time through `$batch`) —
only for the fifty largest sites up front and then for whichever page of the table is on screen,
so the cost is a few requests per page however many sites the tenant has. A site the lookup does
not return — a deleted site, or one the signed-in user cannot open — falls back to its owner's
name and its id.

> **Role requirement:** consent alone is not enough. `Reports.Read.All` additionally requires the
> signed-in user to hold **Global Reader**, **Reports Reader** or an equivalent directory role. A
> consented user without such a role gets a permission failure, and the app tells them which role
> to ask for rather than asking them to consent again.

---

## Modes: env by default, URL per tab, lockable

The app has three runtime switches — which reports are enabled, whether it runs on
fixture data, and which fixture tenant. The env (`VITE_FEATURES`, `VITE_USE_MOCK`,
`VITE_MOCK_SCENARIO`) is the default, and the deployed default is the Storage
Optimisation report alone, live data, no menu. Each switch can also be set for one
browser tab with a search param:

| Param | Values | Example |
|---|---|---|
| `features` | comma list of `optimization.storage.report.overview`, `optimization.storage.report.onedrive` | `/?features=optimization.storage.report.overview,optimization.storage.report.onedrive` (both reports + menu) |
| `mock` | `true` / `false` | `/?mock=true` (fixture data, no sign-in) |
| `scenario` | `healthy` / `over-entitlement` / `concealed` / `short-history` | `/?mock=true&scenario=concealed` |
| `modes` | `reset` | `/?modes=reset` (forget every override) |

A param present in the URL is remembered for the tab (sessionStorage), so in-app
navigation and the sign-in redirect keep it; an empty value such as `?features=` clears
that one override; a new tab starts from the env again. `VITE_MODES_LOCKED=true` makes
the app ignore the URL entirely — it is the one variable the URL can never touch, and
the production deployment should set it.

## Localisation

Every user-facing string comes from `src/intl/en.json` through `react-intl`, the same
setup the Proventeq 365 frontend uses: a flat catalogue with dotted keys and ICU
`{values}`, an `IntlProvider` at the root, and `const t = useTranslation()` in components.
English is the only language shipped and there is no language switcher yet; adding a
locale means adding another catalogue and a provider `locale` — no component changes.

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
  config/        # env.ts (VITE_USE_MOCK, VITE_MOCK_SCENARIO, VITE_FEATURES + URL overrides), modes.ts, featureFlags.ts, appConfig.ts
  data/          # live.ts (the five Graph calls), fixtures.ts (four mock tenants + DataSource interface)
  reports/       # Pure parsers for each Graph response shape
  model/         # buildStorageOverview — the single derivation of every figure on screen
  lib/           # entitlement, forecast, cost, concealment, settings, topNWithOther, format
  hooks/         # useStorageOverview — fetches the inputs once, rebuilds the model on settings change; useTranslation
  intl/          # en.json — the single flat message catalogue (react-intl, ICU values), P365-style
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
