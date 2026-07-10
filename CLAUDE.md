# CLAUDE.md

Guidance for working in this repo. See `README.md` for setup/permissions and
`docs/superpowers/` for specs and plans.

## What this is

A browser-only React 19 + TypeScript + Vite 8 SPA that surfaces Microsoft 365
and Azure operational data for tenant admins. Six sections: Overview,
SharePoint, Licensing, Estate, Exchange, Azure. The UI is a light,
**Proventeq-branded**, chart-led dashboard built on **Tailwind v4 + shadcn/ui**.

## Architecture (layers)

- `src/auth/` — MSAL (getMsalInstance singleton, redirect login, token acquire).
- `src/clients/` — `graphClient` / `armClient` fetch wrappers + `apiError`.
- `src/data/` — `DataSource` interface; `fixtures.ts` (mock) + `live.ts` (real).
- `src/hooks/useReports.ts` — React Query hooks per report; the ONLY data entry
  point for pages.
- `src/reports/` — pure parsers per API response shape.
- `src/types/reports.ts` — shared types (`ReportPeriod`, `UsagePoint`, etc.).
- `src/lib/` — `format` (bytes/number/percent), `thresholds`, `trend`,
  `usePrefersReducedMotion`.
- `src/components/` — shared UI: `StatCard`, `StatusBadge`, `DeltaIndicator`,
  `UtilizationMeter`, `InsightCallout`, `SectionHeader`, `HealthTile`,
  `DataTable`, `PeriodSelector`, `ErrorState`, `SkeletonCard`; `charts/` (themed
  Recharts wrappers); `ui/` (shadcn primitives).
- `src/sections/*/index.tsx` — the six page components.
- `src/app/` — `Layout` (shell), `UserMenu`, `queryClient`.

**Redesign scope rule:** the auth/clients/data/hooks/reports/types/config layers
are stable — treat them as read-only unless the task is specifically about them.
Pages consume `useReports` hooks + the `DataSource` interface only.

## Commands

- `npm run dev` — live mode (needs Entra config).
- `VITE_USE_MOCK=true npm run dev` — **mock mode on :5173**, no auth, fixture
  data. Fastest way to see/verify the UI. This is also what the e2e webServer runs.
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
  (`CHART_COLORS` order = teal, coral, sky, amber, lime — stable across pages).
- Health signals: `src/lib/thresholds.ts` — storage watch ≥85% / attention ≥95%;
  license watch ≥90% / attention ≥98%. `utilizationStatus()` returns
  `healthy|watch|attention`; `STATUS_COLORS` maps them to teal/amber/coral.

## Tailwind v4 + shadcn gotchas (learned the hard way)

- **shadcn CLI now generates Base UI primitives, not Radix** (`@base-ui/react/*`).
  APIs differ from Radix-era shadcn docs:
  - `Select.Root` `onValueChange` is `(value: string | null, eventDetails) => void`
    — wrap it: `onValueChange={(v) => setX(v ?? '')}`.
  - `Progress` (Base UI) manages its own `role="progressbar"`/`aria-*`. Do NOT
    spread `role`/`aria-valuenow` onto it. For custom meters (`UtilizationMeter`)
    render a plain `<div role="progressbar" aria-valuenow=... aria-label=...>`.
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
**interfaces** (`UsagePoint`, `EmailActivityPoint`) are NOT assignable to that
(no implicit index signature). Convert with `data={points.map(p => ({ ...p }))}`
(anonymous objects) — no cast. `.map`-produced and inline-literal arrays are fine
as-is. Wrappers accept an optional `valueFormatter?: (v:number)=>string` for
byte/number axis + tooltip formatting; the number axis is `XAxis` when
`horizontal` (BarBreakdown default), else `YAxis`.

## Testing / e2e conventions

- shadcn `Card` renders `data-slot="card"`. `StatCard` nests label and value as
  **siblings**, so the old `getByText(label).parentElement` value assertion
  breaks — scope with `getByText(label).closest('[data-slot="card"]')`.
- Every chart wrapper takes an `ariaLabel` and renders `role="img"` — always pass
  it from call sites (unnamed `role="img"` = a11y gap).
- Playwright: `getByRole('link', { name: /Section/ })` collides between the
  sidebar nav link and an on-page tile — scope page-tile assertions to
  `getByRole('main')`. `getByRole` excludes `display:none` nodes, so the
  `md:hidden` mobile nav doesn't collide with the desktop `<nav aria-label="Sections">`
  at Playwright's 1280px default.
- Keep these ARIA hooks (tests depend on them): `<nav aria-label="Sections">`,
  `role="progressbar"` on meters, real table semantics, SKU part number in a
  plain table cell, `role="group"`/`aria-label="Report period"` on PeriodSelector.

## Known deferred items

- Build emits a >500 kB chunk advisory (single bundle) — consider route-level
  code-splitting if it matters.
- `src/components/ui/*` (generated) trip 3 oxlint `only-export-components`
  fast-refresh warnings — cosmetic, from the CLI output.
