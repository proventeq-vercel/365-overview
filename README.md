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

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|---|---|---|
| `VITE_AAD_CLIENT_ID` | Yes | Application (client) ID from your Entra ID app registration |
| `VITE_AAD_TENANT_ID` | Yes | Directory (tenant) ID |
| `VITE_AAD_REDIRECT_URI` | No | OAuth redirect URI — defaults to `window.location.origin` (e.g. `http://localhost:5173` for dev) |
| `VITE_USE_MOCK` | No | Set to `true` to use built-in fixture data; no Entra ID tenant needed |

---

## Entra ID app registration

The app uses **MSAL with authorization-code + PKCE** and acquires two separate tokens: one for Microsoft Graph, one for Azure ARM.

1. In the [Azure portal](https://portal.azure.com), go to **Entra ID > App registrations > New registration**.
2. Enter a name (e.g. `M365 Overview`).
3. Under **Supported account types**, choose your tenant type (single-tenant is typical).
4. Under **Redirect URI**, select platform **Single-page application (SPA)** and enter the URI where the app is served (e.g. `http://localhost:5173` for dev, your production URL for prod). This must match `VITE_AAD_REDIRECT_URI`.
5. After creation, copy the **Application (client) ID** and **Directory (tenant) ID** into your `.env`.
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
  app/           # App shell: LoginGate, Layout, query client
  auth/          # MSAL config — msalConfig, GRAPH_SCOPES, ARM_SCOPES
  clients/       # graphClient, armClient — thin fetch wrappers
  config/        # env.ts — reads VITE_* env vars with defaults
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

1. `LoginGate` wraps the app. If the user is not signed in, MSAL redirects to Microsoft login.
2. After sign-in, Graph calls use `GRAPH_SCOPES` (`User.Read`, `Reports.Read.All`, `Organization.Read.All`).
3. Azure ARM calls acquire a separate token with `ARM_SCOPES` (`https://management.azure.com/user_impersonation`).
4. Tokens are cached in `sessionStorage`.

If the signed-in user lacks the required Graph or ARM permissions, the affected section displays a permission error via the `ErrorState` component.
