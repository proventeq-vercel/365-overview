# M365 Storage Overview

A browser-only SPA that shows a Microsoft 365 tenant administrator what their SharePoint and
OneDrive storage looks like today, how fast it is growing, and where the volume sits — a
sneak-peek of the Proventeq 365 storage-optimisation report, built from the tenant's own Graph
usage reports. There is no lead capture and no telemetry. By default nothing leaves the browser;
with the optional [Graph proxy](functions/README.md) configured, the browser's Graph calls go
through an Azure Function that signs them app-only for the signed-in admin's tenant.

Built with React 19, TypeScript, and Vite.

## The report

| Section | What it shows |
|---|---|
| **Current storage distribution** | Pooled SharePoint usage against the tenant's entitlement, and usage split by workload and by site template |
| **Future state & growth impact** | The measured 180-day storage trend, the average monthly growth, the projected exhaustion date and the cost of doing nothing |
| **Main offenders** | The largest sites and OneDrive drives, every site in a paginated, searchable detail table, and deleted sites and drives that still consume quota |

Four KPI cards sit above the sections: storage used (against the entitlement), remaining
headroom, the cost of doing nothing and the forecast exhaustion date. SharePoint and OneDrive are reported as two separate pools — OneDrive volume is
never counted against the SharePoint entitlement.

> **Entitlement note:** Microsoft Graph does not publish a tenant's pooled storage entitlement.
> The report estimates it the way Proventeq 365 does — 1 TiB plus 10 GB per licence whose service
> plans include SharePoint storage (1 GB per Extra File Storage unit, 0.5 GB per OneDrive standalone
> licence) — and marks every dependent figure *Estimated* until the administrator enters the real
> figure from the SharePoint admin centre in the report settings. The entered value is kept in
> the browser's `localStorage` only, against the tenant it was entered for, so signing in to
> another tenant never reuses it.

---

## Prerequisites

- **Node.js** 20.19+ or 22.13+ (22 LTS recommended; CI runs 22) — Vite 8, oxlint and jsdom 29 refuse older releases
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
multi-tenant "Proventeq365 - Storage Analyser" app, so any work or school
account can sign in) with the page's own origin as the redirect URI. Everything
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

### Every option at a glance

| Var | Default | What it does | URL override |
|---|---|---|---|
| `VITE_CLIENT_ID` | built-in registration | Entra application (client) id | — |
| `VITE_AUTHORITY_URI` | built-in registration's authority | Which tenants may sign in | — |
| `VITE_REDIRECT_URI` | the page's own origin + `/` | OAuth redirect URI, must be registered | — |
| `VITE_GRAPH_PROXY_URL` | unset — the browser calls Graph itself | Route every Graph call through the proxy, app-only | — |
| `VITE_GRAPH_PROXY_SCOPE` | `api://<VITE_CLIENT_ID>/access_as_user` | The proxy's exposed scope | — |
| `VITE_LOCAL_AUTH_URL` | unset | Dev server only: take the caller token from the local fake Entra | — |
| `VITE_USE_MOCK` | `false` | Run on fixture data with no auth at all | `?mock=` |
| `VITE_MOCK_SCENARIO` | `healthy` | Which fixture tenant mock mode serves | `?scenario=` |
| `VITE_FEATURES` | `optimization.storage.report.overview` | Which reports are routable, and whether the menu exists | `?features=` |
| `VITE_MODES_LOCKED` | `false` | Ignore every URL override; the one var the URL cannot touch | — |

Only the last four have a URL override, and `?modes=reset` forgets all of them for the tab.
Every var is read once at load: `src/config/env.ts` is a module constant, so nothing re-reads
the env or the URL mid-session.

### Auth config (live mode only)

| Var | Default | Description |
|---|---|---|
| `VITE_CLIENT_ID` | the built-in registration | Application (client) ID of the Entra ID app registration |
| `VITE_AUTHORITY_URI` | the built-in registration's tenant | `https://login.microsoftonline.com/organizations` opens the app to any work or school tenant (the registration must be multi-tenant); a tenant GUID pins it to one tenant |
| `VITE_REDIRECT_URI` | the page's own origin + `/` | OAuth redirect URI (SPA); it must be registered on the app registration, which is why localhost and the production host are |

An empty value counts as unset.

MSAL is configured with `cacheLocation: localStorage` and uses **redirect-based**
login and token acquisition (`acquireTokenSilent` → `acquireTokenRedirect` on
interaction-required / browser-auth errors, except a network failure or an
interaction already in progress, which signing in again would not fix).

### Graph proxy — `VITE_GRAPH_PROXY_URL`, `VITE_GRAPH_PROXY_SCOPE`

| Var | Default | Description |
|---|---|---|
| `VITE_GRAPH_PROXY_URL` | unset (call Graph directly) | Base URL of the deployed [Graph proxy](functions/README.md), e.g. `https://<function-app>.azurewebsites.net/api/graph`. When set, every Graph call goes there and MSAL asks for the proxy scope alone — no delegated report scope is requested from the prospect |
| `VITE_GRAPH_PROXY_SCOPE` | `api://<VITE_CLIENT_ID>/access_as_user` | The proxy's exposed scope; only needed when the proxy is a separate registration. The admin-consent link takes the proxy's client id from this URI, so keep the `api://<client id>` form — a named App ID URI makes the link consent the SPA registration instead |
| `VITE_LOCAL_AUTH_URL` | unset | **Dev server only** (ignored by every build): the local stack's fake Entra, e.g. `http://127.0.0.1:7080`. Skips MSAL and takes the caller token from there, so the real UI runs against the local proxy with no tenant. Needs `VITE_GRAPH_PROXY_URL` |

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

### Feature flags — `VITE_FEATURES`

A comma list of the flags to enable, named the way the Proventeq 365 licence flags are.
Unknown flags are dropped; **unset means the default set**, and setting the var *replaces*
that set rather than adding to it, so a list must name every flag it wants.

| Flag | In the default set | What it enables |
|---|---|---|
| `optimization.storage.report.overview` | yes | The Storage Optimisation report — the whole point of the app |
| `optimization.storage.report.onedrive` | no | The OneDrive Usage report, on `/onedrive-usage` |
| `app.menu` | no | The hamburger and the side menu of reports |

`app.menu` is off by default, so the deployed app is a single report with no navigation.
Turning it on takes effect only where there is something to navigate to — with fewer than
two reports enabled the menu stays hidden, because a menu of one is not navigation.
A report whose flag is off is not routable at all; a report that is on is always reachable
at its own path, menu or no menu.

```
# both reports and the menu, from the env
VITE_FEATURES=optimization.storage.report.overview,optimization.storage.report.onedrive,app.menu

# the same for one browser tab, no rebuild
/?features=optimization.storage.report.overview,optimization.storage.report.onedrive,app.menu
```

### Mode lock — `VITE_MODES_LOCKED`

`VITE_MODES_LOCKED=true` makes the app ignore `?features=`, `?mock=`, `?scenario=` and any
override already remembered for the tab. It is applied inside `readEnv`, so no test or
caller can slip past it, and a deployment that must not be reconfigured from a URL —
anything customer-facing — should set it.

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

> **Role requirement, and only on this path:** consent alone is not enough. *Delegated*
> `Reports.Read.All` additionally requires the signed-in user to hold **Global Reader**,
> **Reports Reader** or an equivalent directory role — Microsoft's rule, not ours. A consented user
> without such a role gets a permission failure, and the app tells them which role to ask for
> rather than asking them to consent again.
>
> **Through the Graph proxy this does not apply.** The proxy reads app-only, so Graph never looks at
> the signed-in user's roles, and any signed-in user of an allowed tenant may read the report —
> matching P365, which gates on an active licence rather than a directory role. See
> `functions/README.md`.

---

## Modes: env by default, URL per tab, lockable

The app has three runtime switches — which reports and shell features are enabled, whether
it runs on fixture data, and which fixture tenant. The env (`VITE_FEATURES`, `VITE_USE_MOCK`,
`VITE_MOCK_SCENARIO`) is the default, and the deployed default is the Storage
Optimisation report alone, live data, no menu. Each switch can also be set for one
browser tab with a search param:

| Param | Values | Example |
|---|---|---|
| `features` | comma list of `optimization.storage.report.overview`, `optimization.storage.report.onedrive`, `app.menu` | `/?features=optimization.storage.report.overview,optimization.storage.report.onedrive,app.menu` (both reports + the menu) |
| `mock` | `true` / `false` | `/?mock=true` (fixture data, no sign-in) |
| `scenario` | `healthy` / `over-entitlement` / `concealed` / `short-history` | `/?mock=true&scenario=concealed` |
| `modes` | `reset` | `/?modes=reset` (forget every override) |

A param present in the URL is remembered for the tab (sessionStorage), so in-app
navigation and the sign-in redirect keep it; an empty value such as `?features=` clears
that one override; a new tab starts from the env again. `VITE_MODES_LOCKED=true` makes
the app ignore the URL entirely — it is the one variable the URL can never touch, and
the production deployment should set it. Whenever the app runs on fixture data a banner
at the top of the page says it is a sample tenant, and when the URL switched it on the
banner carries the reset link.

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
those reports are routable. The menu is a flag of its own, `app.menu`, and it is **off
unless it is asked for** — from the env or from `?features=`. With it off there is no
hamburger and the side menu is not mounted at all, however many reports are enabled; with
it on and two or more reports enabled, the hamburger opens the side menu of them. The root
path falls back to the first enabled report. The OneDrive Usage report is the proof of
concept for a second report and reuses the same model and data.

**Report settings** opens a dialog with the cost per GB per month (with the currency
picked from a list), and the SharePoint entitlement in TB — the licence estimate is shown as the
hint so the admin knows what they are replacing. Settings live in the browser's
localStorage only; the rate and currency apply to every tenant, the entitlement only to the
tenant it was entered for.

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

### Development (through the local Graph proxy — no tenant required)

The real data path, end to end, with no tenant: the proxy runs locally against a fake Entra and a
fake Graph, and the SPA reads through it. In one terminal:

```bash
cd ~/projects/365-overview/functions && npm install && npm run local
```

In another:

```bash
cd ~/projects/365-overview && VITE_GRAPH_PROXY_URL=http://127.0.0.1:7071/api/graph VITE_LOCAL_AUTH_URL=http://127.0.0.1:7080 npm run dev
```

See [functions/README.md](functions/README.md) for the smoke script, running under the Azure
Functions host, and validating against a real tenant before deploying.

### Production build

```bash
npm run build
```

The output is written to `dist/`. Serve with any static file host.

### Hosting the build on Azure

The production host is Vercel, but a build can be served from an Azure Storage **static website**
in the same resource group as the Graph proxy — useful for checking a branch against a real tenant
without touching the Vercel project. No script, and nothing here is specific to a branch:

```bash
cd ~/projects/365-overview
az storage account create --name <storage> --resource-group <rg> --location uksouth --sku Standard_LRS --kind StorageV2 --min-tls-version TLS1_2 --allow-blob-public-access true
az storage blob service-properties update --account-name <storage> --static-website --index-document index.html --404-document index.html --auth-mode login
VITE_GRAPH_PROXY_URL=https://<function-app>.azurewebsites.net/api/graph npm run build
az storage blob upload-batch --account-name <storage> --destination '$web' --source dist --overwrite --auth-mode key
```

The site is then `https://<storage>.z33.web.core.windows.net/`. `index.html` is the 404 document so
client-side routes resolve; Azure serves them with a `404` status, which the browser ignores but a
crawler would not — the Vercel rewrite in `vercel.json` is the one that answers `200`.

Three things have to name the new origin before it works:

- `PROXY_ALLOWED_ORIGINS` on the Function App,
- the Function App's **platform CORS** list (`az functionapp cors add`) — see `functions/README.md`
  for why both are needed,
- the **SPA redirect URI** on the Entra registration. Without it MSAL reaches the sign-in page and
  fails on the way back with `AADSTS50011`; Entra does not validate the redirect URI until after
  authentication, so a sign-in prompt is not evidence that the URI is registered. Adding one needs
  write access to the registration, which owning the subscription does not grant.

### Automatic deployment

`.github/workflows/deploy.yml` deploys on every push to `main`, but only **after CI has gone
green** on that commit (`workflow_run`), and it can be run by hand from the Actions tab — a
manual run refuses a commit that has no successful CI run. Two jobs, both from the exact commit
CI tested:

| Job | What it deploys | Where |
|---|---|---|
| `proxy` | `functions/`, built and pruned to production dependencies | the Function App, `Azure/functions-action` with `sku: flexconsumption` |
| `site` | `npm run build` output | the storage account's `$web` container, `az storage blob upload-batch` |

Vercel deploys the SPA from `main` on its own, so this workflow is what keeps the **proxy** and
the **Azure-hosted copy** current.

**It needs credentials the repo does not have yet.** The first job checks for them and, when they
are absent, skips the deploy with a note in the run summary rather than failing — so the workflow
is inert until someone configures it, and merging it changes nothing.

The Function App is on a **Flex Consumption** plan, which deploys through Entra RBAC only:
publish-profile (basic auth) deployment is not supported there, and SCM basic auth is disabled on
the app anyway. So a federated (OIDC) credential is required, and creating one needs a directory
role this project's account does not hold — `az ad app create` answers *"Insufficient privileges
to complete the operation"*. **A tenant administrator has to create it once:**

```bash
# 1. an app registration for the deployment, and its service principal
az ad app create --display-name 365-overview-github-deploy
az ad sp create --id <appId>

# 2. trust GitHub's token for this repo's main branch
az ad app federated-credential create --id <appId> --parameters '{
  "name": "github-main",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:proventeq-vercel/365-overview:ref:refs/heads/main",
  "audiences": ["api://AzureADTokenExchange"]
}'

# 3. let it deploy, and write to the static website
az role assignment create --assignee <appId> --role Contributor \
  --scope /subscriptions/<subscription>/resourceGroups/rg-lh-sa-dev
az role assignment create --assignee <appId> --role "Storage Blob Data Contributor" \
  --scope /subscriptions/<subscription>/resourceGroups/rg-lh-sa-dev/providers/Microsoft.Storage/storageAccounts/p365lite
```

Then set three repository **secrets** — `AZURE_CLIENT_ID` (the appId), `AZURE_TENANT_ID`,
`AZURE_SUBSCRIPTION_ID` — and, if the names ever differ from the defaults in the workflow, the
repository **variables** `AZURE_FUNCTIONAPP_NAME` and `AZURE_STORAGE_ACCOUNT`. The `site` job also
reads `VITE_CLIENT_ID`, `VITE_AUTHORITY_URI`, `VITE_GRAPH_PROXY_URL`, `VITE_GRAPH_PROXY_SCOPE`,
`VITE_FEATURES` and `VITE_MODES_LOCKED` from repository variables, so the Azure-hosted copy is
configured without touching the code. The redirect URI is the static website's own origin, which
has to be a registered SPA redirect URI on whichever registration `VITE_CLIENT_ID` names.

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
  app/           # Shell: AppShell, Header, HeaderActions, AccountChip, SideMenu, SettingsDialog, SettingsProvider
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
functions/       # The Graph proxy (Azure Functions v4) with its own package.json, tests and local stack — see functions/README.md
```

---

## Data flow

1. In live mode, `MsalAuthProvider` initialises the MSAL singleton and `MsalAuthHandler` gates the app — with no signed-in account it calls `loginRedirect()`.
2. `useStorageOverview` issues the Graph calls once — SharePoint site detail, OneDrive account detail, both 180-day storage trends and the subscribed SKUs, the `sites/delta` directory walk that names the sites (proxy mode only) and a `$batch` lookup for the largest sites it did not name — plus `/organization` for the header. The `/reports/*` functions are read from the `/beta` endpoint, which is the only one that serves them as JSON.
3. The parsed inputs go through `buildStorageOverview`, which produces every figure the screen shows. Sections render the model; none of them compute a number.
4. The Graph scopes are consented on the first token round-trip, so an unconsented organisation fails there with `AADSTS65001`: `MsalAuthHandler` keeps the error object and `AuthErrorScreen` shows the Global Administrator action with the admin-consent link (built for the multi-tenant `organizations` endpoint, `redirect_uri` included). Once signed in, a failed Graph call is classified the same way in `AccessFailure`: consent error → consent screen; the proxy's `TenantNotAllowed` → the tenant screen, which says no role or consent will change it; any other authorisation failure → the role screen; anything else → the generic error state.
