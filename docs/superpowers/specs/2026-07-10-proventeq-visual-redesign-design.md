# Proventeq M365 & Azure Estate — Visual Redesign (Tailwind + shadcn)

**Date:** 2026-07-10
**Status:** Approved design, ready for implementation planning

## Goal

Redesign the presentation layer of the existing M365 & Azure dashboard so it is:

1. **On-brand with proventeq.com** — light theme, teal-led palette, Open Sans.
2. **Built on Tailwind v4 + shadcn/ui** instead of hand-written CSS.
3. **Visualization-led** — every section leads with a chart; tables are supporting detail.
4. **Business-valuable** — surfaces *all* data the reporting API returns, plus derived
   insights and color-coded status signals that turn data into decisions.

This is a **presentation-layer redesign only**. The auth, data-fetching, API-parsing,
and configuration layers already work and are **not touched**.

## Non-goals (YAGNI)

- No new API calls or data fields beyond what `DataSource` already returns.
- No CSV/PDF export.
- No new date-range control beyond the existing 7/30/90/180 `PeriodSelector`.
- No dark theme — light only.
- No changes to `auth/`, `clients/`, `data/`, `hooks/`, `reports/`, `types/`, `config/`.

## Brand system (from proventeq.com)

Extracted from the live site CSS:

| Token | Hex | Use |
|---|---|---|
| `brand` (teal) | `#34a1a0` | Primary — active nav, primary chart series, key accents |
| `coral` | `#f98d50` | Secondary series / "attention" warmth |
| `sky` | `#2e9cc7` | Tertiary series |
| `amber` | `#eab000` | "Watch" status / 4th series |
| `lime` | `#b1eb46` | 5th series / positive emphasis |
| `ink` | `#0c2340` / `#16475c` | Headings, deep text |
| surfaces | white / soft-grey (`#f7f8f9`, `#f1f2f5`) | Canvas and cards |

- **Typeface:** Open Sans, self-hosted via `@fontsource/open-sans` (no external CDN; works offline).
- **Feel:** light, clean, corporate-modern, generous whitespace.

## Architecture & tech setup

- **Tailwind v4** via the `@tailwindcss/vite` plugin, CSS-first config. A `@theme` block in
  the global stylesheet maps the brand tokens above to Tailwind color/utility tokens.
- **shadcn/ui** components copied into `src/components/ui/`. Requires:
  - `@/` path alias in `vite.config.ts` and `tsconfig.app.json`.
  - `components.json`, plus `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`.
  - Primitives used: Card, Table, Badge, Tabs, Select, Progress, Tooltip, Separator, Skeleton.
- **Recharts stays** (already a dependency), re-themed to the brand palette.
- Hand-written rules in `index.css` / `App.css` are retired as components migrate; the global
  stylesheet is reduced to the Tailwind import, `@theme` tokens, font import, and base resets.

### Layers untouched
`auth/`, `clients/`, `data/`, `hooks/`, `reports/`, `types/`, `config/` — no changes. Pages
consume the same React Query hooks (`useReports.ts`) and the same `DataSource` interface.

## Visualization system

A single, consistent charting layer so charts read as one system across all pages.

- **Shared chart palette**, brand-derived and ordered the same everywhere so a color means the
  same thing on every page: teal → coral → sky → amber → lime.
- **Themed Recharts wrappers** (thin components, in `src/components/charts/`):
  - `AreaTrend` — time-series area/line with soft brand fill.
  - `BarBreakdown` — horizontal/stacked bar for categorical breakdowns.
  - `DonutShare` — share-of-total donut.
  - `RadialGauge` — single utilization/percentage gauge.
  - `Sparkline` — compact inline trend for tiles.
  - Each wrapper standardizes grid, tooltip, Open Sans typography, number/byte formatting via
    `lib/format.ts`, `ResponsiveContainer` sizing, and empty/loading states.
- **Accessibility & motion:** every chart has an accessible label; key charts provide a
  data-table fallback. Color is never the only signal — status is also shown as icon/text.
  `prefers-reduced-motion` disables chart/transition animation.
- The **dataviz skill is consulted during implementation** before chart code is written, to
  validate chart-type choices, the palette (light + contrast), and accessibility.

## Insight / signal layer

Derived business value computed in the presentation layer (no new data):

- **Thresholds** centralized in `src/lib/thresholds.ts` — one place to tune what counts as
  healthy / watch / attention. Proposed defaults:
  - License SKU seat utilization: ≥90% → watch (amber), ≥98% → attention (coral).
  - Storage utilization (site or aggregate): ≥85% → watch, ≥95% → attention.
  - Otherwise → healthy (teal).
- **Delta math** helper — percentage change vs. the first point of the selected period, for
  trend series (active users, OneDrive, Teams).
- Both get unit tests.

## New shared components

On top of shadcn primitives:

- `StatCard` — label / value / optional delta / optional status dot.
- `StatusBadge` — semantic teal/amber/coral badge with icon + text (never color-only).
- `DeltaIndicator` — ▲▼ percentage vs. period start.
- `UtilizationMeter` — labeled progress bar, threshold-colored.
- `InsightCallout` — highlighted "needs attention" item.
- `SectionHeader` — title + optional period selector / controls.
- `HealthTile` — Overview tile: headline number + sparkline + status dot, links to section.

## Page designs

### App shell (`app/Layout.tsx`)
Light two-column layout:
- **Sidebar** — Proventeq wordmark/logo, lucide icon per section, active item marked with a
  teal rail. Collapses to a top nav on narrow screens.
- **Topbar** — org display name (once loaded) + user menu (live mode only, as today).
- **Canvas** — soft-grey background, responsive.

### Overview — cross-service health scorecard
Replaces the current 5 bare KPI cards.
- Row of **HealthTiles** (SharePoint, Licensing, Exchange, Estate, Azure): headline number +
  sparkline + status dot (teal/amber/coral from thresholds). Each links to its section.
- **"Needs attention"** `InsightCallout` list computed across sections
  (e.g. *"POWER_BI_PRO at 94% seat capacity"*, *"Engineering site at 88% storage"*).
- A **RadialGauge** for overall license utilization and a **stacked bar** of storage
  used-vs-free across services.
- Landing page has motion/context via sparklines and the trend strip.

### SharePoint
- **Lead chart:** horizontal stacked **BarBreakdown** — top sites by storage (used vs allocated).
- **DonutShare** of storage distribution across sites.
- **Table** now surfaces per-site **active files** and **allocated storage** (currently dropped)
  plus a per-site **UtilizationMeter** (used/allocated), threshold-colored.
- Keeps the existing `PeriodSelector`.

### Licensing
- **Lead chart:** grouped/stacked **BarBreakdown** per SKU (consumed vs available).
- **RadialGauge** for total seat utilization.
- Surfaces **enabled** total and per-SKU **% consumed** (currently only consumed/available shown).
- At-capacity SKUs flagged with `StatusBadge` (e.g. E5 92%, Power BI 94%).

### Estate
- **AreaTrend** charts (soft teal fill) for active users, OneDrive usage, Teams activity.
- Each chart paired with a headline latest value + **DeltaIndicator** (growth vs. period start).
- **OneDrive shown formatted** (`formatBytes`) instead of raw bytes (current bug/rough edge).
- Org identity (name / domain / country) presented as compact header, not three big cards.

### Exchange
- **Lead chart:** **stacked AreaTrend** for send/receive/read email activity.
- **DonutShare** active vs **inactive** mailboxes (inactive = total − active, currently not shown).
- Summary `StatCard`s including **average mailbox size** (storage / total) — newly derived.

### Azure
- **Lead chart:** horizontal **BarBreakdown** (or treemap) of resource mix by type.
- **RadialGauge** or big-number `StatCard` for MTD spend, currency-framed.
- Surfaces **total resource count** and subscription **state** as a `StatusBadge`.
- Multi-subscription `Select` preserved; Azure cost/subscription failures remain non-fatal.

## Testing & migration

- Existing tests assert mostly on **text and accessible roles**, which the redesign preserves
  (accessible names kept; `role="progressbar"` on meters; table semantics via shadcn Table).
- Update the few class-name-based assertions in existing tests to match new structure.
- Keep **mock-mode Playwright e2e green** (`e2e/dashboard.spec.ts`).
- Add unit tests for `thresholds.ts` and the delta helper.
- Definition of done: `npm run build`, `npm run typecheck`, `npm run test`, `npm run e2e`,
  and `npm run lint` all pass.

## Risks / decisions to tune

- **Threshold values** are judgment calls — centralized in `thresholds.ts` for easy tuning.
- **Tailwind v4 + shadcn on Vite (not Next)** — supported, but shadcn's defaults assume Next in
  places; the `components.json` and alias setup must target the Vite layout. Verify the first
  `shadcn add` produces a compiling component before scaling out.
- **Recharts + brand theming** — wrappers centralize theming so individual pages stay declarative.
