# Proventeq Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the presentation layer of the M365 & Azure dashboard on Tailwind v4 + shadcn/ui with a light, Proventeq-branded, chart-led design that surfaces every reporting-API field plus derived health signals.

**Architecture:** Presentation-layer-only redesign. The `auth/`, `clients/`, `data/`, `hooks/`, `reports/`, `types/`, `config/` layers are untouched — pages keep consuming the same React Query hooks (`useReports.ts`) and `DataSource` interface. New code is a design-system foundation (Tailwind tokens + shadcn primitives), a themed Recharts wrapper layer, an insight/threshold layer, reusable components, and rewritten section pages.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Tailwind v4 (`@tailwindcss/vite`), shadcn/ui, Recharts 3, `@fontsource/open-sans`, lucide-react, class-variance-authority, clsx, tailwind-merge.

## Global Constraints

- **Do not modify** `src/auth/`, `src/clients/`, `src/data/`, `src/hooks/`, `src/reports/`, `src/types/`, `src/config/`. (Exception: none.)
- **No new API calls or data fields** beyond what `DataSource` (`src/data/fixtures.ts`) already exposes.
- **Light theme only.** No dark mode.
- **Brand palette (exact):** teal `#34a1a0` (primary), coral `#f98d50`, sky `#2e9cc7`, amber `#eab000`, lime `#b1eb46`, ink `#0c2340` / `#16475c`. Surfaces white / soft-grey.
- **Typeface:** Open Sans, self-hosted via `@fontsource/open-sans`. No external font CDN.
- **Mock mode must stay MSAL-free** — never import MSAL into `Layout` or section pages; `UserMenu` renders only when `!env.useMock` (preserve current behavior).
- **Preserve accessibility hooks** relied on by tests: sidebar `<nav aria-label="Sections">`; utilization/progress elements expose `role="progressbar"`; tables use real table semantics; the SKU part number renders in a table cell.
- **Definition of done for every task:** `npm run typecheck` and `npm run test` pass. Full-suite tasks additionally pass `npm run lint`, `npm run build`, and `npm run e2e`.
- **Chart work:** consult the `dataviz` skill before writing chart code (Task 3).
- **Commit after every task** with a Conventional Commit message.

---

## File Structure

**Created:**
- `components.json` — shadcn config
- `src/lib/utils.ts` — `cn()` class merger
- `src/lib/thresholds.ts` — health status from utilization
- `src/lib/trend.ts` — percentage delta over a series
- `src/components/ui/*` — shadcn primitives (CLI-generated)
- `src/components/charts/chartTheme.ts` — palette + shared chart constants
- `src/components/charts/{AreaTrend,BarBreakdown,DonutShare,RadialGauge,Sparkline}.tsx`
- `src/components/{StatCard,StatusBadge,DeltaIndicator,UtilizationMeter,InsightCallout,SectionHeader,HealthTile}.tsx`
- Tests alongside logic/components as specified per task.

**Modified:**
- `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json` — tooling + `@/` alias
- `src/index.css` — Tailwind import + `@theme` brand tokens (legacy rules removed in Task 13)
- `src/lib/format.ts` — add `formatPercent`, `formatSignedPercent`
- `src/app/Layout.tsx`, `src/app/UserMenu.tsx`
- `src/components/{DataTable,PeriodSelector,ErrorState,SkeletonCard}.tsx`
- `src/sections/{Overview,SharePoint,Licensing,Estate,Exchange,Azure}/index.tsx`
- `src/sections/Overview/Overview.test.tsx`, `src/sections/SharePoint/SharePoint.test.tsx`
- `e2e/dashboard.spec.ts`
- `src/main.tsx` — rebrand inline bootstrap-error styles (Task 13)

**Deleted (Task 13):** `src/components/KpiCard.tsx`, `src/components/TrendChart.tsx`, `src/components/ConsumptionBar.tsx` (+ its test, migrated to `UtilizationMeter.test.tsx`), and legacy rules in `src/App.css`/`src/index.css`.

---

## Task 1: Tailwind + shadcn foundation & brand tokens

**Files:**
- Modify: `package.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `src/index.css`, `src/main.tsx`
- Create: `components.json`, `src/lib/utils.ts`, `src/components/ui/*`

**Interfaces:**
- Produces: `@/` import alias resolving to `src/`; `cn(...classes)` from `@/lib/utils`; shadcn primitives importable from `@/components/ui/{card,table,badge,tabs,select,progress,tooltip,separator,skeleton}`; Tailwind utility classes and brand tokens (`bg-brand`, `text-brand`, `border-brand`, plus CSS vars `--color-brand`, `--color-coral`, `--color-sky`, `--color-amber`, `--color-lime`, `--color-ink`).

- [ ] **Step 1: Install dependencies**

```bash
npm install tailwindcss @tailwindcss/vite @fontsource/open-sans class-variance-authority clsx tailwind-merge lucide-react tw-animate-css
```

- [ ] **Step 2: Add the `@/` alias to both tsconfigs**

In `tsconfig.json`, add a `compilerOptions` block (the file currently only has `files`/`references` — add this key alongside them):

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ],
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

In `tsconfig.app.json`, add `baseUrl` and `paths` inside `compilerOptions` (keep every existing option):

```json
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] },
```

- [ ] **Step 3: Wire the Tailwind Vite plugin + alias**

Replace `vite.config.ts` with:

```ts
import path from 'node:path'
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

- [ ] **Step 4: Replace `src/index.css` with the Tailwind import + brand theme**

Replace the entire file. (Legacy component classes still referenced by not-yet-migrated pages are re-declared at the bottom so intermediate commits stay coherent; they are removed in Task 13.)

```css
@import 'tailwindcss';
@import 'tw-animate-css';
@import '@fontsource/open-sans/400.css';
@import '@fontsource/open-sans/600.css';
@import '@fontsource/open-sans/700.css';

@theme {
  --font-sans: 'Open Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;

  --color-brand: #34a1a0;
  --color-brand-strong: #277978;
  --color-coral: #f98d50;
  --color-sky: #2e9cc7;
  --color-amber: #eab000;
  --color-lime: #b1eb46;
  --color-ink: #0c2340;
  --color-ink-soft: #16475c;

  --color-canvas: #f7f8f9;
  --color-surface: #ffffff;
  --color-hairline: #e3e6ea;
}

:root {
  --radius: 0.75rem;
  --background: #f7f8f9;
  --foreground: #0c2340;
  --card: #ffffff;
  --card-foreground: #0c2340;
  --primary: #34a1a0;
  --primary-foreground: #ffffff;
  --muted: #f1f2f5;
  --muted-foreground: #6b7280;
  --border: #e3e6ea;
  --input: #e3e6ea;
  --ring: #34a1a0;
}

* {
  box-sizing: border-box;
}

html,
body,
#root {
  height: 100%;
}

body {
  margin: 0;
  background: var(--color-canvas);
  color: var(--color-ink);
  font-family: var(--font-sans);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

.tabular {
  font-variant-numeric: tabular-nums;
}

/* ===== LEGACY component classes — REMOVED in Task 13 once all pages migrate ===== */
.kpi-card { background:#fff; border:1px solid #e3e6ea; border-radius:12px; padding:1.1rem 1.25rem; display:flex; flex-direction:column; gap:.4rem; }
.kpi-card__label { font-size:.72rem; font-weight:600; letter-spacing:.08em; text-transform:uppercase; color:#6b7280; }
.kpi-card__value { font-size:2rem; font-weight:680; color:#0c2340; font-variant-numeric:tabular-nums; }
.kpi-card__sub { font-size:.85rem; color:#6b7280; }
.card-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:1rem; }
.page { display:flex; flex-direction:column; gap:1rem; }
.page__header { display:flex; align-items:center; justify-content:space-between; }
.page__title { font-size:1.5rem; font-weight:650; }
.section-heading { font-size:1rem; font-weight:600; margin-top:1rem; }
.card, .trend-chart { background:#fff; border:1px solid #e3e6ea; border-radius:12px; padding:1rem 1.1rem; }
.card-link { text-decoration:none; color:inherit; }
.data-table { width:100%; border-collapse:collapse; font-size:.9rem; }
.data-table th, .data-table td { text-align:left; padding:.65rem .85rem; border-bottom:1px solid #e3e6ea; }
.data-table th { font-size:.72rem; text-transform:uppercase; letter-spacing:.06em; color:#6b7280; }
.consumption-bar { display:grid; grid-template-columns:1fr auto; gap:.35rem .75rem; }
.consumption-bar__label { grid-column:1/-1; font-size:.8rem; color:#6b7280; }
.consumption-bar__track { height:8px; background:#f1f2f5; border-radius:999px; overflow:hidden; }
.consumption-bar__fill { height:100%; border-radius:999px; background:#34a1a0; }
.consumption-bar__percent { font-size:.85rem; font-weight:600; }
.period-selector { display:inline-flex; gap:.25rem; padding:.25rem; background:#fff; border:1px solid #e3e6ea; border-radius:999px; }
.period-selector__btn { border:none; background:transparent; color:#6b7280; padding:.35rem .85rem; border-radius:999px; font-weight:600; }
.period-selector__btn--active { background:rgba(52,161,160,.14); color:#277978; }
.error-state { background:#fff; border:1px solid #e3e6ea; border-left:3px solid #f98d50; border-radius:12px; padding:1.1rem 1.25rem; }
.error-state__message { font-weight:600; }
.error-state__hint { margin-top:.35rem; font-size:.85rem; color:#6b7280; }
.skeleton-card { background:#fff; border:1px solid #e3e6ea; border-radius:12px; padding:1.1rem 1.25rem; display:flex; flex-direction:column; gap:.7rem; }
.skeleton-card__line { height:14px; border-radius:6px; background:#f1f2f5; }
.app-shell { display:flex; min-height:100vh; }
.sidebar { width:220px; background:#fff; border-right:1px solid #e3e6ea; padding:1rem; }
.app-main { flex:1; display:flex; flex-direction:column; }
.topbar { display:flex; align-items:center; justify-content:space-between; padding:1rem 1.5rem; border-bottom:1px solid #e3e6ea; background:#fff; }
.content { padding:1.5rem; }
.nav-link { display:flex; gap:.6rem; padding:.5rem .7rem; border-radius:8px; color:#16475c; }
.nav-link--active { background:rgba(52,161,160,.14); color:#277978; font-weight:600; }
.azure-sub-select { display:flex; gap:.5rem; align-items:center; }
```

- [ ] **Step 5: Remove the hardcoded dark background in the bootstrap-error fallback**

In `src/main.tsx`, inside `renderBootstrapError`, change the wrapper `background: '#0f1117'` to `background: '#f7f8f9'` and add `color: '#0c2340'` to the same style object (keep everything else).

- [ ] **Step 6: Scaffold shadcn and add primitives**

Run the shadcn init (it auto-detects Vite + the `@/` alias; accept defaults, base color **neutral**):

```bash
npx shadcn@latest init -d
npx shadcn@latest add card table badge tabs select progress tooltip separator skeleton button
```

Expected: creates `components.json`, `src/lib/utils.ts` (exporting `cn`), and `src/components/ui/*.tsx`. If init reports the CSS is already configured, that is fine — keep the `src/index.css` from Step 4 (do not let the CLI overwrite the `@theme` block; re-apply Step 4 if it does).

- [ ] **Step 7: Verify build, typecheck, and existing tests still pass**

```bash
npm run typecheck && npm run build && npm run test && npm run e2e
```

Expected: all pass. Pages are visually transitional but functional; the legacy CSS keeps them coherent.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: add Tailwind v4 + shadcn foundation and Proventeq brand tokens"
```

---

## Task 2: Insight logic — thresholds, trend delta, formatters (TDD)

**Files:**
- Create: `src/lib/thresholds.ts`, `src/lib/thresholds.test.ts`, `src/lib/trend.ts`, `src/lib/trend.test.ts`
- Modify: `src/lib/format.ts`, `src/lib/format.test.ts`

**Interfaces:**
- Produces:
  - `type HealthStatus = 'healthy' | 'watch' | 'attention'`
  - `interface Thresholds { watch: number; attention: number }` (fractions 0–1)
  - `const STORAGE_THRESHOLDS: Thresholds`, `const LICENSE_THRESHOLDS: Thresholds`
  - `function utilizationStatus(used: number, total: number, t: Thresholds): HealthStatus`
  - `function percentDelta(series: number[]): number | null` (percent, e.g. `14.8`; `null` if <2 points or first is 0)
  - `function formatPercent(ratio: number, digits?: number): string` (ratio 0–1 → `"85%"`)
  - `function formatSignedPercent(pct: number, digits?: number): string` (`12.3` → `"+12.3%"`)

- [ ] **Step 1: Write failing tests for thresholds**

Create `src/lib/thresholds.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  utilizationStatus,
  STORAGE_THRESHOLDS,
  LICENSE_THRESHOLDS,
} from './thresholds'

describe('utilizationStatus', () => {
  it('returns healthy below the watch threshold', () => {
    expect(utilizationStatus(80, 100, STORAGE_THRESHOLDS)).toBe('healthy')
  })
  it('returns watch at the watch threshold', () => {
    expect(utilizationStatus(85, 100, STORAGE_THRESHOLDS)).toBe('watch')
  })
  it('returns attention at the attention threshold', () => {
    expect(utilizationStatus(95, 100, STORAGE_THRESHOLDS)).toBe('attention')
  })
  it('uses license thresholds (watch 90, attention 98)', () => {
    expect(utilizationStatus(92, 100, LICENSE_THRESHOLDS)).toBe('watch')
    expect(utilizationStatus(98, 100, LICENSE_THRESHOLDS)).toBe('attention')
  })
  it('treats zero/negative total as healthy (no divide-by-zero)', () => {
    expect(utilizationStatus(0, 0, STORAGE_THRESHOLDS)).toBe('healthy')
  })
})
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/lib/thresholds.test.ts`
Expected: FAIL — cannot resolve `./thresholds`.

- [ ] **Step 3: Implement `thresholds.ts`**

```ts
export type HealthStatus = 'healthy' | 'watch' | 'attention'

/** Fractions in 0–1. `watch`/`attention` are the lower bounds of each band. */
export interface Thresholds {
  watch: number
  attention: number
}

export const STORAGE_THRESHOLDS: Thresholds = { watch: 0.85, attention: 0.95 }
export const LICENSE_THRESHOLDS: Thresholds = { watch: 0.9, attention: 0.98 }

export function utilizationStatus(
  used: number,
  total: number,
  t: Thresholds,
): HealthStatus {
  if (total <= 0) return 'healthy'
  const ratio = used / total
  if (ratio >= t.attention) return 'attention'
  if (ratio >= t.watch) return 'watch'
  return 'healthy'
}
```

- [ ] **Step 4: Write failing tests for trend delta**

Create `src/lib/trend.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { percentDelta } from './trend'

describe('percentDelta', () => {
  it('computes percent change from first to last', () => {
    expect(percentDelta([100, 110])).toBeCloseTo(10)
    expect(percentDelta([200, 150])).toBeCloseTo(-25)
  })
  it('returns null for fewer than two points', () => {
    expect(percentDelta([5])).toBeNull()
    expect(percentDelta([])).toBeNull()
  })
  it('returns null when the first value is zero', () => {
    expect(percentDelta([0, 50])).toBeNull()
  })
})
```

- [ ] **Step 5: Run and confirm failure**

Run: `npx vitest run src/lib/trend.test.ts`
Expected: FAIL — cannot resolve `./trend`.

- [ ] **Step 6: Implement `trend.ts`**

```ts
/** Percent change from the first to the last point (e.g. 14.8).
 *  Returns null if there are fewer than two points or the first is zero. */
export function percentDelta(series: number[]): number | null {
  if (series.length < 2) return null
  const first = series[0]
  const last = series[series.length - 1]
  if (first === 0) return null
  return ((last - first) / first) * 100
}
```

- [ ] **Step 7: Add failing tests for the new formatters**

Append to `src/lib/format.test.ts` (add the imports to the existing import line):

```ts
import { formatPercent, formatSignedPercent } from './format'

describe('formatPercent', () => {
  it('formats a 0–1 ratio as a percent', () => {
    expect(formatPercent(0.856)).toBe('86%')
    expect(formatPercent(0.5, 1)).toBe('50.0%')
  })
})

describe('formatSignedPercent', () => {
  it('prefixes a plus for positive values', () => {
    expect(formatSignedPercent(12.34)).toBe('+12.3%')
  })
  it('keeps the minus for negative values', () => {
    expect(formatSignedPercent(-4.2)).toBe('-4.2%')
  })
})
```

- [ ] **Step 8: Run and confirm failure**

Run: `npx vitest run src/lib/format.test.ts`
Expected: FAIL — `formatPercent`/`formatSignedPercent` not exported.

- [ ] **Step 9: Implement the formatters**

Append to `src/lib/format.ts`:

```ts
export function formatPercent(ratio: number, digits = 0): string {
  return `${(ratio * 100).toFixed(digits)}%`
}

export function formatSignedPercent(pct: number, digits = 1): string {
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(digits)}%`
}
```

- [ ] **Step 10: Run all logic tests + typecheck**

```bash
npx vitest run src/lib && npm run typecheck
```

Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src/lib
git commit -m "feat: add threshold, trend-delta and percent formatting helpers"
```

---

## Task 3: Themed chart wrappers

> Consult the `dataviz` skill before implementing (chart-type fit, palette contrast, accessibility).

**Files:**
- Create: `src/components/charts/chartTheme.ts`, `AreaTrend.tsx`, `BarBreakdown.tsx`, `DonutShare.tsx`, `RadialGauge.tsx`, `Sparkline.tsx` (all under `src/components/charts/`)
- Create: `src/components/charts/charts.test.tsx`

**Interfaces:**
- Produces:
  - `chartTheme.ts`: `CHART_COLORS: string[]`, `STATUS_COLORS: Record<HealthStatus,string>`, `AXIS_INK: string`, `GRID_STROKE: string`, `TICK: object`
  - `AreaTrend({ data, xKey, series, stack?, height? })` — `series: { key: string; name: string }[]`
  - `BarBreakdown({ data, categoryKey, valueKeys, horizontal?, stack?, height? })` — `valueKeys: { key: string; name: string }[]`
  - `DonutShare({ data, nameKey, valueKey, height? })`
  - `RadialGauge({ value, label, height? })` — `value` is 0–100
  - `Sparkline({ data, dataKey, height? })`
  - Every wrapper accepts `ariaLabel?: string` and renders a `role="img"` wrapper carrying it.

- [ ] **Step 1: Implement `chartTheme.ts`**

```ts
import type { HealthStatus } from '@/lib/thresholds'

/** Brand-ordered series palette. Index → meaning is stable across all charts. */
export const CHART_COLORS = ['#34a1a0', '#f98d50', '#2e9cc7', '#eab000', '#b1eb46']

export const STATUS_COLORS: Record<HealthStatus, string> = {
  healthy: '#34a1a0',
  watch: '#eab000',
  attention: '#f98d50',
}

export const AXIS_INK = '#16475c'
export const GRID_STROKE = '#e3e6ea'
export const TICK = { fill: '#6b7280', fontSize: 12 } as const
```

- [ ] **Step 2: Implement `AreaTrend.tsx`**

```tsx
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { CHART_COLORS, AXIS_INK, GRID_STROKE, TICK } from './chartTheme'

interface Series { key: string; name: string }
interface Props {
  data: Record<string, unknown>[]
  xKey: string
  series: Series[]
  stack?: boolean
  height?: number
  ariaLabel?: string
}

export function AreaTrend({ data, xKey, series, stack, height = 240, ariaLabel }: Props) {
  return (
    <div role="img" aria-label={ariaLabel} className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <defs>
            {series.map((s, i) => {
              const c = CHART_COLORS[i % CHART_COLORS.length]
              return (
                <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={c} stopOpacity={0.02} />
                </linearGradient>
              )
            })}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey={xKey} tick={TICK} stroke={AXIS_INK} tickLine={false} />
          <YAxis tick={TICK} stroke={AXIS_INK} tickLine={false} width={48} />
          <Tooltip contentStyle={{ borderRadius: 12, border: `1px solid ${GRID_STROKE}`, fontFamily: 'Open Sans' }} />
          {series.length > 1 && <Legend />}
          {series.map((s, i) => {
            const c = CHART_COLORS[i % CHART_COLORS.length]
            return (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stackId={stack ? 'a' : undefined}
                stroke={c}
                strokeWidth={2}
                fill={`url(#grad-${s.key})`}
                dot={false}
              />
            )
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 3: Implement `BarBreakdown.tsx`**

```tsx
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { CHART_COLORS, AXIS_INK, GRID_STROKE, TICK } from './chartTheme'

interface ValueKey { key: string; name: string }
interface Props {
  data: Record<string, unknown>[]
  categoryKey: string
  valueKeys: ValueKey[]
  horizontal?: boolean
  stack?: boolean
  height?: number
  ariaLabel?: string
}

export function BarBreakdown({
  data, categoryKey, valueKeys, horizontal = true, stack, height = 280, ariaLabel,
}: Props) {
  return (
    <div role="img" aria-label={ariaLabel} className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout={horizontal ? 'vertical' : 'horizontal'}
          margin={{ top: 8, right: 16, bottom: 4, left: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={!horizontal} vertical={horizontal} />
          {horizontal ? (
            <>
              <XAxis type="number" tick={TICK} stroke={AXIS_INK} tickLine={false} />
              <YAxis type="category" dataKey={categoryKey} tick={TICK} stroke={AXIS_INK} tickLine={false} width={140} />
            </>
          ) : (
            <>
              <XAxis type="category" dataKey={categoryKey} tick={TICK} stroke={AXIS_INK} tickLine={false} />
              <YAxis type="number" tick={TICK} stroke={AXIS_INK} tickLine={false} width={48} />
            </>
          )}
          <Tooltip contentStyle={{ borderRadius: 12, border: `1px solid ${GRID_STROKE}`, fontFamily: 'Open Sans' }} />
          {valueKeys.length > 1 && <Legend />}
          {valueKeys.map((v, i) => (
            <Bar
              key={v.key}
              dataKey={v.key}
              name={v.name}
              stackId={stack ? 'a' : undefined}
              fill={CHART_COLORS[i % CHART_COLORS.length]}
              radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 4: Implement `DonutShare.tsx`**

```tsx
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { CHART_COLORS, GRID_STROKE } from './chartTheme'

interface Props {
  data: Record<string, unknown>[]
  nameKey: string
  valueKey: string
  height?: number
  ariaLabel?: string
}

export function DonutShare({ data, nameKey, valueKey, height = 240, ariaLabel }: Props) {
  return (
    <div role="img" aria-label={ariaLabel} className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} nameKey={nameKey} dataKey={valueKey} innerRadius="55%" outerRadius="80%" paddingAngle={2}>
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: 12, border: `1px solid ${GRID_STROKE}`, fontFamily: 'Open Sans' }} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 5: Implement `RadialGauge.tsx`**

```tsx
import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts'
import { STATUS_COLORS } from './chartTheme'
import { utilizationStatus, LICENSE_THRESHOLDS } from '@/lib/thresholds'

interface Props {
  value: number // 0–100
  label: string
  height?: number
  ariaLabel?: string
}

export function RadialGauge({ value, label, height = 200, ariaLabel }: Props) {
  const clamped = Math.min(100, Math.max(0, value))
  const status = utilizationStatus(clamped, 100, LICENSE_THRESHOLDS)
  const color = STATUS_COLORS[status]
  return (
    <div role="img" aria-label={ariaLabel ?? `${label}: ${Math.round(clamped)} percent`} className="relative w-full">
      <ResponsiveContainer width="100%" height={height}>
        <RadialBarChart
          data={[{ value: clamped, fill: color }]}
          startAngle={90}
          endAngle={-270}
          innerRadius="70%"
          outerRadius="100%"
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" background cornerRadius={999} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-ink tabular">{Math.round(clamped)}%</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Implement `Sparkline.tsx`**

```tsx
import { LineChart, Line, ResponsiveContainer } from 'recharts'

interface Props {
  data: Record<string, unknown>[]
  dataKey: string
  height?: number
  ariaLabel?: string
}

export function Sparkline({ data, dataKey, height = 40, ariaLabel }: Props) {
  return (
    <div role="img" aria-label={ariaLabel} className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 4, right: 2, bottom: 4, left: 2 }}>
          <Line type="monotone" dataKey={dataKey} stroke="#34a1a0" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 7: Add a smoke test for the wrappers**

Create `src/components/charts/charts.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { AreaTrend } from './AreaTrend'
import { BarBreakdown } from './BarBreakdown'
import { DonutShare } from './DonutShare'
import { RadialGauge } from './RadialGauge'
import { Sparkline } from './Sparkline'

const points = [{ date: 'd1', value: 10 }, { date: 'd2', value: 20 }]

describe('chart wrappers', () => {
  it('AreaTrend renders with an accessible label', () => {
    const { getByRole } = render(
      <AreaTrend data={points} xKey="date" series={[{ key: 'value', name: 'Value' }]} ariaLabel="trend" />,
    )
    expect(getByRole('img', { name: 'trend' })).toBeInTheDocument()
  })
  it('BarBreakdown renders', () => {
    const { getByRole } = render(
      <BarBreakdown data={points} categoryKey="date" valueKeys={[{ key: 'value', name: 'Value' }]} ariaLabel="bars" />,
    )
    expect(getByRole('img', { name: 'bars' })).toBeInTheDocument()
  })
  it('DonutShare renders', () => {
    const { getByRole } = render(<DonutShare data={points} nameKey="date" valueKey="value" ariaLabel="donut" />)
    expect(getByRole('img', { name: 'donut' })).toBeInTheDocument()
  })
  it('RadialGauge shows the rounded percent', () => {
    const { getByText } = render(<RadialGauge value={83.4} label="Utilization" />)
    expect(getByText('83%')).toBeInTheDocument()
  })
  it('Sparkline renders', () => {
    const { getByRole } = render(<Sparkline data={points} dataKey="value" ariaLabel="spark" />)
    expect(getByRole('img', { name: 'spark' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 8: Run tests + typecheck**

```bash
npx vitest run src/components/charts && npm run typecheck
```

Expected: PASS. (Recharts renders in jsdom without a real size; the `role="img"` wrapper and gauge label are what we assert.)

- [ ] **Step 9: Commit**

```bash
git add src/components/charts
git commit -m "feat: add brand-themed Recharts wrapper components"
```

---

## Task 4: Shared insight components

**Files:**
- Create: `src/components/StatusBadge.tsx`, `DeltaIndicator.tsx`, `UtilizationMeter.tsx`, `StatCard.tsx`, `InsightCallout.tsx`, `SectionHeader.tsx`, `HealthTile.tsx`
- Create: `src/components/UtilizationMeter.test.tsx`, `src/components/StatusBadge.test.tsx`, `src/components/HealthTile.test.tsx`

**Interfaces:**
- Consumes: `cn` (`@/lib/utils`), `HealthStatus`/`utilizationStatus`/`Thresholds` (`@/lib/thresholds`), `percentDelta` (`@/lib/trend`), `formatPercent`/`formatSignedPercent` (`@/lib/format`), `Sparkline` (`@/components/charts/Sparkline`), shadcn `Card`, `Badge`, `Progress`.
- Produces:
  - `StatusBadge({ status, label? })`
  - `DeltaIndicator({ pct })` — `pct: number | null`
  - `UtilizationMeter({ used, total, thresholds, label })` — renders `role="progressbar"`
  - `StatCard({ label, value, delta?, status?, sub? })` — `delta?: number | null`, `status?: HealthStatus`
  - `InsightCallout({ status, message })`
  - `SectionHeader({ title, children? })`
  - `HealthTile({ to, label, value, status, series?, seriesKey? })`

- [ ] **Step 1: Write failing tests for UtilizationMeter, StatusBadge, HealthTile**

Create `src/components/UtilizationMeter.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UtilizationMeter } from './UtilizationMeter'
import { STORAGE_THRESHOLDS } from '@/lib/thresholds'

describe('UtilizationMeter', () => {
  it('exposes a progressbar with the rounded percent and a label', () => {
    render(<UtilizationMeter used={90} total={100} thresholds={STORAGE_THRESHOLDS} label="Storage" />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '90')
    expect(screen.getByText('Storage')).toBeInTheDocument()
    expect(screen.getByText('90%')).toBeInTheDocument()
  })
})
```

Create `src/components/StatusBadge.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from './StatusBadge'

describe('StatusBadge', () => {
  it('renders the default status label when none is given', () => {
    render(<StatusBadge status="attention" />)
    expect(screen.getByText('Attention')).toBeInTheDocument()
  })
  it('renders a custom label', () => {
    render(<StatusBadge status="watch" label="94% consumed" />)
    expect(screen.getByText('94% consumed')).toBeInTheDocument()
  })
})
```

Create `src/components/HealthTile.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { HealthTile } from './HealthTile'

describe('HealthTile', () => {
  it('renders a link with the label and value', () => {
    render(
      <MemoryRouter>
        <HealthTile to="/sharepoint" label="SharePoint" value="4 sites" status="healthy" />
      </MemoryRouter>,
    )
    const link = screen.getByRole('link', { name: /SharePoint/ })
    expect(link).toHaveAttribute('href', '/sharepoint')
    expect(screen.getByText('4 sites')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run src/components/UtilizationMeter.test.tsx src/components/StatusBadge.test.tsx src/components/HealthTile.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement `StatusBadge.tsx`**

```tsx
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { HealthStatus } from '@/lib/thresholds'

const MAP: Record<HealthStatus, { label: string; Icon: typeof CheckCircle2; className: string }> = {
  healthy: { label: 'Healthy', Icon: CheckCircle2, className: 'bg-brand/12 text-brand-strong border-brand/30' },
  watch: { label: 'Watch', Icon: AlertTriangle, className: 'bg-amber/15 text-[#8a6d00] border-amber/40' },
  attention: { label: 'Attention', Icon: AlertCircle, className: 'bg-coral/15 text-[#b4531d] border-coral/40' },
}

export function StatusBadge({ status, label }: { status: HealthStatus; label?: string }) {
  const { label: def, Icon, className } = MAP[status]
  return (
    <Badge variant="outline" className={cn('gap-1 font-semibold', className)}>
      <Icon className="size-3.5" aria-hidden="true" />
      {label ?? def}
    </Badge>
  )
}
```

- [ ] **Step 4: Implement `UtilizationMeter.tsx`**

```tsx
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { utilizationStatus, type Thresholds } from '@/lib/thresholds'
import { STATUS_COLORS } from '@/components/charts/chartTheme'

interface Props {
  used: number
  total: number
  thresholds: Thresholds
  label: string
}

export function UtilizationMeter({ used, total, thresholds, label }: Props) {
  const pct = total <= 0 ? 0 : Math.round((used / total) * 100)
  const clamped = Math.min(100, Math.max(0, pct))
  const status = utilizationStatus(used, total, thresholds)
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular text-ink">{pct}%</span>
      </div>
      <Progress
        value={clamped}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className={cn('h-2 bg-muted')}
        style={{ ['--progress-color' as string]: STATUS_COLORS[status] }}
      />
    </div>
  )
}
```

> Note: shadcn's `Progress` colors its indicator with `bg-primary`. In `src/components/ui/progress.tsx`, change the indicator element's `className` to include `style` pass-through and use the CSS var: set the indicator to `className="h-full w-full flex-1 transition-all"` and `style={{ transform: ..., background: 'var(--progress-color, var(--primary))' }}`. If the generated component doesn't forward `style` to the indicator, add `indicatorClassName`/`style` handling. (This is a small edit to the CLI-generated file — keep its Radix structure.)

- [ ] **Step 5: Implement `DeltaIndicator.tsx`**

```tsx
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatSignedPercent } from '@/lib/format'

export function DeltaIndicator({ pct }: { pct: number | null }) {
  if (pct === null) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="size-3" aria-hidden="true" /> n/a
      </span>
    )
  }
  const up = pct >= 0
  const Icon = up ? ArrowUpRight : ArrowDownRight
  return (
    <span
      className={cn('inline-flex items-center gap-0.5 text-xs font-semibold', up ? 'text-brand-strong' : 'text-[#b4531d]')}
      aria-label={`change ${formatSignedPercent(pct)}`}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {formatSignedPercent(pct)}
    </span>
  )
}
```

- [ ] **Step 6: Implement `StatCard.tsx`**

```tsx
import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { STATUS_COLORS } from '@/components/charts/chartTheme'
import { DeltaIndicator } from './DeltaIndicator'
import type { HealthStatus } from '@/lib/thresholds'

interface Props {
  label: string
  value: ReactNode
  sub?: ReactNode
  delta?: number | null
  status?: HealthStatus
}

export function StatCard({ label, value, sub, delta, status }: Props) {
  return (
    <Card className="border-hairline shadow-none">
      <CardContent className="flex flex-col gap-1 p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
          {status && <span className="size-2.5 rounded-full" style={{ background: STATUS_COLORS[status] }} aria-hidden="true" />}
        </div>
        <span className="text-3xl font-bold tabular text-ink">{value}</span>
        <div className="flex items-center gap-2">
          {delta !== undefined && <DeltaIndicator pct={delta} />}
          {sub && <span className="text-sm text-muted-foreground tabular">{sub}</span>}
        </div>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 7: Implement `InsightCallout.tsx`**

```tsx
import { cn } from '@/lib/utils'
import { STATUS_COLORS } from '@/components/charts/chartTheme'
import type { HealthStatus } from '@/lib/thresholds'

export function InsightCallout({ status, message }: { status: HealthStatus; message: string }) {
  return (
    <div className={cn('flex items-center gap-3 rounded-lg border border-hairline bg-surface px-4 py-3')}>
      <span className="size-2.5 shrink-0 rounded-full" style={{ background: STATUS_COLORS[status] }} aria-hidden="true" />
      <span className="text-sm text-ink">{message}</span>
    </div>
  )
}
```

- [ ] **Step 8: Implement `SectionHeader.tsx`**

```tsx
import type { ReactNode } from 'react'

export function SectionHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold text-ink">{title}</h1>
      {children}
    </div>
  )
}
```

- [ ] **Step 9: Implement `HealthTile.tsx`**

```tsx
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { STATUS_COLORS } from '@/components/charts/chartTheme'
import { Sparkline } from '@/components/charts/Sparkline'
import type { HealthStatus } from '@/lib/thresholds'

interface Props {
  to: string
  label: string
  value: string
  status: HealthStatus
  series?: Record<string, unknown>[]
  seriesKey?: string
}

export function HealthTile({ to, label, value, status, series, seriesKey }: Props) {
  return (
    <Link to={to} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-xl">
      <Card className="border-hairline shadow-none transition-shadow hover:shadow-md">
        <CardContent className="flex flex-col gap-2 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ink-soft">{label}</span>
            <span className="size-2.5 rounded-full" style={{ background: STATUS_COLORS[status] }} aria-hidden="true" />
          </div>
          <span className="text-2xl font-bold tabular text-ink">{value}</span>
          {series && seriesKey && series.length > 1 && (
            <Sparkline data={series} dataKey={seriesKey} ariaLabel={`${label} trend`} />
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
```

- [ ] **Step 10: Run the component tests + typecheck**

```bash
npx vitest run src/components/UtilizationMeter.test.tsx src/components/StatusBadge.test.tsx src/components/HealthTile.test.tsx && npm run typecheck
```

Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add src/components
git commit -m "feat: add shared insight components (StatCard, StatusBadge, meters, tiles)"
```

---

## Task 5: App shell rebuild

**Files:**
- Modify: `src/app/Layout.tsx`, `src/app/UserMenu.tsx`

**Interfaces:**
- Consumes: `env` (`@/config/env`), `NavLink`/`Outlet` (react-router-dom), lucide icons, `useOrg` (`@/hooks/useReports`) for the topbar org name.
- Produces: the layout shell. **Preserve** `<nav aria-label="Sections">` wrapping the nav links (e2e depends on it).

- [ ] **Step 1: Rewrite `Layout.tsx`**

```tsx
import type { ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutGrid, FolderKanban, KeyRound, Building2, Mail, Cloud,
} from 'lucide-react'
import { env } from '@/config/env'
import { cn } from '@/lib/utils'
import { UserMenu } from './UserMenu'

interface NavItem { to: string; label: string; Icon: typeof LayoutGrid; end?: boolean }

const NAV: NavItem[] = [
  { to: '/', label: 'Overview', Icon: LayoutGrid, end: true },
  { to: '/sharepoint', label: 'SharePoint', Icon: FolderKanban },
  { to: '/licensing', label: 'Licensing', Icon: KeyRound },
  { to: '/estate', label: 'Estate', Icon: Building2 },
  { to: '/exchange', label: 'Exchange', Icon: Mail },
  { to: '/azure', label: 'Azure', Icon: Cloud },
]

export function Layout({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-canvas text-ink">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-hairline bg-surface px-4 py-5 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <span className="grid size-9 place-items-center rounded-lg bg-brand font-bold text-white">P</span>
          <span className="text-lg font-bold text-ink">Proventeq</span>
        </div>
        <nav aria-label="Sections" className="flex flex-col gap-1">
          {NAV.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-muted',
                  isActive && 'bg-brand/12 font-semibold text-brand-strong',
                )
              }
            >
              <Icon className="size-4.5" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-hairline bg-surface px-6 py-4">
          <div className="text-sm font-semibold text-ink-soft">Microsoft 365 &amp; Azure Estate</div>
          <div className="flex items-center gap-3">{!env.useMock && <UserMenu />}</div>
        </header>
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-6">{children ?? <Outlet />}</main>
      </div>

      {/* Mobile top nav */}
      <nav aria-label="Sections mobile" className="fixed inset-x-0 bottom-0 z-10 flex justify-around border-t border-hairline bg-surface py-2 md:hidden">
        {NAV.map(({ to, label, Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => cn('flex flex-col items-center gap-0.5 px-2 text-[11px] text-ink-soft', isActive && 'text-brand-strong')}>
            <Icon className="size-5" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
```

- [ ] **Step 2: Restyle `UserMenu.tsx`**

Open `src/app/UserMenu.tsx` and replace its outer container/button classes with Tailwind equivalents (keep all MSAL logic and the `useMsal` call unchanged). Wrap the trigger in `className="flex items-center gap-2 rounded-lg border border-hairline px-3 py-1.5 text-sm text-ink hover:bg-muted"` and any dropdown container in `className="rounded-lg border border-hairline bg-surface shadow-md"`. Do not change behavior.

- [ ] **Step 3: Verify build + tests + e2e**

```bash
npm run typecheck && npm run build && npm run test && npm run e2e
```

Expected: PASS — the e2e nav clicks resolve via `<nav aria-label="Sections">`.

- [ ] **Step 4: Commit**

```bash
git add src/app
git commit -m "feat: rebuild app shell with Proventeq-branded sidebar and topbar"
```

---

## Task 6: Rebuild shared presentational components on shadcn

**Files:**
- Modify: `src/components/DataTable.tsx`, `src/components/PeriodSelector.tsx`, `src/components/ErrorState.tsx`, `src/components/SkeletonCard.tsx`

**Interfaces:**
- Produces: same public APIs as today —
  - `DataTable<T>({ columns, rows })` with `columns: { key, header, render? }[]`
  - `PeriodSelector({ value, onChange })` — keep `role="group"` + `aria-label="Report period"` and `aria-pressed`
  - `ErrorState({ error })` — keep the message text + `.error-state`-equivalent
  - `SkeletonCard()`

- [ ] **Step 1: Rebuild `DataTable.tsx` on shadcn Table (unchanged API)**

```tsx
import type { ReactNode } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface Column<T> { key: string; header: string; render?: (row: T) => ReactNode }
interface DataTableProps<T extends Record<string, unknown>> { columns: Column<T>[]; rows: T[] }

export function DataTable<T extends Record<string, unknown>>({ columns, rows }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-hairline bg-surface">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key} className="text-xs uppercase tracking-wide text-muted-foreground">{col.header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="py-8 text-center text-muted-foreground">No data available</TableCell>
            </TableRow>
          ) : (
            rows.map((row, i) => (
              <TableRow key={i}>
                {columns.map((col) => (
                  <TableCell key={col.key} className="tabular text-ink">
                    {col.render ? col.render(row) : String(row[col.key] ?? '')}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
```

- [ ] **Step 2: Rebuild `PeriodSelector.tsx` (keep roles/labels)**

```tsx
import { cn } from '@/lib/utils'
import type { ReportPeriod } from '@/types/reports'

const PERIODS: ReportPeriod[] = ['D7', 'D30', 'D90', 'D180']
const LABELS: Record<ReportPeriod, string> = { D7: '7 days', D30: '30 days', D90: '90 days', D180: '180 days' }

interface Props { value: ReportPeriod; onChange: (p: ReportPeriod) => void }

export function PeriodSelector({ value, onChange }: Props) {
  return (
    <div role="group" aria-label="Report period" className="inline-flex gap-1 rounded-full border border-hairline bg-surface p-1">
      {PERIODS.map((p) => (
        <button
          key={p}
          type="button"
          aria-pressed={value === p}
          onClick={() => onChange(p)}
          className={cn(
            'rounded-full px-3.5 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-ink',
            value === p && 'bg-brand/12 text-brand-strong',
          )}
        >
          {LABELS[p]}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Rebuild `ErrorState.tsx` (keep message text)**

Keep the component's props and the exact message/hint text it renders today; only swap classes. The outer element uses `className="rounded-xl border border-hairline border-l-4 border-l-coral bg-surface px-5 py-4"`, the message `className="font-semibold text-ink"`, and the hint `className="mt-1 text-sm text-muted-foreground"`. Preserve any permission-error hint logic already present.

- [ ] **Step 4: Rebuild `SkeletonCard.tsx` on shadcn Skeleton**

```tsx
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

export function SkeletonCard() {
  return (
    <Card className="border-hairline shadow-none">
      <CardContent className="flex flex-col gap-3 p-5">
        <Skeleton className="h-3.5 w-1/2" />
        <Skeleton className="h-7 w-4/5" />
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 5: Verify**

```bash
npm run typecheck && npm run test
```

Expected: PASS (ConsumptionBar/KpiCard/TrendChart still exist and are still used by not-yet-migrated pages).

- [ ] **Step 6: Commit**

```bash
git add src/components
git commit -m "refactor: rebuild DataTable, PeriodSelector, ErrorState, SkeletonCard on shadcn"
```

---

## Task 7: Overview — cross-service health scorecard

**Files:**
- Modify: `src/sections/Overview/index.tsx`, `src/sections/Overview/Overview.test.tsx`
- Modify: `e2e/dashboard.spec.ts` (Overview test only)

**Interfaces:**
- Consumes: `useSharePoint`, `useLicenses`, `useAzureSubscriptions`, `useAzureCost`, `useActiveUsers`, `useTeams`, `useMailbox` (`@/hooks/useReports`); `HealthTile`, `InsightCallout`, `RadialGauge`, `BarBreakdown`, `SkeletonCard`, `ErrorState`; `utilizationStatus`, `STORAGE_THRESHOLDS`, `LICENSE_THRESHOLDS`; `formatBytes`, `formatNumber`.

- [ ] **Step 1: Rewrite `Overview/index.tsx`**

```tsx
import {
  useSharePoint, useLicenses, useAzureSubscriptions, useAzureCost,
  useActiveUsers, useTeams, useMailbox,
} from '@/hooks/useReports'
import { HealthTile } from '@/components/HealthTile'
import { InsightCallout } from '@/components/InsightCallout'
import { RadialGauge } from '@/components/charts/RadialGauge'
import { BarBreakdown } from '@/components/charts/BarBreakdown'
import { SectionHeader } from '@/components/SectionHeader'
import { ErrorState } from '@/components/ErrorState'
import { SkeletonCard } from '@/components/SkeletonCard'
import { Card, CardContent } from '@/components/ui/card'
import { formatBytes, formatNumber } from '@/lib/format'
import {
  utilizationStatus, STORAGE_THRESHOLDS, LICENSE_THRESHOLDS, type HealthStatus,
} from '@/lib/thresholds'

const PERIOD = 'D30'
const RANK: Record<HealthStatus, number> = { healthy: 0, watch: 1, attention: 2 }

export function Overview() {
  const sharePoint = useSharePoint(PERIOD)
  const licenses = useLicenses()
  const subscriptions = useAzureSubscriptions()
  const subId = subscriptions.data?.[0]?.subscriptionId ?? ''
  const cost = useAzureCost(subId)
  const activeUsers = useActiveUsers(PERIOD)
  const teams = useTeams(PERIOD)
  const mailbox = useMailbox(PERIOD)

  const error = sharePoint.error ?? licenses.error
  if (error) {
    return (
      <div className="flex flex-col gap-5">
        <SectionHeader title="Overview" />
        <ErrorState error={error} />
      </div>
    )
  }

  const sp = sharePoint.data
  const lic = licenses.data
  if (!sp || !lic) {
    return (
      <div className="flex flex-col gap-5">
        <SectionHeader title="Overview" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    )
  }

  const consumedSeats = lic.reduce((a, s) => a + s.consumed, 0)
  const enabledSeats = lic.reduce((a, s) => a + s.enabled, 0)
  const licenseStatus = lic
    .map((s) => utilizationStatus(s.consumed, s.enabled, LICENSE_THRESHOLDS))
    .reduce<HealthStatus>((worst, s) => (RANK[s] > RANK[worst] ? s : worst), 'healthy')
  const spStatus = utilizationStatus(sp.storageUsedBytes, sp.storageAllocatedBytes, STORAGE_THRESHOLDS)

  // Needs-attention list computed across services.
  const alerts: { status: HealthStatus; message: string }[] = []
  for (const s of lic) {
    const st = utilizationStatus(s.consumed, s.enabled, LICENSE_THRESHOLDS)
    if (st !== 'healthy') {
      const pct = Math.round((s.consumed / s.enabled) * 100)
      alerts.push({ status: st, message: `${s.skuPartNumber} at ${pct}% seat capacity (${s.available} available)` })
    }
  }
  for (const site of sp.sites) {
    const st = utilizationStatus(site.storageUsedBytes, site.storageAllocatedBytes, STORAGE_THRESHOLDS)
    if (st !== 'healthy') {
      const pct = Math.round((site.storageUsedBytes / site.storageAllocatedBytes) * 100)
      const name = site.siteUrl.replace(/\/$/, '').split('/').pop() || site.siteUrl
      alerts.push({ status: st, message: `${name} site at ${pct}% storage capacity` })
    }
  }
  alerts.sort((a, b) => RANK[b.status] - RANK[a.status])

  const spend = cost.data ? `${cost.data.currency} ${formatNumber(Math.round(cost.data.amount))}` : '—'
  const activeUsersSeries = activeUsers.data ?? []
  const teamsSeries = teams.data ?? []

  const storageByService = [
    { service: 'SharePoint', bytes: sp.storageUsedBytes },
    { service: 'Mailbox', bytes: mailbox.data?.storageUsedBytes ?? 0 },
  ]

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="Overview" />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        <HealthTile to="/sharepoint" label="SharePoint" value={`${formatNumber(sp.totalSites)} sites`} status={spStatus} />
        <HealthTile to="/licensing" label="Licensing" value={`${formatNumber(consumedSeats)} seats`} status={licenseStatus} />
        <HealthTile to="/exchange" label="Exchange"
          value={mailbox.data ? formatNumber(mailbox.data.totalMailboxes) : '—'} status="healthy" />
        <HealthTile to="/estate" label="Active users"
          value={activeUsersSeries.length ? formatNumber(activeUsersSeries[activeUsersSeries.length - 1].value) : '—'}
          status="healthy" series={activeUsersSeries} seriesKey="value" />
        <HealthTile to="/azure" label="Azure spend (MTD)" value={spend} status="healthy" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-hairline shadow-none lg:col-span-2">
          <CardContent className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-ink-soft">Needs attention</h2>
            <div className="flex flex-col gap-2">
              {alerts.length === 0
                ? <InsightCallout status="healthy" message="All services within healthy thresholds." />
                : alerts.map((a, i) => <InsightCallout key={i} status={a.status} message={a.message} />)}
            </div>
          </CardContent>
        </Card>
        <Card className="border-hairline shadow-none">
          <CardContent className="p-5">
            <h2 className="mb-1 text-sm font-semibold text-ink-soft">License utilization</h2>
            <RadialGauge value={enabledSeats ? (consumedSeats / enabledSeats) * 100 : 0}
              label={`${formatNumber(consumedSeats)} / ${formatNumber(enabledSeats)}`}
              ariaLabel="Overall license seat utilization" />
          </CardContent>
        </Card>
      </div>

      <Card className="border-hairline shadow-none">
        <CardContent className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-ink-soft">Storage used by service</h2>
          <BarBreakdown data={storageByService} categoryKey="service"
            valueKeys={[{ key: 'bytes', name: 'Storage used' }]}
            ariaLabel="Storage used by service" height={160} />
          <p className="mt-2 text-xs text-muted-foreground">
            SharePoint {formatBytes(sp.storageUsedBytes)}
            {mailbox.data ? ` · Mailbox ${formatBytes(mailbox.data.storageUsedBytes)}` : ''}
            {teamsSeries.length ? '' : ''}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Update `Overview.test.tsx` to the new labels/values**

Replace the two `it(...)` bodies' assertions (keep `renderWithProviders`):

```tsx
describe('Overview section', () => {
  it('renders health tiles for each service from fixtures', async () => {
    renderWithProviders(<Overview />)
    expect(await screen.findByText('SharePoint')).toBeInTheDocument()
    expect(await screen.findByText('Licensing')).toBeInTheDocument()
    // Azure spend tile carries the fixture currency.
    const azure = await screen.findByText('Azure spend (MTD)')
    expect(azure.closest('a')).toHaveAttribute('href', '/azure')
  })

  it('shows fixture-derived numbers: 4 SharePoint sites and 738 consumed seats', async () => {
    renderWithProviders(<Overview />)
    // sharePoint.totalSites = 4
    expect(await screen.findByText('4 sites')).toBeInTheDocument()
    // licenses consumed = 184 + 412 + 95 + 47 = 738
    expect(await screen.findByText('738 seats')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Update the Overview e2e test**

In `e2e/dashboard.spec.ts`, replace the `'Overview page renders KPI cards with fixture data'` test body with:

```ts
  test('Overview page renders health tiles with fixture data', async ({ page }) => {
    await page.goto('/')
    // SharePoint tile links to the section and shows the fixture site count.
    const spTile = page.getByRole('link', { name: /SharePoint/ })
    await expect(spTile).toBeVisible()
    await expect(page.getByText('4 sites')).toBeVisible()
  })
```

- [ ] **Step 4: Verify**

```bash
npm run typecheck && npm run test && npm run build && npm run e2e
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sections/Overview e2e/dashboard.spec.ts
git commit -m "feat: rebuild Overview as a cross-service health scorecard"
```

---

## Task 8: SharePoint section

**Files:**
- Modify: `src/sections/SharePoint/index.tsx`, `src/sections/SharePoint/SharePoint.test.tsx`

**Interfaces:**
- Consumes: `useSharePoint`; `SectionHeader`, `PeriodSelector`, `StatCard`, `UtilizationMeter`, `DataTable`, `BarBreakdown`, `DonutShare`, `ErrorState`, `SkeletonCard`; `STORAGE_THRESHOLDS`, `utilizationStatus`; `formatBytes`, `formatNumber`, `formatPercent`.

- [ ] **Step 1: Rewrite `SharePoint/index.tsx`**

```tsx
import { useState } from 'react'
import { useSharePoint } from '@/hooks/useReports'
import { SectionHeader } from '@/components/SectionHeader'
import { PeriodSelector } from '@/components/PeriodSelector'
import { StatCard } from '@/components/StatCard'
import { UtilizationMeter } from '@/components/UtilizationMeter'
import { DataTable } from '@/components/DataTable'
import { BarBreakdown } from '@/components/charts/BarBreakdown'
import { DonutShare } from '@/components/charts/DonutShare'
import { ErrorState } from '@/components/ErrorState'
import { SkeletonCard } from '@/components/SkeletonCard'
import { Card, CardContent } from '@/components/ui/card'
import { formatBytes, formatNumber, formatPercent } from '@/lib/format'
import { STORAGE_THRESHOLDS } from '@/lib/thresholds'
import type { ReportPeriod } from '@/types/reports'

const COLUMNS = [
  { key: 'siteUrl', header: 'Site URL' },
  { key: 'owner', header: 'Owner' },
  { key: 'files', header: 'Files' },
  { key: 'activeFiles', header: 'Active files' },
  { key: 'allocated', header: 'Allocated' },
  { key: 'utilization', header: 'Utilization' },
]

function siteName(url: string) {
  return url.replace(/\/$/, '').split('/').pop() || url
}

export function SharePoint() {
  const [period, setPeriod] = useState<ReportPeriod>('D30')
  const { data, isError, error } = useSharePoint(period)

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="SharePoint">
        <PeriodSelector value={period} onChange={setPeriod} />
      </SectionHeader>

      {isError ? (
        <ErrorState error={error} />
      ) : !data ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total sites" value={formatNumber(data.totalSites)} />
            <StatCard label="Total files" value={formatNumber(data.totalFiles)} />
            <StatCard label="Active files" value={formatNumber(data.activeFiles)}
              sub={`${formatPercent(data.totalFiles ? data.activeFiles / data.totalFiles : 0)} active`} />
            <StatCard label="Storage used" value={formatBytes(data.storageUsedBytes)}
              sub={`of ${formatBytes(data.storageAllocatedBytes)}`} />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="border-hairline shadow-none lg:col-span-2">
              <CardContent className="p-5">
                <h2 className="mb-3 text-sm font-semibold text-ink-soft">Top sites — used vs allocated</h2>
                <BarBreakdown
                  data={[...data.sites]
                    .sort((a, b) => b.storageUsedBytes - a.storageUsedBytes)
                    .slice(0, 8)
                    .map((s) => ({
                      site: siteName(s.siteUrl),
                      Used: Math.round(s.storageUsedBytes / 1_073_741_824),
                      Free: Math.max(0, Math.round((s.storageAllocatedBytes - s.storageUsedBytes) / 1_073_741_824)),
                    }))}
                  categoryKey="site"
                  valueKeys={[{ key: 'Used', name: 'Used (GB)' }, { key: 'Free', name: 'Free (GB)' }]}
                  stack
                  ariaLabel="Top sites by storage, used versus free in gigabytes"
                />
              </CardContent>
            </Card>
            <Card className="border-hairline shadow-none">
              <CardContent className="p-5">
                <h2 className="mb-3 text-sm font-semibold text-ink-soft">Storage distribution</h2>
                <DonutShare
                  data={data.sites.map((s) => ({ site: siteName(s.siteUrl), gb: Math.round(s.storageUsedBytes / 1_073_741_824) }))}
                  nameKey="site" valueKey="gb"
                  ariaLabel="Share of storage used across sites"
                />
              </CardContent>
            </Card>
          </div>

          <DataTable
            columns={COLUMNS}
            rows={data.sites.map((s) => ({
              siteUrl: s.siteUrl,
              owner: s.ownerDisplayName,
              files: formatNumber(s.fileCount),
              activeFiles: formatNumber(s.activeFileCount),
              allocated: formatBytes(s.storageAllocatedBytes),
              utilization: '',
              _used: s.storageUsedBytes,
              _alloc: s.storageAllocatedBytes,
            }))}
          />

          <Card className="border-hairline shadow-none">
            <CardContent className="flex flex-col gap-4 p-5">
              <h2 className="text-sm font-semibold text-ink-soft">Per-site capacity</h2>
              {data.sites.map((s) => (
                <UtilizationMeter key={s.siteId} label={siteName(s.siteUrl)}
                  used={s.storageUsedBytes} total={s.storageAllocatedBytes} thresholds={STORAGE_THRESHOLDS} />
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
```

> The table's `utilization` column renders per-site meters inline. Replace the plain `{ key: 'utilization', header: 'Utilization' }` column with a `render`: change that column entry to
> `{ key: 'utilization', header: 'Utilization', render: (r) => <div className="w-40"><UtilizationMeter label="" used={r._used as number} total={r._alloc as number} thresholds={STORAGE_THRESHOLDS} /></div> }`
> and type the column array as `Column<Record<string, unknown>>[]` by importing the `DataTable` column shape inline. Keep the standalone "Per-site capacity" card as well for narrow screens.

- [ ] **Step 2: Update `SharePoint.test.tsx`**

The current assertions (label `Total sites` → `4`, and the four site URLs in the table) still hold — `StatCard` renders the `Total sites` label and value, and site URLs remain in the table. Verify no class-based assertions exist (there are none). No change required unless a selector breaks; if `Total sites` now matches multiple nodes, scope with `screen.getByText('Total sites').closest('div')`. Leave as-is and confirm in Step 3.

- [ ] **Step 3: Verify**

```bash
npm run typecheck && npm run test && npm run build && npm run e2e
```

Expected: PASS — SharePoint e2e (site URL + `Total sites` = 4) still valid.

- [ ] **Step 4: Commit**

```bash
git add src/sections/SharePoint
git commit -m "feat: rebuild SharePoint section chart-first with full per-site detail"
```

---

## Task 9: Licensing section

**Files:**
- Modify: `src/sections/Licensing/index.tsx`

**Interfaces:**
- Consumes: `useLicenses`; `SectionHeader`, `StatCard`, `StatusBadge`, `UtilizationMeter`, `DataTable`, `BarBreakdown`, `RadialGauge`, `ErrorState`, `SkeletonCard`; `LICENSE_THRESHOLDS`, `utilizationStatus`; `formatNumber`, `formatPercent`.

- [ ] **Step 1: Rewrite `Licensing/index.tsx`**

```tsx
import { useLicenses } from '@/hooks/useReports'
import { SectionHeader } from '@/components/SectionHeader'
import { StatCard } from '@/components/StatCard'
import { StatusBadge } from '@/components/StatusBadge'
import { UtilizationMeter } from '@/components/UtilizationMeter'
import { DataTable } from '@/components/DataTable'
import { BarBreakdown } from '@/components/charts/BarBreakdown'
import { RadialGauge } from '@/components/charts/RadialGauge'
import { ErrorState } from '@/components/ErrorState'
import { SkeletonCard } from '@/components/SkeletonCard'
import { Card, CardContent } from '@/components/ui/card'
import { formatNumber, formatPercent } from '@/lib/format'
import { LICENSE_THRESHOLDS, utilizationStatus } from '@/lib/thresholds'

const COLUMNS = [
  { key: 'skuPartNumber', header: 'SKU' },
  { key: 'consumed', header: 'Consumed' },
  { key: 'enabled', header: 'Enabled' },
  { key: 'available', header: 'Available' },
  { key: 'pct', header: '% consumed' },
  { key: 'status', header: 'Status' },
]

export function Licensing() {
  const { data, isError, error } = useLicenses()

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="Licensing" />

      {isError ? (
        <ErrorState error={error} />
      ) : !data ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (() => {
        const consumed = data.reduce((a, s) => a + s.consumed, 0)
        const enabled = data.reduce((a, s) => a + s.enabled, 0)
        const available = data.reduce((a, s) => a + s.available, 0)
        return (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              <StatCard label="Seats consumed" value={formatNumber(consumed)}
                sub={`${formatPercent(enabled ? consumed / enabled : 0)} of enabled`} />
              <StatCard label="Seats enabled" value={formatNumber(enabled)} />
              <StatCard label="Seats available" value={formatNumber(available)} />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="border-hairline shadow-none lg:col-span-2">
                <CardContent className="p-5">
                  <h2 className="mb-3 text-sm font-semibold text-ink-soft">Seats by SKU</h2>
                  <BarBreakdown
                    data={data.map((s) => ({ sku: s.skuPartNumber, Consumed: s.consumed, Available: s.available }))}
                    categoryKey="sku"
                    valueKeys={[{ key: 'Consumed', name: 'Consumed' }, { key: 'Available', name: 'Available' }]}
                    stack
                    ariaLabel="Consumed versus available seats per SKU"
                  />
                </CardContent>
              </Card>
              <Card className="border-hairline shadow-none">
                <CardContent className="p-5">
                  <h2 className="mb-1 text-sm font-semibold text-ink-soft">Total utilization</h2>
                  <RadialGauge value={enabled ? (consumed / enabled) * 100 : 0}
                    label={`${formatNumber(consumed)} / ${formatNumber(enabled)}`}
                    ariaLabel="Total seat utilization" />
                </CardContent>
              </Card>
            </div>

            <DataTable
              columns={COLUMNS}
              rows={data.map((s) => {
                const st = utilizationStatus(s.consumed, s.enabled, LICENSE_THRESHOLDS)
                return {
                  skuPartNumber: s.skuPartNumber,
                  consumed: formatNumber(s.consumed),
                  enabled: formatNumber(s.enabled),
                  available: formatNumber(s.available),
                  pct: formatPercent(s.enabled ? s.consumed / s.enabled : 0),
                  status: '',
                  render_status: <StatusBadge status={st} />,
                }
              })}
            />

            <Card className="border-hairline shadow-none">
              <CardContent className="flex flex-col gap-4 p-5">
                <h2 className="text-sm font-semibold text-ink-soft">Per-SKU capacity</h2>
                {data.map((s) => (
                  <UtilizationMeter key={s.skuId} label={s.skuPartNumber}
                    used={s.consumed} total={s.enabled} thresholds={LICENSE_THRESHOLDS} />
                ))}
              </CardContent>
            </Card>
          </>
        )
      })()}
    </div>
  )
}
```

> For the `status` column, give it a `render`: `{ key: 'status', header: 'Status', render: (r) => r.render_status as ReactNode }` (import `ReactNode` from `react`). Keep the `skuPartNumber` value in a plain cell so the e2e `getByRole('cell', { name: 'SPE_E5' })` still matches.

- [ ] **Step 2: Verify (Licensing e2e: SKU cell + progressbar)**

```bash
npm run typecheck && npm run test && npm run build && npm run e2e
```

Expected: PASS — `SPE_E5` renders in a table cell; `UtilizationMeter` provides `role="progressbar"`.

- [ ] **Step 3: Commit**

```bash
git add src/sections/Licensing
git commit -m "feat: rebuild Licensing section with utilization gauge and capacity signals"
```

---

## Task 10: Estate section

**Files:**
- Modify: `src/sections/Estate/index.tsx`

**Interfaces:**
- Consumes: `useOrg`, `useActiveUsers`, `useOneDrive`, `useTeams`; `SectionHeader`, `PeriodSelector`, `StatCard`, `AreaTrend`, `ErrorState`, `SkeletonCard`; `percentDelta`; `formatBytes`, `formatNumber`.

- [ ] **Step 1: Rewrite `Estate/index.tsx`**

```tsx
import { useState } from 'react'
import { useOrg, useActiveUsers, useOneDrive, useTeams } from '@/hooks/useReports'
import { SectionHeader } from '@/components/SectionHeader'
import { PeriodSelector } from '@/components/PeriodSelector'
import { StatCard } from '@/components/StatCard'
import { AreaTrend } from '@/components/charts/AreaTrend'
import { ErrorState } from '@/components/ErrorState'
import { SkeletonCard } from '@/components/SkeletonCard'
import { Card, CardContent } from '@/components/ui/card'
import { formatBytes, formatNumber } from '@/lib/format'
import { percentDelta } from '@/lib/trend'
import type { ReportPeriod } from '@/types/reports'
import type { UsagePoint } from '@/types/reports'

function last(points: UsagePoint[]): number {
  return points.length ? points[points.length - 1].value : 0
}

export function Estate() {
  const [period, setPeriod] = useState<ReportPeriod>('D30')
  const org = useOrg()
  const activeUsers = useActiveUsers(period)
  const oneDrive = useOneDrive(period)
  const teams = useTeams(period)

  const error = org.error ?? activeUsers.error ?? oneDrive.error ?? teams.error
  const ready = org.data && activeUsers.data && oneDrive.data && teams.data

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="Estate">
        <PeriodSelector value={period} onChange={setPeriod} />
      </SectionHeader>

      {error ? (
        <ErrorState error={error} />
      ) : !ready ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          <Card className="border-hairline shadow-none">
            <CardContent className="flex flex-wrap gap-x-10 gap-y-2 p-5 text-sm">
              <div><span className="text-muted-foreground">Organization</span><div className="font-semibold text-ink">{org.data!.displayName}</div></div>
              <div><span className="text-muted-foreground">Verified domain</span><div className="font-semibold text-ink">{org.data!.verifiedDomain}</div></div>
              <div><span className="text-muted-foreground">Country</span><div className="font-semibold text-ink">{org.data!.country ?? '—'}</div></div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatCard label="Active users" value={formatNumber(last(activeUsers.data!))}
              delta={percentDelta(activeUsers.data!.map((p) => p.value))} />
            <StatCard label="OneDrive usage" value={formatBytes(last(oneDrive.data!))}
              delta={percentDelta(oneDrive.data!.map((p) => p.value))} />
            <StatCard label="Teams activity" value={formatNumber(last(teams.data!))}
              delta={percentDelta(teams.data!.map((p) => p.value))} />
          </div>

          <Card className="border-hairline shadow-none">
            <CardContent className="p-5">
              <h2 className="mb-3 text-sm font-semibold text-ink-soft">Active users</h2>
              <AreaTrend data={activeUsers.data!} xKey="date" series={[{ key: 'value', name: 'Active users' }]} ariaLabel="Active users over time" />
            </CardContent>
          </Card>
          <Card className="border-hairline shadow-none">
            <CardContent className="p-5">
              <h2 className="mb-3 text-sm font-semibold text-ink-soft">OneDrive usage</h2>
              <AreaTrend data={oneDrive.data!} xKey="date" series={[{ key: 'value', name: 'Storage used (bytes)' }]} ariaLabel="OneDrive storage over time" />
            </CardContent>
          </Card>
          <Card className="border-hairline shadow-none">
            <CardContent className="p-5">
              <h2 className="mb-3 text-sm font-semibold text-ink-soft">Teams activity</h2>
              <AreaTrend data={teams.data!} xKey="date" series={[{ key: 'value', name: 'Teams activity' }]} ariaLabel="Teams activity over time" />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify (Estate e2e: org name `Contoso Ltd`)**

```bash
npm run typecheck && npm run test && npm run build && npm run e2e
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/sections/Estate
git commit -m "feat: rebuild Estate section with trend deltas and formatted OneDrive usage"
```

---

## Task 11: Exchange section

**Files:**
- Modify: `src/sections/Exchange/index.tsx`

**Interfaces:**
- Consumes: `useMailbox`, `useEmailActivity`; `SectionHeader`, `PeriodSelector`, `StatCard`, `AreaTrend`, `DonutShare`, `ErrorState`, `SkeletonCard`; `formatBytes`, `formatNumber`.

- [ ] **Step 1: Rewrite `Exchange/index.tsx`**

```tsx
import { useState } from 'react'
import { useMailbox, useEmailActivity } from '@/hooks/useReports'
import { SectionHeader } from '@/components/SectionHeader'
import { PeriodSelector } from '@/components/PeriodSelector'
import { StatCard } from '@/components/StatCard'
import { AreaTrend } from '@/components/charts/AreaTrend'
import { DonutShare } from '@/components/charts/DonutShare'
import { ErrorState } from '@/components/ErrorState'
import { SkeletonCard } from '@/components/SkeletonCard'
import { Card, CardContent } from '@/components/ui/card'
import { formatBytes, formatNumber } from '@/lib/format'
import type { ReportPeriod } from '@/types/reports'

export function Exchange() {
  const [period, setPeriod] = useState<ReportPeriod>('D30')
  const mailbox = useMailbox(period)
  const emailActivity = useEmailActivity(period)

  const error = mailbox.error ?? emailActivity.error
  const mb = mailbox.data
  const ea = emailActivity.data

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="Exchange">
        <PeriodSelector value={period} onChange={setPeriod} />
      </SectionHeader>

      {error ? (
        <ErrorState error={error} />
      ) : !mb || !ea ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (() => {
        const inactive = Math.max(0, mb.totalMailboxes - mb.activeMailboxes)
        const avg = mb.totalMailboxes ? mb.storageUsedBytes / mb.totalMailboxes : 0
        return (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard label="Total mailboxes" value={formatNumber(mb.totalMailboxes)} />
              <StatCard label="Active mailboxes" value={formatNumber(mb.activeMailboxes)}
                sub={`${formatNumber(inactive)} inactive`} />
              <StatCard label="Mailbox storage used" value={formatBytes(mb.storageUsedBytes)} />
              <StatCard label="Avg mailbox size" value={formatBytes(avg)} />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="border-hairline shadow-none lg:col-span-2">
                <CardContent className="p-5">
                  <h2 className="mb-3 text-sm font-semibold text-ink-soft">Email activity</h2>
                  <AreaTrend data={ea} xKey="date" stack
                    series={[{ key: 'send', name: 'Sent' }, { key: 'receive', name: 'Received' }, { key: 'read', name: 'Read' }]}
                    ariaLabel="Email sent, received and read over time" />
                </CardContent>
              </Card>
              <Card className="border-hairline shadow-none">
                <CardContent className="p-5">
                  <h2 className="mb-3 text-sm font-semibold text-ink-soft">Mailbox activity</h2>
                  <DonutShare
                    data={[{ name: 'Active', value: mb.activeMailboxes }, { name: 'Inactive', value: inactive }]}
                    nameKey="name" valueKey="value"
                    ariaLabel="Active versus inactive mailboxes" />
                </CardContent>
              </Card>
            </div>
          </>
        )
      })()}
    </div>
  )
}
```

- [ ] **Step 2: Verify (Exchange e2e: `Total mailboxes` = 742)**

```bash
npm run typecheck && npm run test && npm run build && npm run e2e
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/sections/Exchange
git commit -m "feat: rebuild Exchange section with inactive/avg mailbox insights"
```

---

## Task 12: Azure section

**Files:**
- Modify: `src/sections/Azure/index.tsx`

**Interfaces:**
- Consumes: `useAzureSubscriptions`, `useAzureResourceCounts`, `useAzureCost`; `SectionHeader`, `StatCard`, `StatusBadge`, `BarBreakdown`, `DataTable`, `ErrorState`, `SkeletonCard`; shadcn `Select`; `formatNumber`.

- [ ] **Step 1: Rewrite `Azure/index.tsx`**

```tsx
import { useState } from 'react'
import { useAzureSubscriptions, useAzureResourceCounts, useAzureCost } from '@/hooks/useReports'
import { SectionHeader } from '@/components/SectionHeader'
import { StatCard } from '@/components/StatCard'
import { StatusBadge } from '@/components/StatusBadge'
import { BarBreakdown } from '@/components/charts/BarBreakdown'
import { DataTable } from '@/components/DataTable'
import { ErrorState } from '@/components/ErrorState'
import { SkeletonCard } from '@/components/SkeletonCard'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { formatNumber } from '@/lib/format'

const COLUMNS = [
  { key: 'type', header: 'Resource type' },
  { key: 'count', header: 'Count' },
]

function shortType(t: string) {
  return t.split('/').pop() || t
}

export function Azure() {
  const subscriptions = useAzureSubscriptions()
  const [selectedSubId, setSelectedSubId] = useState('')
  const subId = selectedSubId || subscriptions.data?.[0]?.subscriptionId || ''
  const resourceCounts = useAzureResourceCounts(subId)
  const cost = useAzureCost(subId)

  if (subscriptions.isError) {
    return (
      <div className="flex flex-col gap-6">
        <SectionHeader title="Azure" />
        <ErrorState error={subscriptions.error} />
      </div>
    )
  }
  if (subscriptions.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <SectionHeader title="Azure" />
        <div className="grid grid-cols-2 gap-4"><SkeletonCard /><SkeletonCard /></div>
      </div>
    )
  }

  const activeSub = subscriptions.data.find((s) => s.subscriptionId === subId)
  const totalResources = resourceCounts.data?.reduce((a, r) => a + r.count, 0) ?? 0
  const costLabel = cost.isPending ? '—' : cost.isError ? 'Unavailable'
    : `${cost.data.currency} ${formatNumber(Math.round(cost.data.amount))}`

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader title="Azure">
        <Select value={subId} onValueChange={setSelectedSubId}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Subscription" /></SelectTrigger>
          <SelectContent>
            {subscriptions.data.map((sub) => (
              <SelectItem key={sub.subscriptionId} value={sub.subscriptionId}>{sub.displayName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SectionHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Azure spend (MTD)" value={costLabel} />
        <StatCard label="Total resources" value={formatNumber(totalResources)} />
        <Card className="border-hairline shadow-none">
          <CardContent className="flex flex-col gap-2 p-5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subscription state</span>
            <div>{activeSub && <StatusBadge status={activeSub.state === 'Enabled' ? 'healthy' : 'attention'} label={activeSub.state} />}</div>
          </CardContent>
        </Card>
      </div>

      {resourceCounts.isError ? (
        <ErrorState error={resourceCounts.error} />
      ) : resourceCounts.isPending ? (
        <div className="grid grid-cols-2 gap-4"><SkeletonCard /></div>
      ) : (
        <>
          <Card className="border-hairline shadow-none">
            <CardContent className="p-5">
              <h2 className="mb-3 text-sm font-semibold text-ink-soft">Resource mix</h2>
              <BarBreakdown
                data={[...resourceCounts.data].sort((a, b) => b.count - a.count).map((r) => ({ type: shortType(r.type), count: r.count }))}
                categoryKey="type" valueKeys={[{ key: 'count', name: 'Count' }]}
                ariaLabel="Azure resource counts by type" height={320} />
            </CardContent>
          </Card>
          <DataTable columns={COLUMNS} rows={resourceCounts.data.map((r) => ({ type: r.type, count: formatNumber(r.count) }))} />
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify (Azure e2e: `GBP`, `12,848`, resource type `Microsoft.Compute/virtualMachines`)**

The e2e asserts the full resource type string appears — it is preserved in the `DataTable` (`type: r.type`). The `Resource mix` chart uses the short name, but the table keeps the full type, so `getByText('Microsoft.Compute/virtualMachines')` still matches.

```bash
npm run typecheck && npm run test && npm run build && npm run e2e
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/sections/Azure
git commit -m "feat: rebuild Azure section with resource-mix chart and totals"
```

---

## Task 13: Cleanup — remove dead code, legacy CSS, final verification

**Files:**
- Delete: `src/components/KpiCard.tsx`, `src/components/TrendChart.tsx`, `src/components/ConsumptionBar.tsx`, `src/components/ConsumptionBar.test.tsx`
- Create: `src/components/UtilizationMeter.test.tsx` already exists (Task 4) — no migration needed beyond deleting the old test
- Modify: `src/index.css` (remove the legacy block), `src/App.css` (remove now-unused rules or delete if empty)

**Interfaces:**
- Consumes: nothing new. This task only removes code proven unused.

- [ ] **Step 1: Confirm the dead components have no importers**

```bash
grep -rn "KpiCard\|TrendChart\|ConsumptionBar" src --include=*.tsx --include=*.ts | grep -v "UtilizationMeter"
```

Expected: no matches in `src/sections` or `src/app` (only the files being deleted). If any remain, migrate that usage to `StatCard`/chart wrappers/`UtilizationMeter` before deleting.

- [ ] **Step 2: Delete dead files**

```bash
git rm src/components/KpiCard.tsx src/components/TrendChart.tsx src/components/ConsumptionBar.tsx src/components/ConsumptionBar.test.tsx
```

- [ ] **Step 3: Remove the legacy CSS block**

In `src/index.css`, delete everything below the `/* ===== LEGACY component classes ... ===== */` marker (added in Task 1). Then check `src/App.css`: remove any rule whose class no longer appears in `src` (`grep -rn "class-name" src`); if the file ends up empty, `git rm src/App.css` and remove its `import './App.css'` from `src/App.tsx`.

- [ ] **Step 4: Rebrand the bootstrap-error markup (uses retired classes)**

In `src/main.tsx`, the `renderBootstrapError` fallback uses `className="error-state"` etc., which no longer exist. Replace those classNames with inline Tailwind-free styles or keep a minimal inline style object so the fallback renders standalone (it mounts before the app CSS is guaranteed). Use:

```tsx
<div style={{ maxWidth: 480, width: '100%', background: '#fff', border: '1px solid #e3e6ea', borderLeft: '3px solid #f98d50', borderRadius: 12, padding: '1.1rem 1.25rem' }}>
  <p style={{ fontWeight: 600, margin: 0 }}>Couldn&apos;t start the dashboard</p>
  <p style={{ marginTop: '.35rem', fontSize: '.85rem', color: '#6b7280' }}>Check the app configuration or refresh to try again.</p>
  <p style={{ marginTop: '.75rem', fontSize: '.85rem', color: '#6b7280', wordBreak: 'break-word' }}>{message}</p>
</div>
```

- [ ] **Step 5: Full verification sweep**

```bash
npm run lint && npm run typecheck && npm run test && npm run build && npm run e2e
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove legacy components and CSS after redesign migration"
```

---

## Self-Review

**Spec coverage:**
- Light Proventeq theme, teal palette, Open Sans → Task 1 (`@theme`, fonts). ✓
- Tailwind v4 + shadcn on Vite → Task 1. ✓
- Recharts re-themed → Task 3 (`chartTheme`, wrappers). ✓
- Insight/threshold layer → Task 2 (`thresholds`, `trend`), used in Tasks 7–12. ✓
- New shared components (StatCard, StatusBadge, DeltaIndicator, UtilizationMeter, InsightCallout, SectionHeader, HealthTile) → Task 4. ✓
- App shell → Task 5. ✓
- Chart-led sections + every dropped API field surfaced (SP active files/allocated/per-site util; Licensing enabled/%/status; Estate deltas + formatted OneDrive; Exchange inactive + avg size; Azure total + state + mix) → Tasks 7–12. ✓
- Tests stay green (text/role based), class-based assertions updated → Tasks 7–9 update tests; every task ends on `test`/`e2e`. ✓
- Untouched data/auth layers → enforced by Global Constraints and file lists. ✓
- YAGNI (no new API calls, no export, no dark mode) → honored throughout. ✓

**Placeholder scan:** No TBD/TODO; all steps carry concrete code or exact commands. The two inline `render:` refinements (SharePoint utilization column, Licensing status column) are described with exact code in their notes.

**Type consistency:** `HealthStatus`, `Thresholds`, `utilizationStatus`, `percentDelta`, `formatPercent`/`formatSignedPercent`, `CHART_COLORS`/`STATUS_COLORS`, and every component prop signature are defined once (Tasks 2–4) and consumed with matching names/types in Tasks 5–12. Wrapper prop names (`series`/`valueKeys`/`categoryKey`/`nameKey`/`valueKey`) are used consistently in the section tasks.

**Known follow-through for the implementer:** shadcn's generated `Progress` may need a one-line edit to color its indicator from `--progress-color` (noted in Task 4, Step 4). Verify the first `shadcn add` output compiles before building the rest (Task 1).
