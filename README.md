# M365 Storage Overview

A browser-only SPA that shows a Microsoft 365 tenant administrator what their SharePoint and
OneDrive storage looks like today, how fast it is growing, and where the volume sits — a
sneak-peek of the Proventeq 365 storage-optimisation report, built from the tenant's own Graph
usage reports. There is no lead capture and no telemetry. By default nothing leaves the browser;
with the optional [Graph proxy](functions/README.md) configured, the browser's Graph calls go
through an Azure Function that signs them app-only for the signed-in admin's tenant.

Built with React 19, TypeScript, and Vite.

## Where it lives

| What | URL | Permissions | Hosted on |
|---|---|---|---|
| **Report, delegated permissions — the main site** | <https://gray-water-0a8893303.1.azurestaticapps.net> | The signed-in user's own Graph token (Reports Reader, SharePoint Administrator or Global Administrator) | Azure Static Web App `p365-lite` |
| **Report, application permissions** | <https://p365lite.z33.web.core.windows.net/> | App-only through the Graph proxy; any signed-in user once an admin has consented | Azure Storage static website `p365lite` |
| **Graph proxy** (not a page) | `https://func-lh-sa-dev.azurewebsites.net/api/graph` | Serves the application-permissions report only | Azure Function App `func-lh-sa-dev` |
| **Pull request previews** | posted on each PR by the *Preview* workflow | None — mock data (the Contoso demo tenant), no sign-in | staging environments of the Static Web App `p365-lite` |

All of it lives in the resource group `rg-lh-sa-dev`. Both report sites are redeployed from `main`
by `.github/workflows/deploy.yml` once CI is green (see *Automatic deployment*). Append
`?hideNames=true` to either report URL to mask site names and owners (see *Hiding names*).
Each site also serves `/help` — the help centre for every report and for enabling access, without signing in (see *Help centre*).
`https://365-overview.vercel.app/` no longer serves the app (it answers `404`).

## The report

| Section | What it shows |
|---|---|
| **Current storage distribution** | Pooled SharePoint usage against the tenant's entitlement, and usage split by workload and by site template |
| **Tenant capacity** | Inactive sites ready to archive, the potential saving, the cost of doing nothing over the next 12 months and the forecast exhaustion (see below) |
| **Future state & growth impact** | The measured 180-day storage trend, the average monthly growth, the projected exhaustion date and the cost of doing nothing |
| **Main offenders** | The largest sites and OneDrive drives, every site in a paginated, searchable detail table, and deleted sites and drives that still consume quota |

**Tenant capacity** sits under the distribution section, as four cards, each railed green,
orange or red by its state:

| Card | Value | Green · orange · red |
|---|---|---|
| **Inactive sites to archive** | Storage in live SharePoint sites with no activity for the inactivity window (Report settings, default 3 years, before the report date); the share of site storage and the site count in the description. A site with no recorded activity is not counted. | ≤ 5% · ≤ 50% · above 50% of live site storage |
| **Potential saving per year** | That storage × the cost per GB per month × 12 | as the archive card |
| **Cost of doing nothing, next 12 months** | The next year's growth beyond the entitlement, priced at the same rate | zero · above zero · the year's billable growth is more than a tenth of the entitlement |
| **Forecast exhaustion** | The month SharePoint storage passes the entitlement at the measured growth, explained with the rate and the headroom left | runway ≥ 36 months · ≥ 12 months · under 12 months or already exceeded |

Storage used and remaining headroom are in the *Quota usage* ring above the cards. SharePoint and
OneDrive are reported as two separate pools — OneDrive volume is never counted against the
SharePoint entitlement.

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
| `VITE_MODES_LOCKED` | `false` | Ignore every URL override except `?hideNames`; the one var the URL cannot touch | — |
| `VITE_HIDE_NAMES` | `false` | Mask site ids, owners and site links (initials / pseudonyms); see *Hiding names* | `?hideNames=true` (honoured even when locked) |

Only those five have a URL override, and `?modes=reset` forgets all of them for the tab.
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
interaction-required / browser-auth errors).

### Graph proxy — `VITE_GRAPH_PROXY_URL`, `VITE_GRAPH_PROXY_SCOPE`

| Var | Default | Description |
|---|---|---|
| `VITE_GRAPH_PROXY_URL` | unset (call Graph directly) | Base URL of the deployed [Graph proxy](functions/README.md), e.g. `https://<function-app>.azurewebsites.net/api/graph`. When set, every Graph call goes there and MSAL asks for the proxy scope alone — no delegated report scope is requested from the prospect |
| `VITE_GRAPH_PROXY_SCOPE` | `api://<VITE_CLIENT_ID>/access_as_user` | The proxy's exposed scope; only needed when the proxy is a separate registration |
| `VITE_LOCAL_AUTH_URL` | unset | **Dev server only** (ignored by every build): the local stack's fake Entra, e.g. `http://127.0.0.1:7080`. Skips MSAL and takes the caller token from there, so the real UI runs against the local proxy with no tenant. Needs `VITE_GRAPH_PROXY_URL` |

### Mock flag — `VITE_USE_MOCK`

When `VITE_USE_MOCK=true`, the app runs on built-in fixture data with **no MSAL
and no auth config** — no Entra ID tenant required. This is the mode used by the unit tests and Playwright
e2e. See `.env.example`.

### Mock scenario — `VITE_MOCK_SCENARIO`

Mock mode serves one of five fixture tenants so every caveat state can be seen and demoed
without a live tenant. Ignored unless `VITE_USE_MOCK=true`; an unrecognised value falls back to
`healthy`.

| Value | Tenant |
|---|---|
| `healthy` (default) | Estimated entitlement, steady growth, ~2,500 sites |
| `over-entitlement` | Already using more than the estimated entitlement — no exhaustion date to project |
| `concealed` | Report names concealed in the Microsoft 365 admin centre — the banner explains the hashes |
| `short-history` | Fewer than six months of trend data — no forecast, explicitly not an all-clear |
| `onedrive-over-licence` | Four OneDrives raised past the 5 TB an E3/E5 licence includes — the OneDrive report's over-licence list |

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
6. Go to **API permissions > Add a permission > Microsoft Graph > Delegated permissions** and add `User.Read` and `Reports.Read.All` — and, optionally, `Organization.Read.All` (tenant name, licence-based entitlement and OneDrive storage per user) and `Sites.Read.All` (site names). The app requests `.default`, so it uses exactly what is listed here and still works without the optional two.
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
not return — a deleted site, one the signed-in user cannot open, or every site when the
registration has no `Sites.Read.All` — is shown by its site id, never by its owner.

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

## Two deployments: application or delegated permissions

The permission model is chosen by the env, per deployment — there is no switch in the UI:

| | Application permissions | Delegated permissions |
|---|---|---|
| Env | `VITE_GRAPH_PROXY_URL` set (+ `VITE_CLIENT_ID` = the Storage Analyser registration, the default) | `VITE_GRAPH_PROXY_URL` **unset**, `VITE_CLIENT_ID=0cedd025-e545-44f2-b3f8-82969e56547a` |
| Graph is read by | the proxy (`functions/`), app-only, certificate | the browser, as the signed-in user |
| Token the SPA asks for | the proxy scope `api://<client id>/access_as_user` | `https://graph.microsoft.com/.default` |
| Who can open the report | any signed-in user once an admin consented | a user holding a role Microsoft gives detailed usage reports to, such as Reports Reader, SharePoint Administrator or Global Administrator (Global Reader sees tenant totals only) |
| Deployed at | <https://p365lite.z33.web.core.windows.net/> — storage static website `p365lite` (`site-application` job) | <https://gray-water-0a8893303.1.azurestaticapps.net> — Static Web App `p365-lite`, the main site (`site` job) |

The delegated path asks for **`.default`**: the token carries whatever delegated permissions the
registration was granted, and nothing more is ever requested. So a registration without
`Sites.Read.All` (or `Organization.Read.All`) still signs in and loads the report — the site-name
lookups are refused with `403`, which the report treats as "no name" and shows each site by its id;
without `Organization.Read.All` the licence-based entitlement and the OneDrive storage per user are unknown. Only `Reports.Read.All`
is required. The registration must list the deployment's origin as a **SPA redirect URI**.

As of 2026-09-29 `0cedd025-…` (*Proventeq365 - Storage Analyser - Delegated*) grants delegated
`User.Read`, `Reports.Read.All` and `Organization.Read.All` — **no `Sites.Read.All`**, so that
deployment names only the sites the signed-in user can open and shows the rest by id — and lists `https://p365lite.z33.web.core.windows.net/` and the
`p365-lite` Static Web App as redirect URIs. A new host needs someone with write access to the
registration to add it first (`Authorization_RequestDenied` otherwise).

## Help centre

`/help` (e.g. <https://gray-water-0a8893303.1.azurestaticapps.net/help>) is a full help centre:
getting started (enabling access, permissions, limiting who can sign in, troubleshooting every
failure screen), a page per report section, and reference pages (settings, how each figure is
calculated, site names, data and privacy). It has a sidebar, search (`/` focuses it),
breadcrumbs, an on-page outline and previous/next links. It needs no sign-in: `main.tsx`
renders it before MSAL is ever created.

Setup pages show the steps for the site's own permission mode, with its admin consent link; a
switch at the top right of the page shows the other mode (`?audience=application` or
`?audience=delegated`). Every report section has a **?** with a one-line explanation and *See
more*; the ⋯ menu has **Help**; every screen a visitor can land on when access is missing links
to troubleshooting.

The pages are markdown in [`docs/help/`](docs/help/README.md) — update them with every
user-visible change. They are also published for agents as `/llms.txt`, `/llms-full.txt` and each page's markdown
at its source path under `/help/` (`/help/reports/storage-optimisation/index.md`, …), so the pages' relative
links still resolve. Both hosts serve `.md` and `.txt` as UTF-8 text: `staticwebapp.config.json`
`mimeTypes` on the Static Web App, explicit `--content-type` uploads in `deploy.yml` on the storage
website.
The renderer, `src/help-center/`, has no dependency on this app and can be reused on another
site (see its README).

### Setting up a tenant

Nothing needs changing on Proventeq's side for a new tenant: both registrations are multi-tenant,
publisher-verified ("Proventeq Ltd") and list both sites as SPA redirect URIs. Everything below is
done by the customer's administrator. The admin consent link is on each site's `/help/getting-started/enable-access` page.

**Application permissions** — <https://p365lite.z33.web.core.windows.net/>

1. A Global Administrator (or Privileged Role Administrator) opens
   `https://login.microsoftonline.com/organizations/adminconsent?client_id=84e24db0-8904-41f8-8556-14a2b6863b1a&redirect_uri=https%3A%2F%2Fp365lite.z33.web.core.windows.net%2F`,
   signs in and selects **Accept**. This grants `Reports.Read.All` and `Organization.Read.All` as
   application permissions.
2. Optional, for site names — grant `Sites.Read.All` too (a Global Administrator, in Graph
   PowerShell):

   ```powershell
   Connect-MgGraph -Scopes "AppRoleAssignment.ReadWrite.All","Application.Read.All"
   $app   = Get-MgServicePrincipal -Filter "appId eq '84e24db0-8904-41f8-8556-14a2b6863b1a'"
   $graph = Get-MgServicePrincipal -Filter "appId eq '00000003-0000-0000-c000-000000000000'"
   New-MgServicePrincipalAppRoleAssignment -ServicePrincipalId $app.Id -PrincipalId $app.Id `
     -ResourceId $graph.Id -AppRoleId 332a536c-c7ef-4017-ab91-336970924f0d
   ```

   Without it every site is listed by its id; with it the proxy names every site in one pass.
3. Optional — allow only some groups (see *Limiting who can open the report*).
4. Anyone allowed opens the site and signs in. No directory role is needed.

**Delegated permissions (the main site)** — <https://gray-water-0a8893303.1.azurestaticapps.net>

1. A Global Administrator opens
   `https://login.microsoftonline.com/organizations/adminconsent?client_id=0cedd025-e545-44f2-b3f8-82969e56547a&redirect_uri=https%3A%2F%2Fgray-water-0a8893303.1.azurestaticapps.net%2F`,
   signs in and selects **Accept**. This grants the delegated `Reports.Read.All`,
   `Organization.Read.All` and `User.Read`. Until then everyone stops at "Your organisation has
   not approved this app yet".
2. Every person who opens the report holds Reports Reader (the least privilege), Global Reader,
   SharePoint Administrator or Global Administrator: **Entra admin center → Roles & admins →
   Reports Reader → Add assignments**.
3. They open the site and sign in. The delegated registration does not ask for `Sites.Read.All`,
   so a site is named only when the signed-in user can open it; the rest are listed by id. On
   proventeqe5 that named 31 of the 50 largest sites for a Reports Reader (2026-10-01).

### Limiting who can open the report

Any user of a consented tenant can sign in by default. To allow only some groups, the tenant's
admin sets it in Microsoft Entra — nothing in this app or its deployment changes:

1. **Entra admin center → Enterprise applications** → the app with the site's Application ID
   (`84e24db0-8904-41f8-8556-14a2b6863b1a` for application permissions,
   `0cedd025-e545-44f2-b3f8-82969e56547a` for delegated).
2. **Properties → Assignment required? → Yes**, save.
3. **Users and groups → Add user/group**, pick the groups or users.

Group assignment needs Entra ID P1/P2 (free tier: users one by one) and does not reach nested
groups. Anyone unassigned is refused at sign-in with `AADSTS50105`; if that error comes back to
the app, `AuthErrorScreen` shows "Your account is not allowed to use this app" and links `/help/getting-started/troubleshooting`,
which carries the same steps. With application permissions this limits who sees the report, not
what the proxy can read.

### Delegated: consent vs role

On the delegated site the app checks the scopes MSAL says the token carries. Without
`Reports.Read.All` (the tenant never admin-consented the delegated registration) it refreshes the
token once — a grant made after sign-in shows up without signing out — and otherwise shows the
admin-consent screen before calling Graph. Graph's own 403 is then left to mean what it says: the
user lacks a reporting role.

Sign-in asks for the token audience straight away (`loginRequest()`: `.default` on the delegated
site, the proxy scope on the application site), so a user of a consented tenant sees one prompt,
not a sign-in prompt followed by a second one for the report.

### After access is granted

A refused report does not stay refused. While the report shows a consent, tenant or role failure,
it asks again every 30 seconds and whenever the tab regains focus, so a grant made in another tab
or by another administrator shows up without a reload. The admin-consent link returns to the site
with `?admin_consent=True`; `main.tsx` strips the response from the address and records the grant
for the tab, and for the next two minutes a consent refusal shows the loading screen and is
retried every 3 seconds while Entra propagates the grant. Once the report loads, every other query
(the tenant name in the header among them) is fetched again.

## Hiding names

`?hideNames=true` (or `VITE_HIDE_NAMES=true` at build time) masks identities for the rest of the
tab, including across the sign-in redirect; `?hideNames=` or `?modes=reset` shows them again. It is
the one URL override that works on a locked deployment, because it can only take information away.
With names hidden:

- site ids and OneDrive account names become a stable 16-hex pseudonym, owners become initials
  (`Ada Lovelace` → `A.L.`), and site links are removed;
- the site-name lookups (`sites/delta`, `/sites/{id}`) are not made at all;
- a banner above the tables says names are hidden; every storage figure is unchanged.

The masking happens in the browser, the moment each report response arrives and before anything
is parsed, cached, shown or searchable. The raw Graph response is still visible in the browser's
network tab, so this hides names from the screen (a demo, a screen share) — not from the person
signed in. Masking inside the proxy, so the names never reach the browser on the application path,
is not built yet.

A site is never named after its owner: with no name and no URL, a row shows its site id.

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
| `scenario` | `healthy` / `over-entitlement` / `concealed` / `short-history` / `onedrive-over-licence` | `/?mock=true&scenario=concealed` |
| `hideNames` | `true` | `/?hideNames=true` (mask names; see *Hiding names*) |
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
those reports are routable. The menu is a flag of its own, `app.menu`, and it is **off
unless it is asked for** — from the env or from `?features=`. With it off there is no
hamburger and the side menu is not mounted at all, however many reports are enabled; with
it on and two or more reports enabled, the hamburger opens the side menu of them. The root
path falls back to the first enabled report. The OneDrive Usage report is the proof of
concept for a second report and reuses the same model and data. Beside the largest drives and
every drive, it lists the **OneDrives over their licensed storage**: accounts holding more than
any licence in the tenant includes per user — 5 TB where the tenant has five or more E3/E5-class
licences (SharePoint or OneDrive Plan 2), 1 TB on Business plans, 2 GB on frontline. Microsoft
does not report which licence each user holds, so the most generous plan present sets the line
and only drives no licence could cover are listed; with the licences unreadable, or none of them
carrying a known OneDrive allowance (education, developer and add-on plans), the figure is *Unknown*, never a guessed 1 TB. The storage report shows the same count as *Drives over licence*.

**Report settings** opens a dialog with the cost per GB per month (with the currency
picked from a list), the SharePoint entitlement in TB and the OneDrive storage per user in GB —
each shows its licence estimate as the hint so the admin knows what they are replacing. Settings live in the browser's
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

The live sites are on Azure (see *Where it lives*); Vercel no longer serves the app. Any build can
also be served by hand from an Azure Storage **static website** in the same resource group as the
Graph proxy — useful for checking a branch against a real tenant without touching the live sites.
No script, and nothing here is specific to a branch:

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
green** on that commit (`workflow_run`), and it can be run by hand from the Actions tab. Three
jobs, all from the exact commit CI tested:

| Job | What it deploys | Where |
|---|---|---|
| `proxy` | `functions/`, built and pruned to production dependencies | the Function App, `Azure/functions-action` with `sku: flexconsumption` |
| `site` | `npm run build` output with **no proxy** and `VITE_CLIENT_ID` = `vars.VITE_DELEGATED_CLIENT_ID`, defaulting to `0cedd025-e545-44f2-b3f8-82969e56547a`, plus the repo variables `VITE_FEATURES`, `VITE_MODES_LOCKED` — **delegated permissions, the main site** | the Azure Static Web App `p365-lite` (<https://gray-water-0a8893303.1.azurestaticapps.net>), `Azure/static-web-apps-deploy` |
| `site-application` | the same build with the repo variables `VITE_GRAPH_PROXY_URL` and `VITE_GRAPH_PROXY_SCOPE` — **application permissions** | the storage static website `p365lite` (<https://p365lite.z33.web.core.windows.net/>, account overridable with `vars.AZURE_STORAGE_ACCOUNT`), uploaded with the repo secret `AZURE_STORAGE_SAS` — a SAS on the `$web` container only, expiring 2027-09-29, so no Entra role is involved |

The first job checks what each deploy needs and skips a job whose secret is absent, with a note
in the run summary rather than a failure. The **site** needs only the repo secret
`AZURE_STATIC_WEB_APPS_API_TOKEN` (the Static Web App's deployment token — no Entra role), so it
deploys on every green `main`. `public/staticwebapp.config.json` gives it deep-link fallback, a
Content-Security-Policy limited to Entra, Graph and the proxy, HSTS and `frame-ancestors 'none'`
— headers the old storage-account host could not send. A new site origin must be added to the
proxy's `PROXY_ALLOWED_ORIGINS` **and** its platform CORS list, to the CSP's `connect-src` if it is
a new proxy, and as a SPA redirect URI on the registration.

**The proxy still needs credentials the repo does not have yet**, so its job stays inert until
someone configures them.

### Pull request previews

`.github/workflows/preview.yml` builds every pull request from this repository in **mock mode**
(the Contoso demo tenant, `VITE_USE_MOCK=true`) and uploads it to a staging environment of the
Static Web App `p365-lite`; the action comments the preview URL on the PR and removes the
environment when the PR closes. Previews never sign in: Entra does not accept wildcard SPA
redirect URIs, and every PR gets its own host. `?scenario=` still switches the mock tenant (see
*Modes*). The Free plan holds three staging environments at a time, so a fourth open PR's preview
fails until one closes — it is not a required check.

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
reads `VITE_GRAPH_PROXY_URL`, `VITE_GRAPH_PROXY_SCOPE`, `VITE_FEATURES` and `VITE_MODES_LOCKED`
from repository variables, so the Azure-hosted copy is configured without touching the code.

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
  data/          # live.ts (the five Graph calls), fixtures.ts (five mock tenants + DataSource interface)
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

1. In live mode, `MsalAuthProvider` initialises the MSAL singleton and `MsalAuthHandler` gates the app — with no signed-in account it calls `loginRedirect(loginRequest())`, asking for the report's scopes in the same prompt.
2. `useStorageOverview` issues the five Graph calls once — SharePoint site detail, OneDrive account detail, both 180-day storage trends and the subscribed SKUs — plus `/organization` for the header. The `/reports/*` functions are read from the `/beta` endpoint, which is the only one that serves them as JSON.
3. The parsed inputs go through `buildStorageOverview`, which produces every figure the screen shows. Sections render the model; none of them compute a number.
4. The Graph scopes are consented on the first token round-trip, so an unconsented organisation fails there with `AADSTS65001`: `MsalAuthHandler` keeps the error object and `AuthErrorScreen` shows the Global Administrator action with the admin-consent link (built for the multi-tenant `organizations` endpoint, `redirect_uri` included). Once signed in, a failed Graph call is classified the same way in `AccessFailure`: consent error → consent screen; the proxy's `TenantNotAllowed` → the tenant screen, which says no role or consent will change it; any other authorisation failure → the role screen; anything else → the generic error state.
