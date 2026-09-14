# M365 Storage Overview — a Graph-only storage optimisation report

**Date:** 2026-09-02
**Status:** Approved, ready for implementation planning
**Branch:** `feat/m365-storage-overview` (off `feat/sharepoint-scale`, which is unmerged and is a hard dependency — see [Dependency on `feat/sharepoint-scale`](#dependency-on-featsharepoint-scale))
**ADO:** Feature 96763 — "Storage optimisation marketing app" (org `proventeq`, project `CS`, area `CS\PCSCore\New Development`)

---

## Why

Proventeq's P365 product has a **Storage Optimisation** report (route
`/reports/storage-optimization`) that customers rate highly. It is only reachable
after a full P365 discovery run — days of crawling, a deployed backend, a signed
contract.

This app is the **sneak peek**: the same report, same visual language, built from
five direct Microsoft Graph report calls (plus a tenant-name lookup) that any
tenant admin can authorise in under a minute. It shows a prospect their own real numbers, and the gaps in it are the
argument for the full product.

The marketing motive is Proventeq's. The **user is always a real tenant admin
looking at their own tenant** — never a fabricated demo. That constrains
everything below: nothing may be estimated silently, and nothing discovery-only
may be faked to fill a layout.

## Constraints (fixed, agreed)

| | |
|---|---|
| **Repo** | Repurpose `365-overview` in place. Its `auth/` / `clients/` / `config/` / `data/` layers are stable and stay. |
| **Backend** | **None.** Browser-only SPA. Prospect tenant data never leaves the admin's browser. |
| **Tenancy** | Multi-tenant Entra app registration, Proventeq-hosted, delegated admin consent to Graph. |
| **Deployment** | Static bundle on Vercel, as today. |
| **Look & feel** | Mirror P365's report layout, section structure and chart choices — on this repo's existing Tailwind v4 + shadcn + Recharts stack. Do **not** pull P365's private `@proventeq/pcl-material-ui-lib`. |
| **Workloads** | SharePoint + OneDrive, pools kept strictly separate. |
| **Sections** | Three: Distribution, Growth, Offenders. **No ROT section** — see [What is deliberately absent](#what-is-deliberately-absent). |
| **Lead capture** | **Zero.** No analytics, no form, no beacon. This is what makes the privacy claim true. |

---

## Reference: what P365's report contains

*Inlined so this document is self-contained — the implementer works in
`365-overview` and cannot read the ProventeqCloud monorepo.*

P365's report is served by `GET /api/storage/{workspaceId}/overview` returning
`StorageOverviewDto`, and rendered by five components: `StorageKpiCards`,
`DistributionSection`, `GrowthSection`, `RotSection`, `OffendersSection`.

### Its sections and headings

| Section | Title | Subtitle |
|---|---|---|
| KPI group 1 | Workspace content | What discovery found in this workspace — the content analysed and the redundant, obsolete or trivial data worth reclaiming |
| KPI group 2 | Tenant capacity | Tenant-wide Microsoft 365 storage measured against your licensed entitlement |
| ① | Current storage distribution | Where storage sits today — quota usage, file categories, and which files drive the volume |
| ② | Future state & growth impact | Where storage is heading at the current growth rate — and what it costs if nothing changes |
| ③ | Redundant, obsolete & trivial content | How much of the analysed content is redundant, obsolete or trivial — and the yearly saving if it's reclaimed |
| ④ | Main offenders | The sites, libraries and people driving the most storage |

KPI cards: **Storage used**, **Remaining**, **Content analysed**, **ROT
reclaimable**, **Cost of doing nothing**, **Forecast exhaustion**.

### Its numeric constants (port these verbatim)

```
ForecastWindowMonths            = 6
ForecastCriticalThresholdMonths = 12     // <12mo runway  → "Critical"
ForecastWarningThresholdMonths  = 36     // 12–36mo       → "Warning" / "At risk"
ForecastHorizonMonths           = 120    // beyond 10y    → "no exhaustion within N years"
ForecastCostYears               = 3
AverageDaysPerMonth             = 30.44
DominantMonthShareThreshold     = 0.55
GbInBytes                       = 1_073_741_824      // binary GB, matches Microsoft
TopNItems                       = 10
MonthsPerYear                   = 12
```

### Its hard-won correctness rules (all of these apply here too)

These come from comments in P365's own DTO and service, each recording a bug
that reached review. They are requirements, not advice:

1. **An unknown entitlement produces `null`, never `0`.** Rendering "unknown" as
   "£0.00" asserts there is nothing to save — a different and unsupported claim.
   P365's earlier single-field version forced unknown entitlement to zero
   headroom and therefore billed 100% of growth, making an *unknown* entitlement
   cost **more** than a known one.
2. **A reconstructed history must never render like a measured one.** P365 walks
   history backwards from today's usage when it lacks quota captures; rendered
   identically to a real series it read as a genuine measurement of steady
   growth, and was read that way in review. *(This app is immune — see
   [Growth](#growth-measured-not-reconstructed).)*
3. **Never mix an OneDrive-inclusive numerator with a SharePoint-only
   denominator.** OneDrive is a separate pool; comparing it against SharePoint
   pooled headroom is a category error.
4. **The client must not recompute what the model computes.** The P365 SPA once
   recalculated the growth rate over a different window by a different method,
   and the chart disagreed with the headline figures on the same screen.
5. **Multi-year cost accrues on mid-year averages, not year-end volume.** Overage
   climbs from zero across year 1; billing year-end volume for the whole year
   overstates it, and this number is used to justify spend.

### Copy worth porting

P365's phrasing has been through review with customers; reuse it where the
figure is the same. Selected strings (P365 i18n keys shown for traceability):

- `growth.forecastIndeterminateNote` — *"There are too few months of measured
  growth to project a trajectory. This is not an all-clear — the forecast will
  appear once more history has accumulated."*
- `growth.alreadyExhaustedNote` — *"The tenant is already using more than its
  pooled entitlement, so there is no future exhaustion date to project.
  Procurement or cleanup is needed now."*
- `growth.estimatedQuotaNote` — *"Your storage quota was estimated from licence
  counts rather than read from Microsoft, so the headroom and cost figures are
  approximate."*
- `growth.noExhaustionNote` — *"At the current growth rate the tenant stays
  within its pooled entitlement for at least the next {years} years."*
- `kpi.costOfNothingHint` — *"What a year of growth would add to your bill, at
  {rate}/GB per month. Growth that still fits inside your entitlement adds
  nothing."*
- `quota.used` / `quota.remaining` — *"Used"* / *"Available"*
- `offenders.sitesTitle` — *"Biggest sites & OneDrives by storage"*

---

## The data: what Graph can and cannot give us

All report endpoints must be called on **`/beta`** with
`?$format=application/json`. On `/v1.0` they answer with a `302` to a CSV
download and reject `$format=application/json` outright. The repo's
`graphClient` already passes absolute URLs through unchanged, and
`REPORTS_BASE` already points at `https://graph.microsoft.com/beta/reports`.

### The five calls

| # | Call | Paged | Feeds |
|---|---|---|---|
| 1 | `getSharePointSiteUsageDetail(period='D180')` | yes | SharePoint pool composition, top sites, SharePoint-vs-Teams split, deleted-but-billing, dormancy |
| 2 | `getOneDriveUsageAccountDetail(period='D180')` | yes | OneDrive pool total, top drives, drives near their own cap, dormant/deleted drives |
| 3 | `getSharePointSiteUsageStorage(period='D180')` | no | Daily measured SharePoint growth series |
| 4 | `getOneDriveUsageStorage(period='D180')` | no | Daily measured OneDrive growth series |
| 5 | `/v1.0/subscribedSkus` | yes | Licence counts for the entitlement estimate |

Plus `/v1.0/organization` for the tenant display name in the header.

**Scopes:** `User.Read`, `Reports.Read.All`, `Organization.Read.All` — exactly
what the repo already requests. No new permission is needed. ARM scopes are
removed.

### Verified field inventories

`getSharePointSiteUsageDetail` — *Report Refresh Date, Site Id, Site URL, Owner
Display Name, **Is Deleted**, **Last Activity Date**, File Count, Active File
Count, Page View Count, Visited Page Count, Storage Used (Byte), Storage
Allocated (Byte), **Root Web Template**, Owner Principal Name, Report Period*

`getOneDriveUsageAccountDetail` — *Report Refresh Date, Site URL, Owner Display
Name, Is Deleted, Last Activity Date, File Count, Active File Count, Storage Used
(Byte), **Storage Allocated (Byte)**, Owner Principal Name, Report Period*

`getSharePointSiteUsageStorage` / `getOneDriveUsageStorage` — *Report Refresh
Date, Site Type, Storage Used (Byte), Report Date, Report Period*

> **Note the absence.** Despite its documentation summary reading "storage
> allocated and consumed", `getSharePointSiteUsageStorage` returns **no
> allocated-bytes column**. There is therefore *no* measured tenant entitlement
> anywhere in Graph. This was checked against Microsoft's published schema, not
> assumed, and it is the reason for the estimate-plus-override design below.

Graph reports return numerics as **strings** and booleans as `"True"`/`"False"`.
The repo's existing `num()` helper covers the first; parsers must handle the
second.

### What is deliberately absent

Discovery-only, and therefore **omitted entirely** — not zero-filled, not
greyed out, not teased with fake figures:

`ROTReclaimableBytes` · `ROTContentTotalBytes` · `ROTCount` · ROT composition
(redundant/obsolete/trivial) · `ByFileType` · `ByFileCategory` ·
`VersionOverheadBytes` · `TopLibrariesByVersionOverhead` · `TopUsersByStorage` ·
`StorageReconciliation` · `DiscoveryScopeBytes` / `DiscoveryScopeItemCount` ·
duplicate detection.

Consequently P365's **ROT section and its "Workspace content" KPI group do not
exist in this app.** Three sections, one KPI group of four.

---

## The entitlement problem

### What Microsoft actually specifies

From the [SharePoint limits service
description](https://learn.microsoft.com/en-us/office365/servicedescriptions/sharepoint-online-service-description/sharepoint-online-limits):

- Total storage per organization = **1 TB + 10 GB per licence *purchased***.
  Per **licence**, not per licensed *user* — so the input is
  `subscribedSkus[].prepaidUnits.enabled`, not a user count.
- **F1 / F3 plans:** a flat **1 TB**, no per-licence increment.
- **OneDrive standalone plans:** **0.5 GB** per licence.
- **Visio Plan 2, Project Plan 3/5:** ~10 GB per licence.
- Footnote 4, decisively: the tenant total is *"Not including the OneDrive
  created for each licensed user."*
- *"You can purchase an unlimited amount of more SharePoint storage"* — the
  Extra File Storage add-on, which **Graph cannot see**.
- SharePoint storage is binary GB (1 GB = 2³⁰). Recycle bins count toward the
  limit. Max 25 TB per site collection.

From the [OneDrive service
description](https://learn.microsoft.com/en-us/office365/servicedescriptions/onedrive-for-business-service-description):
OneDrive is **per user** — 1 TB (E3/E5 raisable to 5 TB on request), 2 GB on F3.

### The design

```
entitledBytes = 1 TiB
              + Σ over subscribedSkus ( prepaidUnits.enabled × contributionGbFor(skuPartNumber) )

contributionGbFor:  10 GB  default
                   0.5 GB  OneDrive standalone SKUs
                     0 GB  F1 / F3 SKUs
```

Presented as **"estimated from licence counts — excludes any Extra File Storage
add-on"**, with every derived figure (headroom, exhaustion date, all four cost
figures) carrying a caveat marker.

An **admin override field** in settings accepts the real figure from the
SharePoint admin centre. Setting it flips `entitlementIsMeasured` to true and
every caveat disappears. The override is not a nicety — the Extra File Storage
add-on is genuinely unknowable from Graph, so without it a customer who has
bought extra storage sees a wrong entitlement with no way to correct it.

Persisted in `localStorage`, per browser. There is no backend to store it in,
and that is the intended trade.

---

## The two pools

|  | SharePoint | OneDrive |
|---|---|---|
| **Used** | latest point of `getSharePointSiteUsageStorage` | latest point of `getOneDriveUsageStorage` |
| **Entitled** | estimated (above), overridable | **n/a — not pooled** |
| Quota gauge | ✅ | ❌ |
| Headroom / forecast / cost | ✅ | ❌ |
| Growth trend | ✅ | ✅ (own series) |
| Top-N in offenders | ✅ | ✅ |

**Why OneDrive gets no quota gauge.** OneDrive allocation is per user, not
pooled. Summing `storageAllocatedInBytes` across drives yields a number, but not
a ceiling: a tenant at 5% of aggregate allocation can still have individual users
sitting at their personal 1 TB cap, and an aggregate gauge would show that tenant
as comfortably healthy. The honest per-drive metric is instead **the count of
drives at ≥90% of their own allocation**, which is actionable and true.

### The `storageAllocatedInBytes` trap — and why OneDrive is the exception

`feat/sharepoint-scale` already established (correctly) that per-**site**
`storageAllocatedInBytes` is the **25 TB site-collection maximum**, effectively
never approached, so a per-site "% of quota" is ~0% and meaningless. Its design
concluded *"no per-site % of quota anywhere"*.

That rule holds for SharePoint sites and this design keeps it. **OneDrive is a
deliberate, justified exception:** a OneDrive's allocated bytes is its real
per-user 1 TB (or 2 GB / 5 TB) quota — a genuine cap that users genuinely hit.
A "% of own allocation" is meaningful for a drive and meaningless for a site.
Implementers must not "fix" the OneDrive percentage away by analogy with the
SharePoint rule.

SharePoint per-site `storageAllocatedInBytes` must **never be summed** to derive
a tenant entitlement. The field is right there and looks summable; it is not.
This warrants a code comment at the parser.

---

## Architecture

```
clients/graphClient.ts          (kept)   fetch + paging + token acquisition
  └─ reports/*.ts               (new)    raw Graph rows → typed rows. Pure. No maths.
      └─ model/storageOverview.ts (new)  ONE pure function → StorageOverview
          └─ hooks/useStorageOverview.ts React Query: fan out 5 calls, feed the model
              └─ sections/StorageOptimization/*  presentation only. Zero arithmetic.
```

Everything numeric — pooling, monthly bucketing, growth rate, volatility,
forecast, exhaustion, all four cost figures — happens inside
`buildStorageOverview(inputs): StorageOverview`, a pure function with no network
and no React. This boundary is the single most important decision in the design:
it is what makes the maths testable, and it is what prevents rule 4 above
(chart disagreeing with headline on the same screen).

`data/` keeps the `DataSource` interface and the fixtures/live split, so
`VITE_USE_MOCK=true npm run dev` still gives a no-auth demo build. That mode is
what the Playwright suite runs against and what sales can show without a tenant.

### Model shape

Mirrors `StorageOverviewDto` field-for-field where the data exists:

```ts
interface StorageOverview {
  reportRefreshDate: string

  sharePoint: {
    usedBytes: number
    entitledBytes: number | null      // null when indeterminate — never 0
    remainingBytes: number | null
    usedPercentage: number | null
    entitlementIsMeasured: boolean    // true only when admin-overridden
    byWorkload: WorkloadSlice[]       // SharePoint | Teams. The workload chart
                                      // renders these plus oneDrive.usedBytes as
                                      // a third slice; the model keeps them apart
                                      // so no SharePoint figure can absorb OneDrive.
    byTemplate: TemplateSlice[]
    sites: SiteRow[]                  // StorageRow narrowed to pool 'SharePoint'
    deletedButBilling: { bytes: number; count: number }
  }

  oneDrive: {
    usedBytes: number
    drives: DriveRow[]                // StorageRow narrowed to pool 'OneDrive'
    drivesNearCap: number             // ≥90% of own allocation
    deletedButBilling: { bytes: number; count: number }
  }

  growth: {
    avgMonthlyGrowthBytes: number
    windowMonths: number
    seriesIsVolatile: boolean
    points: GrowthPoint[]             // history + projection, one per month
    forecastStatus: 'Healthy' | 'Warning' | 'Critical' | 'Unknown'
    forecastExhaustionDate: string | null
    forecastMonthsToExhaustion: number | null
    forecastEndBytes: number
  }

  cost: {
    ratePerGb: number
    currency: string
    growthNotionalAnnual: number             // always populated
    growthBillableAnnual: number | null      // null when entitlement unknown
    cumulativeNotionalYear3: number          // always populated
    cumulativeBillableYear3: number | null   // null when entitlement unknown
  }

  caveats: {
    entitlementIsEstimated: boolean
    namesAreConcealed: boolean
    historyTooShort: boolean
  }
}
```

Every `| null` above is load-bearing and encodes rule 1. A reviewer seeing a
`?? 0` applied to any of them should reject the change.

### Growth: measured, not reconstructed

P365 falls back to a *reconstructed* history — a straight line walked back from
today's usage at the average rate — for any workspace whose quota captures do not
yet span the estimator's six-month window. That is every workspace for its first
six weeks, and it required a whole disclosure mechanism
(`historyIsReconstructed`, dashed series, "Estimated history" relabelling)
because reviewers read the straight line as a real measurement.

**This app has no such fallback.** `getSharePointSiteUsageStorage(period='D180')`
returns a real daily measured series for every tenant, so:

- `historyIsReconstructed` does not exist in this model.
- `growthScope` does not exist — the scope is always the tenant.
- `seriesIsVolatile` uses only P365's **tenant** branch: the endpoint-to-endpoint
  rate diverging sharply from the median-of-deltas rate over the capture series.
  The workspace/dominant-month branch is not applicable.

On growth measurement the sneak peek is genuinely **better** than the product it
advertises. Worth stating plainly to sales rather than hiding.

The only history limitation is a young tenant with under six months of report
data, which surfaces as `caveats.historyTooShort` and P365's
`forecastIndeterminateNote` copy — explicitly *not* an all-clear.

---

## Screen composition

One route, one scrolling report. No sidebar nav — there are no longer six
sections to move between. No period selector; the period is fixed at D180.

Header: tenant name · *"Data as of {reportRefreshDate}"* · settings control
(rate, currency, entitlement override).

```
┌ KPI row — "Tenant capacity" ────────────────────────────────┐
│  Storage used  ·  Remaining  ·  Cost of doing nothing        │
│                                    ·  Forecast exhaustion    │
└──────────────────────────────────────────────────────────────┘

① Current storage distribution
     Quota usage gauge — SharePoint pool only, used vs (estimated) entitlement
     Storage by workload — SharePoint / Teams / OneDrive   (top-N + Other donut)
     Storage by site template — replaces P365's file-category chart

② Future state & growth impact
     Trend + forecast + entitlement line     ← measured daily, never reconstructed
     Growth impact callout (Critical / At risk / Healthy)
     Mini-stats: avg growth/mo · added last 6 mo · sites · drives near cap
     Projected cost if nothing changes

③ Main offenders
     Biggest sites & OneDrives by storage — horizontal bars, P365's exact chart
     Detail table (virtualized SiteTable): name · owner · storage · share of
       total · files · active files · last activity · template
     Deleted but still billing — sites and drives retained and consuming quota
```

**Workload classification** from `rootWebTemplate`: Teams channel sites and
group-connected sites resolve to *Teams*; everything else to *SharePoint*;
OneDrive comes from call 2. P365 groups by Teams connection rather than site
template and warns that its counts therefore differ from the SharePoint admin
centre — this app groups by template, which is what Graph gives, so it will
differ from **both**. Say so in the section note rather than implying a match.

**Two additions P365 lacks**, both real reclaimable money rather than proxies:

- **Deleted but still billing** — `isDeleted` sites and drives still consuming
  quota under retention. Straight from the report, no inference.
- **Last activity** as a sortable column, so a dormant estate surfaces without
  inventing a ROT score this app cannot compute.

**P365 placement:** one footer band — *"this report is five calls to Microsoft
Graph; full discovery finds the duplicates, version overhead and trivial content
underneath these numbers"* — plus one line under the offenders table. Deliberately not
per-section upsell panels: this is a report an admin is meant to trust, and
sales copy interleaved with their own data undermines that.

---

## Trust, failure and edge cases

Five things could make this report lie. Each gets explicit treatment.

**1. Estimated entitlement.** Caveat marker on the quota gauge, headroom,
exhaustion date and all cost figures whenever `entitlementIsMeasured` is false.
Copy: P365's `estimatedQuotaNote`. Cleared by the override.

**2. Concealed names.** If the tenant enables *Display concealed user, group and
site names*, Graph returns pseudonymised `siteUrl` and `ownerDisplayName`, and
the offenders table becomes a list of hashes. Detected by pattern across rows,
surfaced as a banner naming the exact fix: **M365 admin centre → Settings → Org
settings → Reports → uncheck "Display concealed user, group, and site names"**.
Totals stay correct; only identity is affected — the banner must say so, or an
admin will distrust the figures too.

**3. Report lag.** Graph usage reports lag 2–3 days. `reportRefreshDate` in the
header; every figure is as-of that date, not live.

**4. Too little history.** Under six months of data ⇒ no forecast, and P365's
`forecastIndeterminateNote` verbatim. No fabricated trajectory, no straight line.

**5. Consent vs permission — two failures, two screens.**

| Symptom | Cause | Screen |
|---|---|---|
| `AADSTS65001` | Tenant has not granted admin consent | "Ask your Global Administrator to consent", with the admin-consent URL |
| `403` after successful sign-in | User is consented but lacks the Entra role | Names the roles Microsoft requires for delegated `Reports.Read.All`: Global Reader, Reports Reader, or equivalent |

These are different problems with different fixes, and collapsing them into one
"permission denied" sends an admin chasing the wrong one. Microsoft documents
the role requirement explicitly for every usage-report endpoint.

**Zero lead capture.** No analytics, no beacon, no form. Proventeq learns nothing
about who ran the app. This is a deliberate trade: it is what makes *"your tenant
data never leaves your browser"* a true statement rather than a marketing one.
Attribution would require a backend and would forfeit that claim.

---

## Repo changes

**Deleted** — `sections/{Azure,Estate,Exchange,Licensing,Overview,SharePoint}`,
`clients/armClient.ts`, `reports/{azure,estate,exchange}.ts`, `ARM_SCOPES`, and
the Azure RBAC section of the README. One token audience, one report.

**Kept unchanged** — `auth/`, `clients/graphClient.ts`, `config/`,
`components/` (`StatCard`, `DataTable`, `ErrorState`, `SkeletonCard`,
`UtilizationMeter`, `InsightCallout`, `SectionHeader`, chart wrappers,
`chartTheme.ts`), `lib/format`.

**Modified** — `components/SiteTable.tsx` (generalised to `StorageRow`, two new
columns, `columns` prop) · `data/fixtures.ts` (reshaped to the new
`DataSource`; keeps its deterministic 2,500-site generator).

**New** — `model/storageOverview.ts` · `lib/entitlement.ts` (the SKU
contribution table) · `lib/forecast.ts` (ported constants) ·
`lib/topNWithOther.ts` (extracted from the deleted SharePoint section) · four
parsers under `reports/` · `hooks/useStorageOverview.ts` ·
`sections/StorageOptimization/`.

**One reconciliation.** `lib/thresholds.ts` grades storage on *utilisation*
(≥85% watch, ≥95% attention); P365 grades on *runway* (<12mo Critical, <36mo
Warning). Both are kept and each is used where it belongs — utilisation colours
the gauge, runway drives the forecast badge. They answer different questions;
conflating them produces a green gauge beside a red forecast with no explanation.

### Branch position and inherited work

`feat/m365-storage-overview` sits **linearly on top of `main`** — verified:
`git merge-base --is-ancestor main HEAD` passes, so no rebase is needed and no
divergence exists.

What that branch carries, however, is more than this design's own commits.
`main` is well behind the working state of the repo:

| Work | Commits ahead of `main` | In `main`? |
|---|---|---|
| Proventeq visual redesign (Tailwind v4 + shadcn, chart-led) | 19 | **spec and plan only — implementation is not** |
| SharePoint at scale (`SiteTable`, top-N+Other, 2,500-site fixtures) | +3 | ❌ |
| This design | +2 (docs) | ❌ |

So this branch is the integration path for **all three**. That is a deliberate
consequence of the decision to repurpose the repo in place rather than start a
new one: the redesign and the scale work are the visual and performance
foundation this report is built on, and shipping the report means shipping them.

Practical implications for the plan:

- Do **not** open a PR that assumes `main` already has the redesign. It does not.
  A reviewer diffing against `main` sees the redesign, the scale work and the
  repurposing together.
- `feat/proventeq-visual-redesign` has an **open PR (#4)** per the July spec
  (`main` shows merged PRs #1–#3 only). Check whether it should be closed in
  favour of this branch rather than left open and conflicting.
- The plan's verification steps must not treat "green on this branch" as "green
  on `main`" — there is no CI evidence for the redesign against `main`.

The July scale work also independently reached the same
`storageAllocatedInBytes` conclusion this design reaches, which is corroboration
rather than coincidence.

**Verified present on this branch:**

| Asset | Location | State |
|---|---|---|
| Virtualized site table | `src/components/SiteTable.tsx` | ✅ reusable, but needs work — see below |
| `@tanstack/react-virtual` | `package.json` ^3.14.5 | ✅ |
| Large deterministic fixtures | `src/data/fixtures.ts` — `generateSites(2500)` + 4 named | ✅ reusable as-is |
| top-N + "Other" donut | `src/sections/SharePoint/index.tsx:38-56` | ⚠️ **inline in a file this design deletes** |

**Two gaps this design must close** (both are plan tasks, not open questions):

1. **Extract the top-N+Other logic before deleting the section.** It currently
   lives inline in `sections/SharePoint/index.tsx` — top 8 by used bytes, tail
   summed into an `'Other'` slice — and would be deleted along with that file.
   Lift it to a pure `lib/topNWithOther.ts` with its own unit test, then delete
   the section. Both the workload ring and the template ring need it.

2. **`SiteTable` is hardwired and must be generalised.** It is typed
   `{ sites: SharePointSite[]; totalUsedBytes: number }` with six fixed columns
   (Site, Owner, Files, Active files, Storage used, Share) and sort keys
   `used | files | active | share`. The offenders table additionally needs
   **Last activity** and **Template**, sortable on last activity, and must render
   OneDrive drives too.

   Resolution: introduce one shared row type covering both pools, and give the
   table a `columns` prop selecting which to render.

   ```ts
   interface StorageRow {
     pool: 'SharePoint' | 'OneDrive'   // discriminator, not a merge
     id: string
     url: string
     ownerDisplayName: string
     storageUsedBytes: number
     fileCount: number
     activeFileCount: number
     lastActivityDate: string | null
     isDeleted: boolean
     template?: string                 // SharePoint only
     allocatedBytes?: number           // OneDrive only — its real per-user cap
   }
   ```

   `SiteRow` and `DriveRow` in the model shape above are `StorageRow` narrowed by
   `pool`. One table component serves both; the *figures* stay separate in the
   model, which is what [The two pools](#the-two-pools) requires. Sharing a row
   type is a rendering convenience and must never become a shared total.

---

## Testing

The model being pure is what makes this cheap.

**Model unit tests** (vitest), table-driven, covering the cases P365's own tests
and DTO comments identify as having gone wrong:

- entitlement unknown → nulls throughout, **not** zeros
- tenant already over entitlement → no future exhaustion date, "needs action now"
- flat tenant → no rate to divide by → `forecastMonthsToExhaustion` null
- shrinking tenant → no exhaustion, no negative runway
- volatile series → `seriesIsVolatile` true, figure unchanged but qualified
- under six months of history → `historyTooShort`, no forecast
- zero sites / brand-new tenant → renders, does not divide by zero
- year-3 cumulative cost computed on mid-year averages (rule 5)

**Parser tests** — Graph's string-typed numerics and `"True"`/`"False"` booleans;
empty `lastActivityDate`; concealed-name rows.

**Component tests** — existing repo conventions apply: scope `StatCard`
assertions with `getByText(label).closest('[data-slot="card"]')`; every chart
wrapper gets an `ariaLabel`; meters render a real
`<div role="progressbar" aria-valuenow aria-label>`.

**Playwright e2e** in `VITE_USE_MOCK=true` across the three sections. Fixtures
deliberately include a **concealed-names tenant**, an **over-entitlement tenant**
and a **short-history tenant**, so every caveat state is both tested and
demoable to sales without a live tenant.

---

## Deployment

Vercel static, unchanged. Build-time `VITE_*` vars as today, with one change
that matters:

`VITE_AUTHORITY_URI` becomes **`https://login.microsoftonline.com/organizations`**
— not a tenant GUID as the current README documents. A GUID authority pins the
app to one tenant and defeats the multi-tenant model.

The Entra registration is `AzureADMultipleOrgs` (work/school accounts, any
organisational directory), SPA redirect URI, with a **verified publisher
domain** — which materially improves the consent screen a prospect's Global
Administrator is asked to approve.

`VITE_USE_MOCK` remains a build-time flag, so a normal `npm run build` produces a
**live** build that gates on MSAL. Screenshots and previews come from the mock
dev server, never from `dist`.

---

## Out of scope

- Any backend, any lead capture, any server-side storage.
- Exchange mailbox storage (Graph offers it free, but P365's storage report has
  no equivalent, and the two screens must match).
- Azure / ARM entirely.
- ROT classification, duplicate detection, version-overhead analysis, per-creator
  attribution — these are the product this app advertises.
- A configurable report period. Fixed at D180.
- Localisation beyond English.
