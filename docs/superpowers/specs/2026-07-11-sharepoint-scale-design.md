# SharePoint at Scale + Honest Storage Metric — Design

**Date:** 2026-07-11
**Status:** Approved (follow-up to the visual redesign), ready to implement
**Branch:** `feat/proventeq-visual-redesign` (extends open PR #4)

## Why

The SharePoint section was built/tested against 4 fixture sites. Real tenants have
**100–10,000 sites**, and Graph's per-site `storageAllocatedBytes` is the site
**quota (default 25 TB)** — a denominator the tenant-level limit means is never
approached, so a per-site "utilization %" (used ÷ 25 TB) is ~0% and meaningless.
The usage-report API does not expose the real tenant storage limit.

## Decisions

1. **Storage metric = absolute used + share of tenant total.** No per-site "% of
   quota" anywhere. Rank sites by absolute `storageUsedBytes` (largest consumers
   first). Each row shows its **share of the total used** (`used / totalUsed`).
   Drop all `used/allocated` utilization and any "capacity/attention" signal that
   requires a real quota we don't have.
2. **Site table = virtualized infinite scroll** (`@tanstack/react-virtual`),
   windowed rows only. **Search** (site URL / owner) + **column sort**; default
   sort **storage used ↓**. Must stay smooth at 10k rows.
3. **Storage distribution donut = top-N sites + "Other"** (aggregate the tail),
   so the ring stays readable at scale.
4. **Top consumers bar** = top-N by storage **used** (drop the used-vs-allocated
   stacking — allocated is the meaningless 25 TB quota).
5. **Remove the per-site capacity meter card** (one meter per site = fatal at 10k;
   also redundant).
6. **Overview:** SharePoint tile status becomes neutral (`healthy`) — no storage
   capacity alarm it can't compute honestly; remove SharePoint storage entries
   from "Needs attention" (licensing alerts remain). **Cap** the needs-attention
   list at N (e.g. 6) + "…and X more".
7. **Chart mount animation:** disable the initial Recharts animation (keep
   reduced-motion behavior) so charts paint immediately instead of showing only
   the legend swatches ("coloured oblongs") for ~1.5 s.
8. **Fixtures:** generate a large deterministic site set (~2,500) plus the 4 named
   sites, so virtualization/scale is exercised in mock mode and e2e.

## Component changes

- New `src/components/SiteTable.tsx` — virtualized, searchable, sortable table for
  the site list (keeps the generic `DataTable` for small tables elsewhere).
- `src/components/charts/*` — default `isAnimationActive` off (reduced-motion still
  respected).
- `src/sections/SharePoint/index.tsx` — KPIs (drop "of allocated"), top-consumers
  bar, top-N+Other donut, `SiteTable`, remove per-site meter card.
- `src/sections/Overview/index.tsx` — neutral SharePoint tile; drop SP storage
  alerts; cap alert list.
- `src/data/fixtures.ts` — large deterministic site generator (data layer change
  justified by the new scale requirement; `DataSource` interface unchanged).
- Update `SharePoint.test.tsx`, `Overview.test.tsx`, `e2e/dashboard.spec.ts` for
  the new counts + search-driven assertions.

## Out of scope

- No configurable tenant quota / real capacity alarm (chosen "share-of-total, no
  fake %").
- No new API calls; `DataSource` interface unchanged.
- Other sections unchanged.
