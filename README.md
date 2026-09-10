# M365 Security & Oversharing sneak peek

A browser-only SPA that shows a Microsoft 365 tenant administrator their own **sharing exposure**, read live from Microsoft Graph with their delegated token. Built with React 19, TypeScript, and Vite.

**Nothing leaves the browser.** Every call is made client-side with the signed-in admin's token; no data is transmitted to or stored by Proventeq. There is no sign-up form, no lead capture, no analytics and no error reporting anywhere in the app, and fonts are self-hosted.

Seeded from [`proventeq-vercel/365-overview`](https://github.com/proventeq-vercel/365-overview) with history; that repo is kept as the `overview` remote and the shared foundation layers are cherry-picked between the two. See `CLAUDE.md`.

## The report

One route, one scrolling report:

| Section | What it shows |
|---|---|
| **Risk Summary** | Anyone links (high) - organisation-wide links (medium) - guest links and accounts (lower) |
| **Broad Sharing** | Content exposed to large or unintended audiences, each card graded by how much of the estate it covers |
| **External Access** | Guest accounts, top external domains, the measured D180 external-sharing trend, heaviest external sharers |
| **Sharing Posture** | The tenant settings that decide how bad the sections above can get |
| **Sites** | Every site, searchable and sortable on any column |

> **Honesty note:** counts taken from the Microsoft 365 usage reports are **links**, not files - Graph exposes no per-file link count. Anything Graph cannot measure is shown as *unavailable with the reason*, never as `0`. Capabilities that need full discovery (who holds Edit or Full Control, broken inheritance, unique/redundant/direct permissions, AI agents, and any remediation) are absent by design and named once at the foot of the report.

---

## Prerequisites

- **Node.js** 20 or later (LTS recommended)
- An **Azure Active Directory / Entra ID** tenant (unless running in mock mode)

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
| `VITE_CLIENT_ID` | Yes (live) | Application (client) ID from your Entra ID app registration |
| `VITE_AUTHORITY_URI` | Yes (live) | Full authority URL, e.g. `https://login.microsoftonline.com/<tenant-id>` |
| `VITE_REDIRECT_URI` | Yes (live) | OAuth redirect URI (SPA), e.g. `http://localhost:5173/` for dev |

MSAL is configured with `cacheLocation: localStorage` and uses **redirect-based**
login and token acquisition (`acquireTokenSilent` → `acquireTokenRedirect` on
interaction-required / browser-auth errors).

### Mock flag — `VITE_USE_MOCK`

When `VITE_USE_MOCK=true`, the app runs on built-in fixture data with **no MSAL
and no auth config** — no Entra ID tenant required, and the three `VITE_*` auth
vars above are not needed. This is the mode used by the unit tests and Playwright
e2e. See `.env.example`.

---

## Entra ID app registration

The app uses **MSAL with authorization-code + PKCE** and acquires one Microsoft Graph token. The registration is **multi-tenant** (`AzureADMultipleOrgs`, authority `https://login.microsoftonline.com/organizations`) with a verified publisher domain, so any prospect's Global Administrator can consent for their own tenant.

1. In the [Azure portal](https://portal.azure.com), go to **Entra ID > App registrations > New registration**.
2. Enter a name (e.g. `M365 Security & Oversharing`).
3. Under **Supported account types**, choose **Accounts in any organizational directory** (multi-tenant).
4. Under **Redirect URI**, select platform **Single-page application (SPA)** and enter the URI where the app is served (e.g. `http://localhost:5173/` for dev, your production URL for prod). This must match `VITE_REDIRECT_URI` in your `.env` (or Vercel env vars).
5. After creation, copy the **Application (client) ID** into `VITE_CLIENT_ID` and build `VITE_AUTHORITY_URI` as `https://login.microsoftonline.com/<directory-tenant-id>` in your `.env` (or Vercel env vars).
6. Go to **API permissions > Add a permission > Microsoft Graph > Delegated permissions** and add the scopes in `GRAPH_SCOPES` (`src/auth/msalConfig.ts`). All are read-only and granular - `Directory.Read.All` is deliberately not used:

   | Scope | Feeds |
   |---|---|
   | `User.Read` | Sign-in |
   | `Reports.Read.All` | Link counts per site, sharing activity, the external-sharing trend |
   | `Organization.Read.All` | Tenant name and verified domains (needed to tell internal from external) |
   | `User.Read.All` | Guest accounts, pending invitations, top external domains |
   | `Group.Read.All` | Public vs private M365 groups - sites open to the whole organisation |
   | `SharePointTenantSettings.Read.All` | Tenant sharing posture |
   | `Policy.Read.All` | Guest invite policy and guest access level |
   | `ReportSettings.Read.All` | Whether report names are concealed |

7. Click **Grant admin consent** for the tenant - every scope above except `User.Read` requires it. Consent is requested once at sign-in rather than incrementally, so a Global Administrator sees one screen, not two.

---

## Roles the signed-in admin needs

Consent is not enough: the usage reports are additionally gated on an Entra role, and **Global Reader and Usage Summary Reports Reader only see tenant-level data, without the per-site and per-user detail this report is built on**.

| Section | Needs |
|---|---|
| Links, sites table, sharers, trend | *Reports Reader*, *SharePoint Administrator* or *Global Administrator* |
| Guests, domains, public groups | Admin consent only (no extra role) |
| Sharing posture | *SharePoint Administrator* or *Global Reader* |

The single role that unlocks everything is **SharePoint Administrator**. Sections degrade independently - a Reports Reader still sees links, sites and the trend, with an *unavailable - needs SharePoint Administrator* panel where posture would be.

---

## Running the app

### Development (live tenant)

```bash
npm run dev
```

### Development (mock mode — no tenant required)

```bash
VITE_USE_MOCK=true npm run dev
```

Mock mode uses built-in fixture tenants. No Entra ID credentials are needed. This is the fastest way to explore the UI, and it is what sales can demo without a tenant.

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
| `e2e` | Run Playwright end-to-end tests (requires `npm run build` first or a running dev server) |

---

## Project structure

```
src/
  app/           # App shell: ReportShell (no sidebar), UserMenu, query client
  auth/          # MSAL: getMsalInstance, GRAPH_SCOPES, tokens, MsalAuthProvider/Handler
  clients/       # graphClient - thin fetch wrapper + apiError
  config/        # env.ts (VITE_USE_MOCK build flag) + appConfig.ts (build-time VITE_* auth config)
  data/          # live.ts (real Graph calls), fixtures.ts (mock tenants + DataSource interface)
  reports/       # Pure parsers, one per Graph response shape - no arithmetic
  model/         # The one pure function that computes the whole report
  sections/      # Oversharing report sections - presentation only, zero maths
  types/         # Shared TypeScript types
  lib/           # format, severity, domains, topNWithOther
  components/    # Shared UI components (SiteTable, ErrorState, charts, etc.)
  test/          # Test utilities and setup
e2e/             # Playwright end-to-end tests
```

---

## Authentication flow (summary)

1. In live mode, `MsalAuthProvider` initializes the MSAL singleton (`getMsalInstance()`) and `MsalAuthHandler` gates the app — if no account is signed in it calls `loginRedirect()` (redirect-based, no popup).
2. After sign-in, Graph calls use `GRAPH_SCOPES` (see the table above).
3. Tokens are acquired via `acquireTokenSilent`, falling back to `acquireTokenRedirect` on `InteractionRequiredAuthError`/`BrowserAuthError`, and cached in `localStorage`.

Missing consent and a missing role are different screens: an unconsented organisation (`AADSTS65001`) gets the Global Administrator action plus the admin-consent link, while a `403` names the exact role that section needs.
