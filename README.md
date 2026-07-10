# M365 + Azure Admin Dashboard

A browser-only SPA that surfaces Microsoft 365 and Azure operational data for tenant administrators. Built with React 19, TypeScript, and Vite.

## Sections

| Section | What it shows |
|---|---|
| **Overview** | Summary cards across all services |
| **SharePoint** | Site usage detail (storage, activity) |
| **Licensing** | Subscribed SKUs — consumed vs. available seats |
| **Estate** | Organisation info, active users, OneDrive storage, Teams activity |
| **Exchange** | Mailbox counts and email activity |
| **Azure** | Subscription resource inventory and month-to-date spend |

> **Billing note:** Real currency spend is sourced exclusively from Azure Cost Management (the Azure tab). The Licensing section reports seat consumption, not invoices or billing charges.

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

The app uses **MSAL with authorization-code + PKCE** and acquires two separate tokens: one for Microsoft Graph, one for Azure ARM.

1. In the [Azure portal](https://portal.azure.com), go to **Entra ID > App registrations > New registration**.
2. Enter a name (e.g. `M365 Overview`).
3. Under **Supported account types**, choose your tenant type (single-tenant is typical).
4. Under **Redirect URI**, select platform **Single-page application (SPA)** and enter the URI where the app is served (e.g. `http://localhost:5173/` for dev, your production URL for prod). This must match `VITE_REDIRECT_URI` in your `.env` (or Vercel env vars).
5. After creation, copy the **Application (client) ID** into `VITE_CLIENT_ID` and build `VITE_AUTHORITY_URI` as `https://login.microsoftonline.com/<directory-tenant-id>` in your `.env` (or Vercel env vars).
6. Go to **API permissions > Add a permission > Microsoft Graph > Delegated permissions** and add:
   - `User.Read`
   - `Reports.Read.All`
   - `Organization.Read.All`
7. Click **Grant admin consent** for the tenant: `Reports.Read.All` and `Organization.Read.All` require admin consent, while `User.Read` is consented by the signing-in user automatically.

---

## Azure RBAC requirements

The Azure section calls Azure Resource Manager on behalf of the signed-in user. The user needs the following roles on **each subscription** to be reported:

| Role | Purpose |
|---|---|
| **Reader** | List subscriptions and resource inventory |
| **Cost Management Reader** | Read month-to-date spend via Cost Management API |

These are standard built-in Azure RBAC roles. Assign them in **Azure portal > Subscriptions > Access control (IAM) > Add role assignment**.

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
| `e2e` | Run Playwright end-to-end tests (requires `npm run build` first or a running dev server) |

---

## Project structure

```
src/
  app/           # App shell: Layout, UserMenu, query client
  auth/          # MSAL: getMsalInstance, GRAPH/ARM scopes, tokens, MsalAuthProvider/Handler
  clients/       # graphClient, armClient — thin fetch wrappers
  config/        # env.ts (VITE_USE_MOCK build flag) + appConfig.ts (build-time VITE_* auth config)
  data/          # live.ts (real API calls), fixtures.ts (mock data + DataSource interface)
  hooks/         # React Query hooks per section
  reports/       # Pure parsers for each API response shape
  sections/      # Page components: Overview, SharePoint, Licensing, Estate, Exchange, Azure
  types/         # Shared TypeScript types (ReportPeriod, etc.)
  components/    # Shared UI components (ErrorState, charts, etc.)
  test/          # Test utilities and setup
e2e/             # Playwright end-to-end tests
```

---

## Authentication flow (summary)

1. In live mode, `MsalAuthProvider` initializes the MSAL singleton (`getMsalInstance()`) and `MsalAuthHandler` gates the app — if no account is signed in it calls `loginRedirect()` (redirect-based, no popup).
2. After sign-in, Graph calls use `GRAPH_SCOPES` (`User.Read`, `Reports.Read.All`, `Organization.Read.All`).
3. Azure ARM calls acquire a separate token with `ARM_SCOPES` (`https://management.azure.com/user_impersonation`).
4. Tokens are acquired via `acquireTokenSilent`, falling back to `acquireTokenRedirect` on `InteractionRequiredAuthError`/`BrowserAuthError`, and cached in `localStorage`.

If the signed-in user lacks the required Graph or ARM permissions, the affected section displays a permission error via the `ErrorState` component.
