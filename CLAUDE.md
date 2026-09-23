# CLAUDE.md

Guidance for working in this repo. See `README.md` for setup/permissions and
`docs/superpowers/specs/2026-09-02-m365-storage-overview-design.md` for the
approved design. The older specs are history: they describe an Azure estate
dashboard and a virtualised table, and the table is paginated.

## What this is

A React 19 + TypeScript + Vite 8 SPA that renders **one report** —
a sneak-peek of the Proventeq 365 storage-optimisation report — from a Microsoft
365 tenant's own Graph usage reports. Three sections (Current storage
distribution · Future state & growth impact · Main offenders) under a KPI row.
No lead capture, no telemetry. By default nothing leaves the browser; with
`VITE_GRAPH_PROXY_URL` set the browser's Graph calls go through `functions/`,
an Azure Functions proxy that signs them app-only (certificate) for the
signed-in admin's tenant — see `functions/README.md`. The UI is
a light, **Proventeq-branded**, chart-led page built on **Tailwind v4 + shadcn/ui**.

## Architecture (layers)

- `src/auth/` — MSAL (getMsalInstance singleton, redirect login, token acquire).
  One token audience at a time: `tokenScopes()` is `GRAPH_SCOPES` when the
  browser calls Graph itself and `[<proxy scope>]` alone when
  `VITE_GRAPH_PROXY_URL` is set (`graphProxyOf(config)` in `appConfig.ts`), so
  proxy mode never asks the prospect for a delegated report scope.
  `localAuth.ts` is the dev-server-only third path: `env.localAuthUrl` (set
  from `VITE_LOCAL_AUTH_URL`, honoured only under `import.meta.env.DEV`) skips
  MSAL exactly like mock mode (`env.usesMsal` is the gate `main.tsx`, `Header`,
  `HeaderActions` and `adminConsent` use) and takes the caller token from the
  local stack's fake Entra. `MsalAuthHandler` keeps the auth
  error **object** and `AuthErrorScreen` turns `AADSTS65001` into the
  admin-consent screen — the consent round-trip happens on the first
  `acquireTokenRedirect`, before any Graph call, so `AccessFailure` alone
  would never see it. (`src/auth/*`, `src/clients/*` and `src/config/*` were once
  kept byte-identical with a `365-oversharing` sibling; that app is dropped.)
- `src/clients/` — `graphClient` fetch wrapper (`get`, `getAllPages`,
  `batchGet` over `$batch`) + `apiError`. It takes an **origin**
  (`https://graph.microsoft.com` or the proxy URL) and resolves paths against
  it: `/x` → `<origin>/v1.0/x`, `/beta/x` or `/v1.0/x` as given, absolute
  URLs untouched — so `live.ts` names `/beta/reports/…` and the same code
  runs against either. `ApiError` keeps the Graph-shaped `error.code`;
  `AdminConsentRequired` from the proxy counts as a consent failure. `ApiError.appOnly`
  marks a failure from the proxy origin: only there does `Authorization_RequestDenied`
  mean missing consent, and a 403 means a missing role only when it is delegated or the
  proxy's own `DirectoryRoleRequired`. An MSAL prompt for MFA or Conditional Access
  (`interaction_required`) is not a consent failure. A 429/503/504 — on the request or on
  a `$batch` sub-response — is retried after its `Retry-After` (default 2 s,
  capped at 60 s), up to `MAX_THROTTLE_RETRIES` times; only the throttled
  sub-requests of a batch are re-sent. Anything else surfaces as `ApiError`
  and is left to React Query's single retry.
- `src/data/` — `DataSource` interface (nine methods); `fixtures.ts` (four mock
  tenants: `healthy`, `over-entitlement`, `concealed`, `short-history`) +
  `live.ts` (the four usage reports on `/beta/reports`, period `D180`, plus
  `/subscribedSkus`, `/organization`, the `sites/delta` directory walk and the
  `$batch` site lookups).
- `src/reports/` — pure parsers per Graph response shape (`sharePointSites`,
  `oneDriveAccounts`, `storageTrend`, `licensing`, `org`, `siteDirectory`).
  The usage report returns a **blank `siteUrl` for every site** (Microsoft-side
  known issue). `DataSource.getSiteDetails(ids)` resolves display name +
  `webUrl` per site id through `graphClient.batchGet` (`$batch`, 20 GETs per
  POST, `Sites.Read.All`); the live source caches found and definitively
  missing (400/403/404) ids for the session and shares an in-flight lookup between
  overlapping callers, so the top-fifty naming and the first table page never
  ask Graph for the same site twice. **Never walk the tenant** (`/sites?
  search=*`, `getAllSites`) for this from the browser — it is O(all sites)
  and a 5M-site tenant is a design target. The one sanctioned walk is
  `DataSource.getSiteDirectory()`: `sites/delta` (app-only `Sites.Read.All`,
  so it needs the proxy) paged **at most `SITE_DIRECTORY_PAGE_LIMIT` × 500
  sites** and parsed by `parseDeltaSites`, which keys each entry by the
  site-collection id the usage report carries — the middle segment of Graph's
  composite id — and keeps the root web when subsites come back too. The cap is
  what makes it safe: a tenant larger than it is named as far as the cap
  reaches and the `$batch` path still covers whatever is on screen, so nothing
  is O(all sites). On proventeqe5 it names 98.8% of 1305 rows in one 1.7s walk
  where `$batch` alone named 50. It degrades to an empty directory on any
  `ApiError` (delegated mode has no app-only delta), never failing the report;
  a 403 is remembered for the session so a delegated token stops asking. Only
  the in-flight walk is shared, so Refresh data walks again.
  Two consumers: `data/namedSites.nameTopSites` names the
  fifty largest live sites before `buildStorageOverview` (so chart labels and
  the default first page are right), and `hooks/useSiteDetails` names the rows
  of whatever table page is on screen (skeleton while pending). Unresolved
  rows keep the owner-name / id fallback `rowName` / `rowLabel` provide.
  `useKnownSites` merges every `['siteDetails', …]` result already in the
  React Query cache, so a name the user has seen on any page is searchable.
  `DataProvider` picks the source — fixtures, the local-auth stack, or live —
  and `LiveDataProvider` is the ONLY component that calls `useMsal()` for data,
  so it must stay the only branch mounted inside `MsalProvider`; mock and
  local-auth modes are MSAL-free end to end (`main.tsx` gates on `usesMsal`).
- `src/model/storageOverview.ts` — `buildStorageOverview(inputs)`: **the** single
  derivation of every figure on screen. Pure, table-tested.
- `src/lib/` — `entitlement`, `forecast`, `cost`, `concealment`, `settings`,
  `topNWithOther`, `format`, `thresholds`, `rowSearch` (the table's search and
  sort, sized for millions of rows: one lower-cased key per row built once per
  data load, an index permutation per sort change, one `includes` per row per
  keystroke — `SiteTable` feeds it a `useDeferredValue` query so typing never
  waits on the filter; never put a `toLowerCase`, `Date.parse` or a sort back
  inside the per-keystroke path).
- `src/hooks/useStorageOverview.ts` — fetches the inputs once under
  `['storageInputs']` and rebuilds the model in `useMemo` when settings change.
  The ONLY data entry point for the page. `useLicenceEstimateBytes` selects just
  the licence estimate from the same query for the settings dialog, whose fields
  mount only while it is open, and never refetches on mount — opening the
  dialog must not re-issue the Graph calls or build the model a second time.
- `src/types/storage.ts` — `StorageOverview`, `StorageRow`, `Slice`, `GrowthPoint`.
- `src/config/featureFlags.ts` — `FeatureFlags` (dotted keys mirroring P365's
  `routing/featureFlags.ts`, e.g. `optimization.storage.report.overview`),
  `readFeatures(VITE_FEATURES)` (comma list, unknown flags dropped, unset =
  `DEFAULT_FEATURES` = the storage overview only). No backend, so the build
  config is the "licence".
- `src/features/registry.ts` — the **report registry**: `REPORTS` (id, path,
  title, icon, `requireFeature`, Component) and `enabledReports(features)`.
  `App.tsx` mounts one route per *enabled* entry plus a `*` fallback to the first
  enabled one (`NoReports` if none); `AppShell` shows the hamburger + menu only
  when `App.tsx` passes `menuEnabled` — the `app.menu` flag, which is **not** in
  `DEFAULT_FEATURES` — *and* more than one report is enabled. Adding a report = a
  flag in `FeatureFlags`, one entry here and one folder under `src/features/`.
- `src/features/oneDriveUsage/` — the proof-of-concept second report (KPI cards,
  top drives, drive table with the per-drive capacity column). Same
  `useStorageOverview` query, so switching reports never refetches.
- `src/features/storageOptimization/` — the report: `StorageOptimization.tsx`
  (page: skeleton / `AccessFailure` with retry / sections), `KpiCards`,
  `DistributionSection`, `GrowthSection`, `OffendersSection` (includes the
  paginated `SiteTable` and the concealed-names note), `AccessFailure` (consent
  vs role screens), `forecastCopy.ts` (P365's forecast headline/hint/callout
  logic; takes `t` because it runs outside React).
- `src/intl/en.json` + `src/hooks/useTranslation.ts` + `src/app/AppIntlProvider.tsx`
  — localisation exactly the way P365 does it: `react-intl`, one flat English
  catalogue with dotted keys and ICU `{values}`, `IntlProvider` at the root
  (mounted in `main.tsx` above the auth screens, muting MISSING_TRANSLATION),
  and `const t = useTranslation()` → `t('storageOptimisation.kpi.used')`.
  `TranslateKey` is `keyof typeof en.json`, so a typo is a type error. English
  only, no language switcher yet. `src/intl/catalogue.test.ts` fails on a key
  the source asks for but the catalogue lacks, and on a dead catalogue key —
  add the key and its use together. Non-component code (`forecastCopy.ts`,
  `ErrorState.describe`) receives `t` as an argument; the registry stores
  `titleKey`s and the menu resolves them.
- `src/design/` — the P365 design system: `theme.ts` (tokens mirrored as
  `--color-p365-*` in `index.css`, `monoColor` = P365's `monoColorByIndex`,
  `facetFill` = its teal tint cycle), `StatCard` (coloured left rail, value in
  the rail colour), `primitives.tsx` (`Section` with staggered `delay`, `Panel`,
  `MiniStat`, `SoftCallout`, `Pill`, `Legend`, `EmptyBlock`), `charts.tsx`
  (monochrome Recharts doughnut / line / bar + `FacetBars`), `AlertPanel`,
  `ReportHeading` (a report's title, description and "Data as of" line,
  dropped when the report carries no date),
  `AdornedInput` (prefix/suffix input), `DraftInput` (an
  `AdornedInput` that keeps what is typed as a draft, commits only valid
  input, marks the rest `aria-invalid` and reverts on blur), `ReportSkeleton`, `Logo` (inline SVG of
  the proventeq365 wordmark — the "365" glyphs are outlined paths, no font
  load), `DescribedMenuItem` (dropdown item with icon, label, description),
  `PoolIcon` (the SharePoint / OneDrive glyphs from P365's `sprite.svg`, teal,
  1.25rem), `ExternalUrlLink` (P365's teal path-only link, new tab).
  `ColumnHeaderTooltip` (P365's `headerWithTooltip`: a table header that
  explains its column on hover and keyboard focus; copy lives under
  `table.column.help.*`, the catalogue test reads `help: '…'` keys).
- `src/app/` — the shell: `AppShell` (sticky `Header` + optional `SideMenu`
  + `<main>`), `Header` (hamburger only when the menu is on, logo, tenant name
  from `useOrg` with skeleton / "Your tenant" fallback, `AccountChip` in live
  mode, `HeaderActions`), `HeaderActions` (the single `⋯` "Options" button: Base
  UI dropdown with `DescribedMenuItem`s — Refresh data (disabled + spinning while
  fetching), Report settings (opens `SettingsDialog`), and in live mode Switch
  account via `prompt: 'select_account'` and Sign out), `SettingsDialog`
  (controlled Base UI dialog: currency `Select`, cost per GB with symbol prefix,
  entitlement in TB with the licence estimate as hint), `SettingsProvider` /
  `useSettings` (localStorage-backed `ReportSettings` context; rate and
  currency are global, the entitlement override is stored per tenant under
  the organisation id `App` passes as `tenantKey`, so a switched account
  never inherits another tenant's figure), `SideMenu`
  (P365's `NavBarComponent` pattern: a navy panel that is always mounted and
  animates `width` 0 ↔ 17.5rem in 260ms `cubic-bezier(0.4,0,0.2,1)` with a
  fixed-width inner so it slides rather than reflows; the header hamburger
  toggles it with `aria-expanded`/`aria-controls`; from `lg` it is sticky and
  pushes `<main>`, below `lg` it overlays with a backdrop and closes after a
  link; `visibility` flips hidden after the slide so a closed menu is hidden
  to Playwright and assistive tech, and `inert` while closed), `AccountChip`
  (initials + name, username as title), `queryClient`.
- `src/components/` — `SiteTable` (generic `StorageRow` + `columns`, product
  styled; the name cell is P365's `EntityNameCell`: `PoolIcon` + bold name +
  `ExternalUrlLink` showing the URL path, opening the site in a new tab),
  `CaveatBanner`, `ErrorState`; `ui/` (shadcn on Base UI: button, select,
  dropdown-menu, dialog, skeleton, …).
- `src/config/env.ts` — `VITE_USE_MOCK`, `VITE_MOCK_SCENARIO`, `VITE_FEATURES`
  (parsed once into `env.features`), overlaid with `src/config/modes.ts`: the
  search params `features`, `mock`, `scenario` (persisted per tab in
  sessionStorage under `m365-overview:modes`; empty value clears one,
  `?modes=reset` clears all). `VITE_MODES_LOCKED=true` ignores the overrides —
  it is the only switch the URL cannot change, and `readEnv(source, overrides)`
  applies the lock, so a test can never sneak past it. `env` is still a module
  constant evaluated once at load.

## Rules most likely to be broken by a future change

- **Sections consume `buildStorageOverview` and nothing else.** A number a
  section needs (e.g. `offenders.topSites`, `sharePoint.licenceEstimateBytes`)
  is added to the model with a test, never derived in a component.
- **The UI copies P365, it does not restyle it.** Colours, sizes and layout come
  from `Frontend/src/components/styles/themes.ts` and
  `features/storageOptimization/styles.ts` in the P365 repo (tokens mirrored as
  `--color-p365-*` in `index.css`); check the live page on dev-p365 before
  "improving" anything. Nothing mirrored from P365 may be decorative: no
  placeholder navigation, no fake entries — the menu lists `REPORTS` only.
- **Every clickable shows a pointer** — `index.css` sets it in `@layer base` for
  buttons, links, options and comboboxes; do not add `cursor-default` back.

- **SharePoint per-site `storageAllocatedInBytes` is the 25 TB site-collection
  maximum. Never sum it, never take a percentage of it. OneDrive per-drive
  allocation IS the real per-user cap and a percentage of it is meaningful — do
  not "fix" one by analogy with the other.**
- **Unknown entitlement produces `null`, never `0`. Any `?? 0` on
  `entitledBytes`, `remainingBytes`, `usedPercentage` or `overageBytes` is a
  defect.** The cost figures are the exception and are never null: P365 prices
  growth from the growth rate alone, so an unknown entitlement does not stop
  `cost.growthAnnual` / `cost.cumulativeYear3` being real numbers.
- **Components do no arithmetic. If a section needs a number, add it to
  `buildStorageOverview`.** That includes clamps (`remainingBytes` is already
  ≥ 0, as P365's backend returns it), grades (`sharePoint.utilization`), the
  offenders' top-N and retained totals (`overview.offenders`), and display
  names (`lib/rowName.ts`, shared with `SiteTable`).
- **Exhausted is a state, not a date.** Used ≥ entitled ⇒ `forecastStatus`
  `Critical`, `forecastMonthsToExhaustion` `0`, `forecastExhaustionDate`
  `null` — decided before the history check, exactly as P365's
  `ForecastExhaustion` does. A date of "today" for an over-entitlement tenant
  is the bug this rule exists to stop; the "already exceeded" copy only renders
  on that triple.
- `growth.windowMonths` counts the month-to-month deltas the rate was measured
  over (`buckets - 1`), which is what "Added last N mo" labels; the six-month
  history gate still counts buckets.
- SharePoint and OneDrive are two pools. Never put a OneDrive-inclusive numerator
  over a SharePoint-only denominator.
- Growth is measured from the trend report, never reconstructed from site rows.
  Under six months of history → no forecast, and the copy says that is not an
  all-clear.
- The entitlement estimate is P365's `TenantEntitlementCalculator`, ported to
  `lib/entitlement.ts`: a SKU contributes storage only by the **service plans**
  it carries (`SHAREPOINTSTANDARD`/`ENTERPRISE` family and Visio/Project
  companions → 10 GiB, `SHAREPOINTSTORAGE` add-on → 1 GiB, OneDrive standalone
  → 0.5 GiB). Never fall back to "10 GB per SKU": `subscribedSkus` carries
  sentinel seat counts (10,000 / 1,000,000 / 10,000,000) on free and trial
  SKUs, and pricing them by part number produced a 127,743 TiB "entitlement"
  on a real tenant. Those SKUs carry no storage plan, so the allowlist alone
  handles them.
- Every user-facing string, colour rule and card state comes from P365's
  `features/storageOptimization` (`storageFormat.ts`, `forecastCallout.ts`,
  `intl/en.json` under `storageOverview.*`). Change the wording there first, or
  not at all; `src/intl/en.json` mirrors it. **Pricing mirrors P365 exactly**:
  the rate default is 0.02 GBP/GB/month (`lib/settings.ts`), which is
  `StorageOverviewService.DefaultCostRatePerGbPerMonth` — there is no
  `StorageOptimisationOptions` class, an earlier note here claimed one. The
  cost of doing nothing is the whole projected growth
  (`annualGrowthGb × rate × 12`), never gated on headroom or on the
  entitlement being known; the three-year figure prices each year at its
  **mid-year** volume (`growthGbPerYear × (year − 0.5)`), summed. An earlier
  version of this report charged only the growth that overflowed the
  entitlement and split every figure into notional and billable — it produced
  a different number from P365 on the same tenant, which is the bug this rule
  exists to stop.
- Settings (rate, currency, override) are **not** part of the React Query key.
  Putting them there refetches five Graph reports and unmounts the header on
  every keystroke; the integration test pins this.

## The Graph proxy (`functions/`)

A separate npm package (Azure Functions v4, Node, ESM, `jose` for JWT
verify/sign): `src/proxy/handler.ts` is the pure pipeline — CORS → verify the
caller's Entra token (aud/scope/issuer, tenant from `tid`; a directory-role
check on `wids` only when `PROXY_REQUIRED_DIRECTORY_ROLES` asks for one —
**off by default**, because P365 gates the same report on licence, not role,
and demanding one refused accounts that use P365 itself) →
allowlist (`allowlist.ts`: routes × query options, `$batch` rebuilt from
validated parts) → per-tenant app token via certificate client assertion
(`appToken.ts`, cached) → relay with `nextLink`/`deltaLink` rewritten to the
proxy (`forward.ts`). `src/functions/graphProxy.ts` is the thin Azure adapter.
`local/` holds a fake Entra (verifies the assertion signature + `x5t`) and a
fake Graph; `npm test` runs the handler end to end on them, `npm run local`
(`-- --func` for the Core Tools host) + `npm run smoke` exercise every SPA
call, and the SPA runs against it with `VITE_GRAPH_PROXY_URL` +
`VITE_LOCAL_AUTH_URL`. Adding a Graph call to the app = adding its route to
`ALLOWED_ROUTES` (with a test in `allowlist.test.ts`) and to `fakeGraph.ts`.
Root vitest excludes `functions/`; root oxlint covers it; CI runs its
typecheck · test · build as a separate job.

## Commands

- `npm run dev` — live mode (needs Entra config).
- `VITE_GRAPH_PROXY_URL=http://127.0.0.1:7071/api/graph VITE_LOCAL_AUTH_URL=http://127.0.0.1:7080 npm run dev`
  — live data path through the local proxy stack (`npm run local` in
  `functions/` first), no tenant.
- `VITE_USE_MOCK=true npm run dev` — **mock mode on :5173**, no auth, fixture
  data. Add `VITE_MOCK_SCENARIO=concealed` (or `over-entitlement`,
  `short-history`) for the other tenants. This is also what the e2e webServer runs.
- `npm run lint` (oxlint) · `npm run typecheck` (tsc -b) · `npm run test`
  (vitest) · `npm run build` · `npm run e2e` (playwright, mock mode).
- `VITE_USE_MOCK` is a **build-time** flag; a normal `npm run build` produces a
  LIVE build (would gate on MSAL) — screenshot/preview from the mock dev server,
  not `dist`.

## Design system / brand

- Palette = P365's `themes.ts`, held in `P365` in `src/design/theme.ts` and
  mirrored as `--color-p365-*` in `index.css`: navy `#0f2c3d`, blue `#16475c`,
  teal `#34a1a0` (primary), red `#f94545`, orange `#f97f50`, yellow `#edba20`,
  green `#82bc17`; page `#f9fafb`, cards white. Typeface **Open Sans**
  (self-hosted, `@fontsource/open-sans`). Light theme only.
- Charts are monochrome, as in P365: `monoColor` (`monoColorByIndex`) and
  `facetFill` in `src/design/theme.ts`, used by `src/design/charts.tsx`.
- Two gradings, kept apart on purpose: `src/lib/thresholds.ts` grades
  *utilisation* (watch ≥85% / attention ≥95%) once, in the model
  (`sharePoint.utilization`), and both the used-KPI dot and the quota gauge
  take that grade — the gauge never grades itself; `src/lib/forecast.ts`
  grades *runway* (Critical <12 months / Warning <36) and drives the forecast
  badge. They answer different questions.

## Tailwind v4 + shadcn gotchas (learned the hard way)

- **shadcn CLI now generates Base UI primitives, not Radix** (`@base-ui/react/*`).
  APIs differ from Radix-era shadcn docs:
  - `Select.Root` `onValueChange` is `(value: string | null, eventDetails) => void`
    — wrap it: `onValueChange={(v) => setX(v ?? '')}`.
  - `Progress` (Base UI) manages its own `role="progressbar"`/`aria-*`. Do NOT
    spread `role`/`aria-valuenow` onto it. For custom meters render a plain
    `<div role="progressbar" aria-valuenow=... aria-label=...>`.
- **Tailwind v4 only emits a color utility if the token is registered under
  `--color-*` in `@theme`.** shadcn's `:root` tokens (`--muted`, `--primary`,
  `--card`, `--accent`, `--popover`, `--secondary`, `--destructive`, `--border`…)
  MUST be mapped via an `@theme inline { --color-muted: var(--muted); … }` block,
  or `bg-muted`/`text-muted-foreground`/`bg-primary`/`bg-card`/`border-border`
  etc. silently produce NO CSS (build stays green, UI is under-styled). Brand
  tokens go in `@theme`; shadcn tokens are bridged in `@theme inline`. Bare
  `border`/`outline` need a default: `* { border-color: var(--border) }`. All of
  this lives in `src/index.css` — verify utilities emit by grepping built
  `dist/assets/*.css`.
- **TS 6.0.3 rejects `baseUrl`** (TS5101 — deprecated). The `@/` alias works from
  `paths` in tsconfig + `resolve.alias` in `vite.config.ts`/`vitest.config.ts`
  alone; don't add `baseUrl`.

## Auth screens use plain CSS classes

`src/auth/MsalAuthHandler.tsx` and `AuthLoadingScreen.tsx` (untouchable in UI
work) render `className="error-state*"` and `className="auth-screen*"`. Those
rules MUST remain in `src/index.css` — a full index.css rewrite once dropped
`.auth-screen*` and left the live-mode loading screen unstyled. If you prune
legacy CSS, keep any class still referenced by `src/auth/*`.

`index.html` carries a copy of the `.auth-screen*` rules inline (the boot card
that shows before the JS bundle arrives, with the ring spinner and the
logo). It cannot import `index.css`, so a change to those rules — colours,
sizes, the spinner animation — has to be made in both places, and the boot-shell
e2e (`javaScriptEnabled: false`) is what catches a drift in the markup.

## Chart data typing

Recharts wrapper `data` props are typed `Record<string, unknown>[]`. TS
**interfaces** (`GrowthPoint`) are NOT assignable to that (no implicit index
signature). Convert with `data={points.map(p => ({ ...p }))}` (anonymous
objects) — no cast. Wrappers accept an optional `valueFormatter?: (v:number)=>string`
for byte/number axis + tooltip formatting; the number axis is `XAxis` when
`horizontal` (BarBreakdown default), else `YAxis`.

## Testing / e2e conventions

- shadcn `Card` renders `data-slot="card"`. `StatCard` nests label and value as
  **siblings** — scope assertions with `getByText(label).closest('[data-slot="stat-card"]')`.
- Every chart wrapper takes an `ariaLabel` and renders `role="img"` — always pass
  it from call sites; the e2e suite asserts every `role="img"` has a name.
- `SiteTable` is paginated (`hooks/usePagination.ts` owns the page window maths,
  `design/Pagination.tsx` is the generic footer; 50/100/250/500 rows like P365).
  Search and sort changes go back to page one. Rows render plainly, so no jsdom
  layout stubs are needed in tests.
- Graph's site usage report can return an empty Site URL for every site (the
  proventeqe5 tenant does). `lib/rowName.ts` then names the row by its owner and
  shows the site id underneath (`rowDetail`), and chart labels append the short id
  (`rowLabel`) so same-owner sites stay distinguishable; search matches the id too.
- Component tests import `render` from `@/test/render`, not from
  `@testing-library/react`: it wraps the tree in `AppIntlProvider` (a bare
  render of anything that calls `useTranslation()` throws). The same module
  exports `translate`, a non-hook `t` for pure helpers (`forecastCopy.test.ts`).
- `SettingsDialog` reads and writes through `useSettings()` — tests render it
  with `open` inside `SettingsProvider` (+ `QueryClientProvider` +
  `DataSourceContext`, it shows the licence estimate) and observe via a probe
  component or `localStorage`. App-level tests reach it through the `Options`
  button → `menuitem` "Report settings" (`chooseOption` helper).
- Base UI `Select`, `Menu` and `Dialog` work under jsdom with `userEvent`: click
  the trigger, then `await screen.findByRole('menu' | 'option' | 'dialog')` —
  they mount asynchronously and are portalled, so query by `screen`, never by
  `container`. Menu items report `aria-disabled`, not `disabled`.
- `env` is a module constant — tests that need other flags mock `@/config/env`
  (see `App.routes.test.tsx`); `AppShell` takes `reports` as a prop so shell tests
  pass a list directly. The e2e config runs two dev servers (5006 default flags =
  one report, 5007 with both flags = menu) as two Playwright projects.
- Every new test is proven red by mutating the production line it names before
  it is committed. A test that survives the mutation is replaced, not kept.
- Keep these ARIA hooks (tests depend on them): `role="status"` on caveat
  banners and `SoftCallout`, `role="alert"` on `AlertPanel`, `aria-busy` on
  `ReportSkeleton`, `role="dialog"` on the reports menu and the settings dialog, `role="menu"` named "Options", real
  table semantics in `SiteTable`.

## Known deferred items

- Build emits a >500 kB chunk advisory (single bundle) — consider route-level
  code-splitting if it matters.
- oxlint reports 6 `only-export-components` fast-refresh warnings — 3 in the
  generated `src/components/ui/*`, 3 in the test helper `src/test/render.tsx` —
  cosmetic.
