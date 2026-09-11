# CLAUDE.md

Guidance for working in this repo. See `README.md` for setup/permissions and
`docs/superpowers/specs/` for the approved design.

## What this is

A browser-only React 19 + TypeScript + Vite 8 SPA that renders **one report** —
a sneak-peek of the Proventeq 365 storage-optimisation report — from a Microsoft
365 tenant's own Graph usage reports. Three sections (Current storage
distribution · Future state & growth impact · Main offenders) under a KPI row.
Nothing leaves the browser: no backend, no lead capture, no telemetry. The UI is
a light, **Proventeq-branded**, chart-led page built on **Tailwind v4 + shadcn/ui**.

## Architecture (layers)

- `src/auth/` — MSAL (getMsalInstance singleton, redirect login, token acquire).
  One token audience: `GRAPH_SCOPES` only.
- `src/clients/` — `graphClient` fetch wrapper + `apiError`.
- `src/data/` — `DataSource` interface (seven methods); `fixtures.ts` (four mock
  tenants: `healthy`, `over-entitlement`, `concealed`, `short-history`) +
  `live.ts` (the five Graph calls on `/beta/reports`, period `D180`).
- `src/reports/` — pure parsers per Graph response shape (`sharePointSites`,
  `oneDriveAccounts`, `storageTrend`, `licensing`, `org`).
- `src/model/storageOverview.ts` — `buildStorageOverview(inputs)`: **the** single
  derivation of every figure on screen. Pure, table-tested.
- `src/lib/` — `entitlement`, `forecast`, `cost`, `concealment`, `settings`,
  `topNWithOther`, `format`, `thresholds`.
- `src/hooks/useStorageOverview.ts` — fetches the inputs once under
  `['storageInputs']` and rebuilds the model in `useMemo` when settings change.
  The ONLY data entry point for the page.
- `src/types/storage.ts` — `StorageOverview`, `StorageRow`, `Slice`, `GrowthPoint`.
- `src/sections/StorageOptimization/` — shell (`index.tsx`), `ReportHeader`
  (settings popover), `KpiRow`, `DistributionSection`, `GrowthSection`,
  `OffendersSection`, `AccessFailure` (consent vs role screens), `copy.ts`
  (every user-facing string, P365 wording verbatim).
- `src/components/` — shared UI: `StatCard`, `SiteTable` (generic `StorageRow` +
  `columns`), `CaveatBanner`, `ErrorState`, `SkeletonCard`, `InsightCallout`;
  `charts/` (themed Recharts wrappers); `ui/` (shadcn primitives).
- `src/app/` — `Layout` (shell), `UserMenu`, `queryClient`.

## Rules most likely to be broken by a future change

- **SharePoint per-site `storageAllocatedInBytes` is the 25 TB site-collection
  maximum. Never sum it, never take a percentage of it. OneDrive per-drive
  allocation IS the real per-user cap and a percentage of it is meaningful — do
  not "fix" one by analogy with the other.**
- **Unknown entitlement produces `null`, never `0`. Any `?? 0` on
  `entitledBytes`, `remainingBytes`, `usedPercentage`, `growthBillableAnnual` or
  `cumulativeBillableYear3` is a defect.**
- **Components do no arithmetic. If a section needs a number, add it to
  `buildStorageOverview`.**
- SharePoint and OneDrive are two pools. Never put a OneDrive-inclusive numerator
  over a SharePoint-only denominator.
- Growth is measured from the trend report, never reconstructed from site rows.
  Under six months of history → no forecast, and the copy says that is not an
  all-clear.
- `subscribedSkus` carries sentinel seat counts (10,000 / 1,000,000 / 10,000,000)
  on free, viral and trial self-service SKUs. On a real tenant 12 of 30 SKUs had
  one, and billing them at 10 GB each produced a 127,743 TiB "entitlement".
  `SELF_SERVICE_UNIT_SENTINEL` in `lib/entitlement.ts` skips them; keep it.
- Settings (rate, currency, override) are **not** part of the React Query key.
  Putting them there refetches five Graph reports and unmounts the header on
  every keystroke; the integration test pins this.

## Commands

- `npm run dev` — live mode (needs Entra config).
- `VITE_USE_MOCK=true npm run dev` — **mock mode on :5173**, no auth, fixture
  data. Add `VITE_MOCK_SCENARIO=concealed` (or `over-entitlement`,
  `short-history`) for the other tenants. This is also what the e2e webServer runs.
- `npm run lint` (oxlint) · `npm run typecheck` (tsc -b) · `npm run test`
  (vitest) · `npm run build` · `npm run e2e` (playwright, mock mode).
- `VITE_USE_MOCK` is a **build-time** flag; a normal `npm run build` produces a
  LIVE build (would gate on MSAL) — screenshot/preview from the mock dev server,
  not `dist`.

## Design system / brand

- Palette (exact): teal `#34a1a0` (primary), coral `#f98d50`, sky `#2e9cc7`,
  amber `#eab000`, lime `#b1eb46`, ink `#0c2340`/`#16475c`; surfaces white /
  `#f7f8f9`. Typeface **Open Sans** (self-hosted, `@fontsource/open-sans`). Light
  theme only.
- Chart palette + shared config live in `src/components/charts/chartTheme.ts`
  (`CHART_COLORS` order = teal, coral, sky, amber, lime — stable across sections).
- Two gradings, kept apart on purpose: `src/lib/thresholds.ts` grades
  *utilisation* (watch ≥85% / attention ≥95%) and colours the gauge;
  `src/lib/forecast.ts` grades *runway* (Critical <12 months / Warning <36) and
  drives the forecast badge. They answer different questions.

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

## Chart data typing

Recharts wrapper `data` props are typed `Record<string, unknown>[]`. TS
**interfaces** (`GrowthPoint`) are NOT assignable to that (no implicit index
signature). Convert with `data={points.map(p => ({ ...p }))}` (anonymous
objects) — no cast. Wrappers accept an optional `valueFormatter?: (v:number)=>string`
for byte/number axis + tooltip formatting; the number axis is `XAxis` when
`horizontal` (BarBreakdown default), else `YAxis`.

## Testing / e2e conventions

- shadcn `Card` renders `data-slot="card"`. `StatCard` nests label and value as
  **siblings** — scope assertions with `getByText(label).closest('[data-slot="card"]')`.
- Every chart wrapper takes an `ariaLabel` and renders `role="img"` — always pass
  it from call sites; the e2e suite asserts every `role="img"` has a name.
- `SiteTable` is windowed with `@tanstack/react-virtual`; jsdom reports zero
  `offsetHeight`/`offsetWidth`, so tests that need rows to render stub both on
  `HTMLElement.prototype` (see `StorageOptimization.test.tsx`).
- Controlled inputs (`ReportHeader`) need a stateful harness in tests — a bare
  `vi.fn()` parent never re-renders, so the input never takes the typed value.
- Every new test is proven red by mutating the production line it names before
  it is committed. A test that survives the mutation is replaced, not kept.
- Keep these ARIA hooks (tests depend on them): `role="status"` on caveat
  banners, `role="alert"` on the two failure screens, `role="progressbar"` on
  meters, real table semantics in `SiteTable`.

## Known deferred items

- Build emits a >500 kB chunk advisory (single bundle) — consider route-level
  code-splitting if it matters.
- `src/components/ui/*` (generated) trip 3 oxlint `only-export-components`
  fast-refresh warnings — cosmetic, from the CLI output.
