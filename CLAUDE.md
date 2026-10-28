# CLAUDE.md

Guidance for working in this repo. See `README.md` for setup/permissions and
`docs/superpowers/specs/` for the approved design.

## What this is

A React 19 + TypeScript + Vite 8 SPA that renders **one report** —
a sneak-peek of the Proventeq 365 storage-optimisation report — from a Microsoft
365 tenant's own Graph usage reports. In order: the Tenant capacity KPI cards
(straight under the page title, no section heading) · Current storage distribution · Future state & growth impact ·
Main offenders.
No lead capture, no telemetry. By default nothing leaves the browser; with
`VITE_GRAPH_PROXY_URL` set the browser's Graph calls go through `functions/`,
an Azure Functions proxy that signs them app-only (certificate) for the
signed-in admin's tenant — see `functions/README.md`. The UI is
a light, **Proventeq-branded**, chart-led page built on **Tailwind v4 + shadcn/ui**.

## Architecture (layers)

- `src/auth/` — MSAL (getMsalInstance singleton, redirect login, token acquire).
  One token audience at a time: `tokenScopes()` is `GRAPH_SCOPES`
  (`https://graph.microsoft.com/.default` — whatever the registration was
  granted, so a registration without `Sites.Read.All` or
  `Organization.Read.All` still signs in and those calls simply 403) when the
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
  would never see it. Sign-in requests the same audience (`loginRequest()`),
  so a delegated user consents to sign-in and the report in one prompt.
  A refused report revalidates itself: `hooks/accessRevalidation.ts` rechecks
  `storageInputs` every 30 s and on focus while the error is an access
  failure, `config/consentReturn.ts` turns the admin-consent return
  (`?admin_consent=True`) into a two-minute settling window (3 s rechecks,
  `AccessFailure` shows the loading screen instead of the refusal), and
  recovery invalidates every other query, and a growth only when `canReadGrowthAgain` allows it. (`src/auth/*`, `src/clients/*` and `src/config/*` were once
  kept byte-identical with a `365-oversharing` sibling; that app is dropped.)
- `src/clients/` — `graphClient` fetch wrapper (`get`, `getAllPages`,
  `batchGet` over `$batch`) + `apiError`. It takes an **origin**
  (`https://graph.microsoft.com` or the proxy URL) and resolves paths against
  it: `/x` → `<origin>/v1.0/x`, `/beta/x` or `/v1.0/x` as given, absolute
  URLs untouched — so `live.ts` names `/beta/reports/…` and the same code
  runs against either. `ApiError` keeps the Graph-shaped `error.code`;
  `AdminConsentRequired` from the proxy counts as a consent failure. A 429/503/504 — on the request or on
  a `$batch` sub-response — is retried after its `Retry-After` (default 2 s,
  capped at 60 s), up to `MAX_THROTTLE_RETRIES` times; only the throttled
  sub-requests of a batch are re-sent. Anything else surfaces as `ApiError`
  and is left to React Query's single retry (the storage inputs query
  instead has `retry: false` and re-reads each failed core report once
  itself, never after a throttled status the client already retried).
- `src/data/` — `DataSource` interface (thirteen methods plus `namesHidden`); `fixtures.ts` (fourteen mock
  tenants: `healthy`, `over-entitlement`, `concealed`, `short-history`,
  `onedrive-over-licence`, `nothing-to-clean`, `no-licences`, `first-day`, `no-daily-reports`, `onedrive-gaps`,
  and four whose named reads answer 503: `no-site-report`, `no-onedrive-report`, `no-trends`,
  `no-sharepoint-reports`) +
  `live.ts` (the five Graph calls on `/beta/reports`, period `D180`, plus
  `getOneDriveLicences`: `getOffice365ActiveUserDetail(period='D180')`'s
  `hasOneDriveLicense` per user, keyed by lower-cased principal name, needing
  only `Reports.Read.All`, `$top=10000`; `null` on any Graph error, never "all
  licensed"; the proxy allowlists it. **That report lists licensed users only**
  (proventeqe5: 0 of 29 unlicensed members in it, 9 of 9 licensed), so an owner
  it does not list is unlicensed; plus
  `getSitesOn(date)` / `getDrivesOn(date)`: the two detail reports for one
  earlier day, `(date=YYYY-MM-DD)`. That form lists ONLY the rows active on
  that day, with their size that day: it is not a snapshot. Graph accepts it
  for today − 27 days at the oldest (today − 28 answers `400 Only support data
  for the past 28 days`, though Microsoft Learn says 30); `getDailyReportDates`
  asks from today − 26, a day of margin, by the real clock (the mock by a clock
  frozen two days after its report date)). The JSON `/reports` budget is 100
  requests per 10 minutes per app per tenant, for each report API: every
  dated or paged read spends it.
- `src/reports/` — pure parsers per Graph response shape (`sharePointSites`,
  `oneDriveAccounts`, `storageTrend`, `licensing`, `org`, `siteDirectory`).
  The usage report returns a **blank `siteUrl` for every site** (Microsoft-side
  known issue). `DataSource.getSiteDetails(ids)` resolves display name +
  `webUrl` per site id through `graphClient.batchGet` (`$batch`, 20 GETs per
  POST, `Sites.Read.All`); the live source caches found and definitively
  missing (403/404) ids for the session and shares an in-flight lookup between
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
  `ApiError` (delegated mode has no app-only delta), never failing the report.
  Two consumers: `data/namedSites.nameTopSites` names the
  fifty largest live sites before `buildStorageOverview` (so chart labels and
  the default first page are right), and `hooks/useSiteDetails` names the rows
  of whatever table page is on screen (skeleton while pending). Unresolved
  rows are named by their id through `rowName` (name → URL leaf → id) —
  **never by the owner**: one admin often owns hundreds of sites.
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
  **Each report loads on its own** (`readStorageInputs`): every read is settled
  separately, and a failed core report (site usage, OneDrive usage, either
  storage trend) or the report date is read once more (not after a throttled
  status, which the client already waited out) and then left out, listed
  in `caveats.unreadReports`. The model leaves out only the figures that need it
  (`sharePoint.siteReportRead` / `oneDrive.accountReportRead` / `trendRead`, a
  pool with neither report → `read` false) and `components/UnreadReports` names
  it with a Refresh data button. The hook returns an `error` (→ `AccessFailure`)
  only for an access refusal on any read, or when nothing usable came back;
  a failed refresh keeps the page on screen, and so does a refresh that fails
  to bring back a report on screen (`readStorageInputs(ds, onScreen)` throws
  `ReportsNotReloaded`, so React Query keeps the earlier load whole and no
  figure mixes two loads; the hook's `notReloaded` names them in the note,
  and Refresh data re-reads no growth since no load landed). With neither
  usage report read and no trend holding storage, the page is the failure
  screen.
  A pool counts as read only when its usage report came back or its trend
  holds storage, so an empty trend never shows as 0 B. Growth waits for
  `offenders.read` and keys on the two usage reports' read flags.
  The ONLY data entry point for the page — except growth:
  `src/hooks/useStorageGrowth.ts` reads the detail reports for every day
  `DataSource.getDailyReportDates` lists (`lib/growthWindow`: today − 26 up to
  the report date, ~25 days × 2 calls with `$top=10000`, Graph's largest page,
  so one request per day; four days at a time, folded as they land) and takes
  each row's earliest appearance as its baseline
  (`model/storageGrowth.earliestRows`) under `['storageGrowth', date, nameMask]`
  with `staleTime: Infinity`, `retry: false`. Each day's SharePoint and
  OneDrive reports are read separately (their budgets are separate): one that
  fails with an `ApiError` is skipped (the window starts on the first day a
  report came back; `reportsRead` counts each pool's reports, `reportsMissing`
  and `complete` say what is left, `missingNote` is the model's note). A
  report stops being asked after a batch with a 429 (`ApiError.isThrottled`,
  429 only) or after a batch where every read of it failed, unless that was
  the first batch (a clock a few days behind fails only the oldest days).
  Anything that is not an `ApiError` fails the query. `graphClient` wraps a
  request that never reached Graph, or whose body did not arrive (a
  `TypeError` from `res.json()`; a `SyntaxError` stays a bug), in `ApiError`
  status 0 (`NetworkError`, `isNetworkFailure`), so a network blip skips a report; the licence and
  directory lookups in `live.ts` still fail on it instead of reading as
  unknown. A failed name lookup leaves the leaders unnamed; on a masked tenant
  the dated rows go through `hideRowNames` so their ids match the masked
  report rows. `model/storageGrowth.betterGrowth` keeps the earlier result of
  a re-read when the new one is incomplete and brings back fewer reports, or as
  many while losing reports of one pool — even after UTC midnight moves the
  window, since the key pins the report date. A complete re-read always wins.
  The copy never names a cause: it gives each pool's count over the window
  asked (`windowFrom` to `windowTo`).
  `canReadGrowthAgain` is the one rule for Refresh data and access recovery:
  never while fetching, at once after a failure with nothing on screen, never
  once complete, and an incomplete read only `REREAD_COOLDOWN_MS` (10 minutes,
  Graph's budget window) after it was read; the query keeps `gcTime:
  Infinity` so leaving the page does not reset that; Refresh data also needs the refresh itself to have brought
  the report back for that date, and its busy state ignores growth (the daily
  reports change once a day; each load spends ~25 of the 100 report requests
  Graph allows per 10 minutes per report API),
  AFTER the overview has loaded and without blocking it, names only the ten
  leaders (`getSiteDetails`, O(10); none while a name mask applies), and returns `model/storageGrowth.buildStorageGrowth`
  — pure, table-tested. The panel always charts something, picked in the model
  (`rankLeaders` → `ranking`): `growth` when a measured row grew (title
  *Fastest-growing sites & OneDrives*), else `shrink` (storage freed) when one
  shrank, else `size` (*Sites & OneDrives by storage used*, storage used on
  `sizesOn`, zero-byte rows left out). `explanation` names the description:
  `growth`, `shrink`, or for the size ranking `reportDateTooOld` (empty
  window: a report date at or before today − 26), `noDailyReports` (no report
  read), `notMeasured`, `unchanged` or `growthFailed`; the panel reads it as
  `offenders.explain.<explanation>` and the note as `offenders.reportsRead`.
  The growth window runs from
  `baselineDate` to `sizesOn`, the day of the sizes growth is measured to. If the query
  itself fails, the hook returns that size ranking built from the overview
  (`growthFailed`), also while Refresh data re-reads it, so there is no error
  panel; a skeleton shows only on the first load. A row with no
  dated appearance has no daily figure, so it is left out of growth (never counted from
  0, which would rank the biggest sites as the fastest growers); deleted rows
  are out of every ranking.
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
- `src/features/oneDriveUsage/` — the proof-of-concept second report (KPI cards
  incl. *Over licensed storage*, top drives, `OverLicenceSection` with the
  *Over licence by* column, `InactiveDrivesSection`, drive table with the
  per-drive capacity column). Same `useStorageOverview` query, so switching
  reports never refetches. `InactiveDrivesSection` renders
  `oneDrive.attention` (`model/oneDriveAttention.ts`, one pass over the
  **reported** drives, before any name mask, so a concealed tenant's ids still
  match): three disjoint groups, never one total — unlicensed (owner listed
  without a OneDrive licence, or not listed), inactive (licensed owner, no
  activity since the archive cutoff or none recorded; banded by years past the
  cutoff), deleted (`deletedButBilling`). `unlicensed` is never null: when
  the licence report failed or matches no live owner at all (a key mismatch is
  all-or-nothing; a guard on the share of owners listed would hide leaver-heavy
  tenants) it is `basis: 'noActivity'` — live drives with no activity in the 93
  days before the report date (`UNLICENSED_ARCHIVE_DAYS`) but not inactive, so
  the groups stay disjoint — and the card is *No activity for over 93 days*
  (section *Inactive, deleted and quiet OneDrives*), saying
  it stands in for the unlicensed ones; `basis: 'licences'` carries `notListed`,
  the owners inferred from absence, and both the card and the Storage-page line
  say it. Billing
  copy is Microsoft's "Manage unlicensed OneDrive user accounts" only ($0.05/GB
  a month once archived after 93 days with billing on); the report never
  prices it, because the reports do not say how long an owner has been
  unlicensed. `OneDrivePoolPanel` repeats the three figures in one line and
  links to `/onedrive-usage` when that report is on.
- `src/features/storageOptimization/` — the report: `StorageOptimization.tsx`
  (page: skeleton / `AccessFailure` with retry / sections), `KpiCards`,
  `DistributionSection`, `GrowthSection` (with `CleanUpForecast`, the
  after-clean-up block of the impact panel), `OffendersSection` (includes the
  paginated `SiteTable` and the one `NameCaveats` note for a name mask), `AccessFailure` (consent
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
  `AdornedInput` (prefix/suffix input), `ShareHeadline` (the big coloured percentage plus its sentence, heading both the SharePoint usage line and the OneDrive pool), `ByteOverrideInput` (a byte figure
  edited in a unit, null when cleared — both settings overrides), `ReportSkeleton`, `LoadingOverlay`, `Logo` (inline SVG of
  the proventeq365 wordmark — the "365" glyphs are outlined paths, no font
  load), `DescribedMenuItem` (dropdown item with icon, label, description),
  `PoolIcon` (the SharePoint / OneDrive glyphs from P365's `sprite.svg`, teal,
  1.25rem), `ExternalUrlLink` (P365's teal path-only link, new tab),
  `SegmentedBar` (a generic one-line stacked bar plus a list of its parts;
  every part, on the line and in the list, opens a popover on hover or click —
  the line is `aria-hidden` and mouse-only, the list is the keyboard and
  screen-reader path; parts with no share are listed but not drawn).
  `components/ui/popover.tsx` is the shadcn-style Base UI popover it uses.
  `HiddenName` (the one blurred stand-in for a masked name, owner or link: a
  neutral `Lorem ipsum` placeholder whose length varies by seed, `blur-[3px]`,
  `select-none`, a button named "Hidden name" that opens a hover/click popover
  saying why — hidden by `hideNames` or concealed by Microsoft).
  `ColumnHeaderTooltip` (P365's `headerWithTooltip`: a table header that
  explains its column on hover and keyboard focus; copy lives under
  `table.column.help.*`, the catalogue test reads `help: '…'` keys).
- `docs/help/` + `src/help-center/` + `src/app/help/` — the help centre, see
  "Help centre" below.
- `src/app/` — the shell: `AppShell` (`ShellLayout`: sticky `Header` + optional
  `SideMenu` + `<main>`), `ReportLoading` / `LoadingShell` (the loading page,
  see "Loading is one screen"), `Header` (hamburger only when the menu is on, logo, tenant name
  from `useOrg` with skeleton / "Your tenant" fallback, `AccountChip` in live
  mode, `HeaderActions`), `HeaderActions` (the single `⋯` "Options" button: Base
  UI dropdown with `DescribedMenuItem`s — Refresh data (disabled + spinning while
  fetching, not while only growth reads; re-reads growth only if it failed or
  missed a report for the report date the refresh brings back, an incomplete
  read only 10 minutes after it was read), Report settings (opens `SettingsDialog`), and in live mode Switch
  account via `prompt: 'select_account'` and Sign out), `SettingsDialog`
  (controlled Base UI dialog: currency `Select`, cost per GB with symbol prefix,
  entitlement in TB and OneDrive storage per user in GB, each with its
  licence estimate as hint), `SettingsProvider` /
  `useSettings` (localStorage-backed `ReportSettings` context), `SideMenu`
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
  `ExternalUrlLink` showing the URL path, opening the site in a new tab; with a
  `nameMask` the name and owner cells render `HiddenName` and no lookup runs),
  `CaveatBanner`, `ErrorState`; `ui/` (shadcn on Base UI: button, select,
  dropdown-menu, dialog, skeleton, …).
- `src/config/env.ts` — `VITE_USE_MOCK`, `VITE_MOCK_SCENARIO`, `VITE_FEATURES`
  (parsed once into `env.features`), overlaid with `src/config/modes.ts`: the
  search params `features`, `mock`, `scenario` (persisted per tab in
  sessionStorage under `m365-overview:modes`; empty value clears one,
  `?modes=reset` clears all). `VITE_MODES_LOCKED=true` ignores the overrides —
  it is the only switch the URL cannot change, and `readEnv(source, overrides)`
  applies the lock, so a test can never sneak past it. `env` is still a module
  constant evaluated once at load. `?admin=true` (`env.admin`, also locked) mounts
  `app/AdminBar` in `AppShell`: a fixed bar that stages data source, features and
  hidden names and applies them as those same params through
  `config/adminHref` + a reload — never a second way to change a mode. Its
  open state lives in `app/adminBarContext` (remembered per tab), and the ⋯
  menu shows *Show / Hide admin bar* only when admin is on. `?modes=reset`
  clears the tab and then applies any params sent with it.

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
- **"Over licensed storage" is measured against the licence, not the drive's
  quota.** Per Microsoft's OneDrive service description a user licence
  includes 1 TB on Business plans, 1 TB **raisable to 5 TB** on E3/E5 (five or
  more licences) and 2 GB on F3. `lib/entitlement.oneDriveBytesPerUser` takes
  the **most generous** plan the tenant holds (SharePoint/OneDrive Plan 2 ×≥5 →
  5 TB, Plan 1 → 1 TB, `SHAREPOINTDESKLESS` → 2 GB), because the usage report
  does not say which licence each user holds — so, without an override, a
  listed drive is one no licence in the tenant could cover. The plan sets are
  checked against Microsoft's "Product names and service plan identifiers"
  CSV, not memory: Project, Visio and Dynamics SKUs (`POWERAPPS_DYN_APPS`)
  carry SharePoint for their own sites and get no tier, and any SKU with an
  `_EDU` plan gets none (education allowances vary by agreement, and Apps for
  Students carries `ONEDRIVESTANDARD`). Never flag against a flat 1 TB: an E3
  tenant's legally raised 5 TB drives would read as over licence.
  `SHAREPOINTENTERPRISE_MIDMARKET` counts as Plan 2: it is carried by E5 EEA
  with Calling Minutes as well as the retired Midsize Business.
  `oneDrive.overEntitlement.limit` says what the line is: `set`
  (`oneDriveEntitlementOverrideBytes`, null or ≤ 0 = not set;
  `oneDrive.limitWhenUnset` names what an empty setting measures against, for
  the note and the settings dialog), else `licences`
  (the estimate), else — no readable licences or none with a known allowance
  (`licenceGap` `licencesUnavailable` / `noSizedPlan`) — `driveLimit`: the
  commonest positive per-drive allocation among live drives (ties → the larger),
  with `drivesReporting`, shown as *Over the usual OneDrive limit* (the copy
  says "commonest", never "most": it is a plurality) with an *Over the limit by*
  column (`overDriveLimit`), never a
  guessed 1 TB. `overEntitlement` is `null` — card and section left out, never
  *Unknown* — only when no live drive reports a limit either. It lists live
  drives with `used > perUser`, largest first, each row a copy carrying
  `overEntitlementBytes`; the Storage page's *Drives over their licence* stat
  shows only for `set` / `licences`. Never walk `/users` for per-user licences from here.
- **Unknown entitlement produces `null`, never `0`. Any `?? 0` on
  `entitledBytes`, `remainingBytes`, `usedPercentage` or `overageBytes` is a
  defect.** The cost figures are the exception and are never null: with an
  unknown entitlement nothing says the growth fits, so all of it is priced and
  `cost.growthAnnual` / `cost.cumulativeYear3` stay real numbers.
- **Components do no arithmetic. If a section needs a number, add it to
  `buildStorageOverview`.** That includes clamps (`remainingBytes` is already
  ≥ 0, as P365's backend returns it), grades (`sharePoint.utilization`), the
  offenders' top-N and retained totals (`overview.offenders`), and display
  names (`lib/rowName.ts`, shared with `SiteTable`). The one sanctioned
  exception is the generic `SiteTable`'s per-row Share (`shareOfPool`: the
  row over the model's `poolUsedBytes` for its pool), computed for the rows it
  pages and sorts, since the table is fed by several pages.
- **Exhausted is a state, not a date.** Used ≥ entitled ⇒ `forecastStatus`
  `Critical`, `forecastMonthsToExhaustion` `0`, `forecastExhaustionDate`
  `null` — decided before the history check, exactly as P365's
  `ForecastExhaustion` does. A date of "today" for an over-entitlement tenant
  is the bug this rule exists to stop; the "already exceeded" copy only renders
  on that triple.
- `growth.windowMonths` counts the month-to-month deltas the rate was measured
  over (`buckets - 1`), which is what "Added last N mo" labels; the six-month
  gate still counts buckets. `growth.rateSource` says where the rate came
  from: `monthly` (six or more buckets, median of the monthly changes),
  `daily` (fewer: the least-squares slope of the daily trend,
  `lib/forecast.dailyRateBytesPerMonth`, labelled with `windowDays`) or
  `none` (a single reported day: no rate, status `Unknown`, no forecast
  months, the cards and callout show the storage used under a *Latest* pill;
  *Avg growth / mo*, *Added last …*, *Forecast (6 mo)* and the cost figures
  are left out, `cost.applies` false). An exceeded entitlement wins over all
  of this in the copy: *Entitlement already exceeded*, Critical. Zero-valued
  days are gaps in the report: `lib/forecast.trendWithoutGaps` drops them from
  both trends before anything reads them (used, buckets, rate, window), and a
  trend of only zeros while the rows hold storage counts as listing no day.
  A series with one measured point is drawn with a dot (`design/charts.lineDot`):
  Recharts draws an isolated point by itself only when the chart has one row.
- SharePoint and OneDrive are two pools. Never put a OneDrive-inclusive numerator
  over a SharePoint-only denominator.
- Growth is measured from the trend report, never reconstructed from site rows.
  Under six months of history it is measured from the trend's daily points,
  and the copy names the days ("Forecast from the last N days of storage").
  The one exception is the storage *used* when a trend lists no day with storage:
  it is the total of that pool's usage-report rows (`sharePoint.usedFromSiteReport`,
  `oneDrive.usedFromAccountReport`), drawn as a single point with no rate, and
  the copy names the report. A shrinking
  rate reads "changing by -X a month", never "growing".
- **Nothing on the page says "unavailable", "unknown", "not enough history" or
  "could not be read" (owner's decision, 2026-10-27).** The only can't-load
  screen is the whole-app failure. A chart or card whose primary data is
  missing shows the best other real Graph figure for the same question, in the
  same place, and its copy names that source and window. With no entitlement
  the forecast card becomes *SharePoint growth per month*, the callout projects
  used storage (pill *Projection*), and figures measured against the
  entitlement (Free, Over entitlement today, Stays under the entitlement) are
  left out, never shown as Unknown. This copy is the app's own: P365 still has
  its unavailable strings. The full list is
  `agent-context/proventeq-365-lite/specs/fallbacks.md`.
- **Forecast after clean-up** (`growth.afterCleanUp`, `GrowthPoint.afterCleanUpBytes`)
  is the forecast line shifted down by what the report already calls removable:
  `archive.bytes` (inactive live sites) + `sharePoint.deletedButBilling.bytes`.
  It starts at the last actual month, grows at the same rate, clamps at 0. Deleted
  OneDrives are the other pool and are never subtracted. Versions are not
  counted — the usage reports do not carry them, and measuring them needs a
  SharePoint-audience token. With nothing removable the line is the forecast
  itself and the copy says there is nothing to clean up; with `rateSource`
  `none` there is no line and `endBytes` is null. The removable figure itself
  is always measured (the archive cutoff falls back to today without a refresh
  date). `staysUnderEntitlement` is null without an entitlement, and the row is
  then left out.
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
  `StorageOptimisationOptions` class, an earlier note here claimed one.
  **The cost of doing nothing is the one deliberate departure from P365
  (owner's decision, 2026-09-24): it is `0` while growth stays inside the
  SharePoint entitlement.** `lib/cost.billableGrowthGb` prices only the growth
  above the entitlement — nothing under it, the overflow when growth crosses
  it, all of it once the tenant is already over (today's overage is today's
  bill, not the cost of doing nothing) and all of it when the entitlement is
  unknown. The three-year figure applies the same rule to each year's
  **mid-year** volume (`growthGbPerYear × (year − 0.5)`), summed. There is no
  notional/billable split — one figure per card. P365 prices the whole growth
  ungated, so the two products differ here on purpose.
- **The cards show only what applies, decided in the model.** `sharePoint.exhausted`
  (used ≥ entitled) leaves *Forecast exhaustion* out — there is no date left
  to forecast. `archive.savingApplies` (`entitledBytes === null || exhausted`)
  shows *Potential saving per year* only when archiving can save money: by the
  rule above, storage inside the entitlement is free, so the saving prices
  `archive.savingBytes` = the archivable bytes capped at `overageBytes` (all of
  them while the entitlement is unknown). `cost.applies` (a growth rate
  exists, `rateSource !== 'none'`) shows *Cost of doing nothing* and the
  projected-cost block. *Inactive sites to archive* shows whenever the site usage report came back. The grid's
  `xl` column count follows the number of cards.
- **The storage usage line (`overview.breakdown`, `lib/storageBreakdown.ts`)
  never double-counts and holds SharePoint only** (Microsoft's SharePoint
  limits: the organisation's storage is "not including the OneDrive created
  for each licensed user"). Six parts in this order: SharePoint · Teams ·
  Deleted · Inactive · Versions · Free. Inactive wins over Teams (an inactive
  Teams site counts once, as inactive); Deleted holds deleted **sites** only;
  the SharePoint part is the trend total (the site rows' total when the trend
  lists no day with storage) less Teams, Inactive and deleted sites, clamped at 0; Free is `remainingBytes` (left out when unknown — no Free
  part). OneDrive is its own pool, `oneDrive.pool` → `OneDrivePoolPanel`:
  storage in live drives against the sum of their own allocations, both from
  the account rows; `allocation` covers the live drives that report a limit
  (its own `usedBytes` and `driveCount`) and counts the rest in `withoutLimit`,
  named under the line; it is `null` only when no live drive reports one. The Share column divides each row by its own pool
  (`offenders.poolUsedBytes`, the two trend totals, or the rows' totals when
  a trend lists no day with storage). A pool total of 0 therefore means every
  row in it is 0 B, and the Share reads 0.0%, never *Unknown*.
  **Versions is always `null`**: the usage reports count version history inside
  each site's storage and never split it out, so it is shown *Not measured*,
  never as a size or a guess. Workload colours are
  the products' own (`WORKLOAD_COLOR`: SharePoint `#038387`, OneDrive
  `#0078d4`, Teams `#5b5fc7` — P365's `teamsBlue`).
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
(`appToken.ts`, cached only once its `roles` carry all of
`REQUIRED_APPLICATION_PERMISSIONS`; otherwise `403 AdminConsentRequired` — a
sign-in approval grants no application permission, and Graph's own 403 would
read as a role problem). **`REQUIRED_APPLICATION_PERMISSIONS` is
`Reports.Read.All` alone, on purpose: every permission added there is one more
thing a prospect's admin must approve.** `Sites.Read.All` and
`Organization.Read.All` are optional — their calls 403 without them and the
report degrades (`getLicenses` → `null` → unknown entitlement, never the 1 TiB
base; site names fall back; header says "Your tenant"). `npm run local --
--reports-only` runs the stack that way → relay with `nextLink`/`deltaLink` rewritten to the
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
  `short-history`, `onedrive-over-licence`, `nothing-to-clean`, `no-licences`, `first-day`, `no-daily-reports`, `onedrive-gaps`, `no-site-report`, `no-onedrive-report`, `no-trends`, `no-sharepoint-reports`) for the other tenants. `e2e/fallbacks.spec.ts` checks every tenant's Storage and OneDrive pages have no unavailable / unknown wording. This is also what the e2e webServer runs.
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
  *utilisation* (watch ≥85% / attention ≥95%) once, in the model
  (`sharePoint.utilization`), and the percentage over the storage usage line
  takes that grade — the line never grades itself; `src/lib/forecast.ts`
  grades *runway* (Critical <12 months / Warning <36) and drives the forecast
  badge. They answer different questions. The *Tenant capacity* cards (above
  *Current storage distribution*) carry two more, also graded in the model:
  `archive.status` (`lib/archive.ts` — archivable share of live site storage,
  watch >5% / attention >50%; drives both the archive and the saving card) and
  `cost.growthAnnualStatus` (`lib/cost.ts` — healthy at zero, watch above,
  attention once the next 12 months bill more than a tenth of the licensed
  entitlement again; rate-independent). A site is archivable when its
  `lastActivityDate` is older than `settings.inactiveYears` (default 3) before
  `reportRefreshDate`; a site with no recorded activity is never counted.

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

## Loading is one screen: skeleton + stage overlay

Every wait — the boot HTML, MSAL `initialize()`, the sign-in redirect and the
report fetch — shows the same page: the shell (`ShellLayout` + `HeaderFrame`)
with `ReportSkeleton` under `LoadingOverlay`, P365's `DiscoveryOverlay` card
(badge, ring spinner, title, subtitle, step pill or checklist, dots, footer).
`app/ReportLoading` maps a `LoadingStage` (`starting` → `signingIn` →
`loadingReport`) to the `loading.<stage>.*` copy and, when the app signs in
(`env.usesMsal`), a checklist of the three stages. `LoadingShell` is the
pre-auth wrapper `MsalAuthProvider` / `MsalAuthHandler` render; the reports
render `ReportLoading` inside the real `AppShell`. Never add a centred
spinner or a blank screen for a new wait — pick or add a stage.

`index.html` carries a static copy of that page (`.boot-*` rules inline) for
the moments before the JS bundle arrives, showing the `starting` stage. It
cannot import `index.css` or the catalogue, so a change to the overlay's look
or the `loading.starting.*` / checklist copy has to be made in both places;
the boot-shell e2e (`javaScriptEnabled: false`) catches a drift in the markup.

On `/help/*` the same file paints a help-shaped skeleton instead (`.boot--help`:
top bar, sidebar and article lines, "Opening the help centre"). The `helpBoot`
Vite plugin (`src/app/help/helpBoot.ts`) prepends a tiny inline script that
sets `html[data-boot="help"]` for `isHelpPath` addresses and modulepreloads the
built `HelpPage` chunk (its file names travel in `data-preload`, so the script
text never changes). The Static Web App CSP allows that script by its
`sha256` hash: change `HELP_BOOT_SCRIPT` and the hash in
`public/staticwebapp.config.json` together (`helpBoot.test.ts` fails on a
mismatch). The help route has no React Suspense fallback: the static skeleton
stays until `HelpPage` renders over it.

`AuthErrorScreen` still renders `className="error-state*"` inside
`className="auth-screen"`; keep those rules in `src/index.css`.

## Help centre (`/help/*`) — the product reference

**`docs/help/*.md` is the user-facing documentation of every report, card, column,
setting, colour rule, permission and error screen, and it is the first place to
read what the app does.** Any user-visible change updates the matching page in
the same PR (`docs/help/README.md` is the authoring guide). It is served at
`/help/*`, indexed at `/llms.txt`, in full at `/llms-full.txt` and page by page at
their source paths under `/help/` (`/help/<path>.md`, frontmatter swapped for the title and
description).

- `src/help-center/` is a reusable module (own README, own `--hc-*` CSS, no
  imports from the app — `isolation.test.ts`): catalogue/frontmatter, `:::`
  audience/if/unless blocks, `{{variables}}`, search, history routing,
  `HelpCenter` layout, and the `helpLlms` Vite plugin. Keep it app-agnostic.
- `main.tsx` lazy-loads `app/help/HelpPage` for `isHelpPath` (`/help` and
  everything under it) **before** `bootstrap()`, so it never mounts MSAL or the
  data layer — a visitor who cannot sign in can still read it. Both hosts serve
  it through their `index.html` fallback. The page shows this site's mode
  (`config/accessMode.accessModeOf`, proxy set → application) and a switch
  under the page title shows the other one (`?audience=`); `{{consentUrl}}` /
  `{{clientId}}` are filled only for the site's own mode.
- **The help centre looks like learn.proventeq.com, not like the report.** Its
  layout (sticky top bar with inline search, landing hero + *Browse by area*
  cards, collapsible sidebar sections, breadcrumb / title / meta header, TOC,
  pager) and its palette (navy accent, warm off-white, IBM Plex falling back to
  Open Sans) copy the Proventeq Help Center (`proventeq-vercel/p365-help-web`,
  `app/globals.css`), so the tokens in `help-center.css` are learn's, not the
  `--color-p365-*` ones — do not re-theme `.hc` with P365 teal. Section cards take
  `description` from `helpSections.ts` and icons from `HelpPage`'s
  `SECTION_ICONS`.
- Every report section and title has a P365-style **?** (`app/help/HelpButton`,
  a required `help` slot on `Section` and `PageHeader`): a dialog with the page's
  `description` and *See more* in a new tab. Topics → slugs are
  `app/help/topics.ts`. The ⋯ menu has *Help* (new tab).
- Every failure surface renders `components/HelpLink` → troubleshooting:
  `AuthErrorScreen` (all branches), the three `AccessFailure` panels,
  `ErrorState` for auth errors, `BootstrapError`. A new failure screen gets the
  link, and its title becomes an `##` heading in
  `docs/help/getting-started/troubleshooting.md` (the content test checks).
  `AADSTS50105` is `isUserNotAssigned` and gets its own `AuthErrorScreen` branch.
- **The help shows only the enabled features.** A page with `feature: <flag>`
  in its frontmatter is left out (and a section left empty disappears) unless
  the flag is on, and `::: feature <flag>` / `::: unless-feature <flag>` blocks
  do the same inside a page. `app/help/helpContent.ts` builds `helpCatalogue`
  from `env.features` (so `?features=` overrides apply), and the `llms.txt`
  plugin from the build's `VITE_FEATURES`. A link to a gated page must sit in a
  block gated by the same flag — `helpContent.test.ts` checks every link under
  every combination of flags. Tests that render a gated report directly mock
  `@/config/env` with its flag on (see `OneDriveUsage.test.tsx`).
- `app/help/helpContent.test.ts` fails on a broken link or anchor (per
  audience and per set of feature flags), an unknown variable, a topic or report without a page, or a failure
  screen missing from troubleshooting. It cannot tell a page is out of date.
- The pages and the section labels in `app/help/helpSections.ts` are this app's
  own prose, the one exception to "every user-facing string comes from P365":
  P365 has no such docs. On-screen labels quoted in them still match `en.json`.
- `app/help/helpContent.ts` imports the markdown eagerly, so the catalogue
  (~45 kB of markdown) is in the main bundle: the **?** buttons need each page's
  title and description synchronously. The page renderer, search and
  react-markdown stay in the lazy `HelpPage` chunk.

Delegated mode checks the token's granted scopes (`acquireToken`'s
`requiredScope`, `requiredScopeFor(config)` = `Reports.Read.All` with no
proxy): missing → one `forceRefresh` → still missing → `ApiError` with
`AdminConsentRequired`, before any Graph call. Without it an unconsented tenant
got Graph 403s that read as "no reporting role" — verified on proventeqe5,
whose Gov360 user holds Reports Reader but whose delegated token carried only
`openid profile email`.

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
  proventeqe5 tenant does). `lib/rowName.ts` then names the row by its site id
  (the table does not repeat it underneath), and chart labels use the same
  `rowName`; search matches the id too.
- **Hidden names** (`env.hideNames`: `VITE_HIDE_NAMES=true` or `?hideNames=true`,
  the one URL override `VITE_MODES_LOCKED` lets through, because it can only
  hide): `lib/hiddenNames.ts` masks the usage-report rows the moment Graph
  answers (`live.ts`, before the site memo) — owners to initials, site ids and
  OneDrive UPNs to a 16-hex pseudonym, URLs dropped — and the name lookups
  (`getSiteDirectory`, `getSiteDetails`) are skipped, so no real name is ever
  parsed, cached or searchable. The browser still receives Graph's raw JSON on
  the delegated path; masking inside the proxy is not built yet. The mock
  source applies the same masking (`hideRowNames`).
- **One name mask, two causes.** `caveats.nameMask` is `'concealed'` when
  `lib/concealment.namesAreConcealed` sees Microsoft's hashes (it wins),
  `'hidden'` when the session hides names, else `null`. While masked the
  model applies `hideRowNames` to every row, `useStorageOverview` skips
  `nameTopSites` and the site directory on a concealed tenant, and
  `SiteTable` skips `useSiteDetails` and the known-sites search, so no name
  resolved through `/sites/{id}` can show. Every name, owner and chart label
  renders `design/HiddenName` (SVG chart ticks a blurred bar, the bar tooltip
  "Hidden name"), never the pseudonym; `NameCaveats` renders one banner.
  Search still matches the pseudonym. A tenant both concealed and hidden reads
  as hidden: the masking runs before the detection can see the hashes.
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
  `ReportSkeleton`, `role="status"` on the `LoadingOverlay` card, `role="dialog"` on the reports menu and the settings dialog, `role="menu"` named "Options", real
  table semantics in `SiteTable`.

## Known deferred items

- Build emits a >500 kB chunk advisory (single bundle) — consider route-level
  code-splitting if it matters.
- `src/components/ui/*` (generated) trip 3 oxlint `only-export-components`
  fast-refresh warnings — cosmetic, from the CLI output.
