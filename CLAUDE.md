# CLAUDE.md

Guidance for working in this repo. See `README.md` for setup, scopes and roles.
The design and delivery plan lives outside this repo, in the agent-context
store: `proventeq-365/wi-96763-oversharing-sneak-peek-plan.md`.

## What this is

A browser-only React 19 + TypeScript + Vite 8 SPA that shows a Microsoft 365
tenant admin their own **sharing exposure**, read live from Microsoft Graph with
their delegated token. One route, one scrolling report; no backend, no lead
capture, no analytics, no telemetry. The UI is a light, **Proventeq-branded**,
chart-led report built on **Tailwind v4 + shadcn/ui**.

It is a sneak peek for the full P365 product, and its honesty rules are the
product argument:

- Every figure is measured by Graph, or shown as **unavailable with the reason**.
  A number that cannot be read is `null` — never `0`, never blank, never invented.
- Usage-report counts are **links**, not files. Never label them "files shared".
- Sections degrade independently: a missing role or consent disables one panel,
  never the page.
- Capabilities Graph does not have (Edit/Full Control rights, inheritance depth,
  unique/redundant/direct permissions, AI agents, remediation) are absent and
  named once, in the closing band.

## Seeded from `365-overview` — the foundation is shared

This repo was cloned from `proventeq-vercel/365-overview` with history; that
remote is kept as `overview`. These layers are **read-only** here and must stay
byte-identical to the sibling repo so a fix in one is a cherry-pick in the other:

`src/auth/*` · `src/clients/*` · `src/config/*` · the `DataSource` +
`DataProvider` pattern · `src/components/ui/*` · `src/components/charts/*` ·
`src/lib/{format,utils}.ts` · the brand tokens in `src/index.css` · the gotchas
section below.

```
git fetch overview && git cherry-pick <sha>
```

When a foundation fix is unavoidable, make it here, keep it minimal, and record
it in the plan note (`agent-context/proventeq-365/wi-96763-oversharing-sneak-peek-plan.md`,
§10) so it gets cherry-picked back to `365-overview`.

## Architecture (layers)

- `src/auth/` — MSAL (getMsalInstance singleton, redirect login, token acquire).
- `src/clients/` — `graphClient` fetch wrapper + `apiError`.
- `src/data/` — `DataSource` interface; `fixtures.ts` (mock) + `live.ts` (real).
- `src/reports/` — pure parsers, one per Graph response shape. Dumb: they coerce
  string numerics and `"True"`/`"False"`, and do no arithmetic.
- `src/model/` — **the one pure function** that does every calculation
  (coverage, severity, ratios, top-N, trend). Sections do zero maths, so the
  numbers are unit-testable and a "headline disagrees with the chart" bug cannot
  happen.
- `src/types/oversharing.ts` — shared types.
- `src/lib/` — `format` (bytes/number/percent), `severity`, `domains`,
  `topNWithOther`, `utils`.
- `src/components/` — shared UI: `StatCard`, `StatusBadge`, `DeltaIndicator`,
  `InsightCallout`, `SectionHeader`, `DataTable`, `SiteTable` (virtualized,
  generic `columns` prop), `ErrorState`, `SkeletonCard`; `charts/` (themed
  Recharts wrappers); `ui/` (shadcn primitives).
- `src/sections/Oversharing/` — the report's sections; presentation only.
- `src/app/` — `ReportShell` (header + main, no sidebar), `UserMenu`,
  `queryClient`.

**Scope rule:** the auth/clients/data/config layers are stable — treat them as
read-only unless the task is specifically about them (see the cherry-pick rule
above). Sections consume the overview hook and never touch a client directly.

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
- Health signals: `src/lib/thresholds.ts` — `utilizationStatus()` returns
  `healthy|watch|attention`; `STATUS_COLORS` maps them to teal/amber/coral.
- Risk severity mirrors P365's `ModuleCard.getSeverityLabelConfig` and lives in
  `src/lib/severity.ts` — count 0 → *No Exposure Detected*; coverage 0 → *No
  Immediate Risk*; <30% → *Review Recommended*; <60% → *Action Required*;
  ≥60% → *Immediate Action Required*.

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
- There is no navigation. The old `<nav aria-label="Sections">` hook is gone;
  don't reintroduce a sidebar to satisfy a test.
- Keep these ARIA hooks (tests depend on them): `role="table"`/`role="row"`/
  `role="cell"` on `SiteTable`, `role="img"` + label on every chart,
  `role="alert"` on error and unavailable panels.

## Known deferred items

- `src/components/ui/*` (generated) trip 3 oxlint `only-export-components`
  fast-refresh warnings — cosmetic, from the CLI output.

## Foundation changes made here, pending cherry-pick to `365-overview`

- `src/lib/format.ts` — `formatNumber` pins `Intl.NumberFormat` to `en-GB`.
  The default locale made output machine-dependent (`1 000 000` on a
  non-English Windows box), which broke the seed's own test and would have made
  the rendered report differ per viewer.
