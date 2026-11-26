---
title: Future state & growth impact
nav: Growth & forecast
description: Where SharePoint storage is heading at the current growth rate, when it passes the entitlement, and what that costs if nothing changes.
section: storage-optimisation
feature: optimization.storage.report.overview
order: 30
---

## Storage trend & forecast

A line chart of SharePoint storage, one point per month:

- **Actual used** is the last reported value of each month in Microsoft's 180-day storage trend.
- **Linear forecast** (dashed) runs six months ahead from the latest month, at the current growth
  rate. With under six months of history, the rate comes from the daily storage Microsoft has
  reported so far ([how](../../reference/calculations.md#growth-rate)), and the callout names the
  days it was measured over.
- **Forecast after clean-up** (dotted) is the same forecast if the deleted sites still billing were
  purged today: it starts at today's storage minus that storage and grows at the same rate
  ([what is counted](#removable-today)). It is left out when no deleted site is still billing.
- **After clean-up and archiving** (dash-dot) appears once you choose sites to archive: the line
  after clean-up minus the storage of the sites you picked.
- **Entitlement** is a horizontal line at the SharePoint entitlement, when it is known.

Under the chart:

| Figure | Meaning |
| --- | --- |
| Avg growth / mo | The typical month-to-month growth: the median of the monthly changes, or the daily rate under six months of history ([how](../../reference/calculations.md#growth-rate)). |
| Added last N mo | Storage added between the first and last month of the trend. N counts the month-to-month steps it covers. With under six months of history it reads **Added last N days**, between the first and last reported day. |
| Live sites | SharePoint sites that are not deleted. |
| Drives near their quota | OneDrives at 90% or more of their own storage quota, the per-drive limit in the usage report. An admin can set it above or below the licence. |
::: feature optimization.storage.report.onedrive
| Drives over their licence | OneDrives holding more than the storage their licence includes, the OneDrive storage per user ([OneDrives over licence](../onedrive-usage/over-licence.md)). Left out when neither the licences nor Report settings give that figure. |
:::
::: unless-feature optimization.storage.report.onedrive
| Drives over their licence | OneDrives holding more than the storage their licence includes, the OneDrive storage per user. Left out when neither the licences nor Report settings give that figure. |
:::

## Growth impact

A status badge and a headline about the entitlement:

| Badge | Headline |
| --- | --- |
| **Critical** | Under 12 months of headroom, or the entitlement is already exceeded. |
| **At risk** | Under 36 months of headroom. |
| **Healthy** | 36 months or more, or storage is not growing. |
| **Projection** | No entitlement: the headline gives where SharePoint storage is in six months. |
| **Latest** | Microsoft 365 has reported a single day of storage: the headline gives the storage used. An exceeded entitlement still shows **Critical**. |

The callout under the badge explains the headline. There are four special cases:

- **Entitlement already exceeded.** The tenant already uses more than its pooled entitlement.
  No future date is shown, because there is nothing left to run out. Procurement or cleanup is
  needed now.
- **Under six months of history.** The forecast comes from the daily storage reported so far,
  and the note says how many days. Treat it as indicative.
- **No entitlement.** *SharePoint storage reaches … in 6 months*: the forecast of used storage,
  with no exhaustion date. Enter the entitlement in
  [Report settings](../../reference/settings.md#sharepoint-entitlement) to see when it runs out.
- **A single reported day.** The storage in use on that day. The forecast starts from the second
  day Microsoft 365 reports. When Microsoft's storage trend lists no day with storage, the figure is the
  total of the site usage report, and the note says so. When the storage trend did not come back,
  the note says that instead, and the forecast returns with the trend. An exceeded entitlement always shows as
  *Entitlement already exceeded*, however much history there is.

**Used today**, **Forecast (6 mo)** and **Over entitlement today** show where storage is now, where the
forecast ends, and how far past the entitlement the tenant already is. **Over entitlement today**
is shown only when the entitlement is known.

### Removable today

| Figure | Meaning |
| --- | --- |
| Deleted sites still billing | Storage in deleted sites that still count against the entitlement (the *Deleted but still counting* or *Deleted but still billing* card). |
| Archive inactive sites | The storage of the sites you chose to archive. **Choose sites** (**Change sites** once some are picked) lists the live sites with no activity for the inactivity window set in [Report settings](../../reference/settings.md#archive-sites-inactive-for), largest first; tick the ones to archive and select **Show the impact**. Nothing is archived: the pick only changes the figures and lines here. |
| Total | The two together. |
| Forecast after clean-up (6 mo) | Where the forecast ends with the deleted sites removed. With sites picked it reads **Forecast after clean-up and archiving (6 mo)** and ends where the dash-dot line ends. |
| Stays under the entitlement | **Yes** when that line stays below the entitlement for the whole forecast, **No** when it reaches it. Shown only when the entitlement is known. |

Only SharePoint storage is counted. Deleted OneDrives are in the OneDrive pool, so they do not
lower the SharePoint forecast. The pick lasts while the page is open, through a refresh of the
report or a change in Report settings. A site leaves it when it is no longer inactive for the
window set there. With no deleted site billing and no inactive site, the block says there is
nothing to clean up and offers no pick.

From a single reported day the chart shows that day's storage as one point, with no dashed or
dotted line. *Avg growth / mo*, *Added last …*, *Forecast (6 mo)*, the forecast after clean-up and
the projected cost are left out until a second day is reported. When Microsoft's storage trend
lists no day with storage, the point is the total of the site usage report, and the note says so.

On the monthly path, a note can appear when the monthly figures are **uneven**, for example when one month dominates
rather than a steady trend. A single average is then a weak guide, so treat the projection as
indicative.

## Projected cost if nothing changes

A chart of the monthly cost over the forecast months, then two totals.

- When the forecast passes the entitlement, the chart is the extra spend each month above it,
  with the same lines after clean-up and after archiving.
- What a tenant already holds over the entitlement today is never priced here: only the growth
  is, so the chart agrees with the two totals.
- When the forecast stays inside the entitlement for the six months of the chart, the panel reads
  **Projected value of growth** and the chart is the list-price value of the storage added.
  The totals can still show a cost, because they look 12 months and 3 years ahead. The same holds
  when the entitlement is unknown.

- **Next 12 months** is the growth over the coming year above the entitlement, at the rate.
  Growth inside the entitlement costs nothing.
- **Cumulative, 3 years** adds up three years. Each year is priced on its **mid-year** volume,
  with the same rule. It is the figure on the *Cost of doing nothing, next 3 years* card in
  [Tenant capacity](tenant-capacity.md#cost-of-doing-nothing-next-3-years).

Change the rate and currency in [Report settings](../../reference/settings.md#cost-per-gb-per-month).
