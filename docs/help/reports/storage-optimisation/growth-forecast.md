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
  rate.
- **Forecast after clean-up** (dotted) is the same forecast if the storage the report already
  calls removable were cleaned up today: it starts at today's storage minus that storage and
  grows at the same rate ([what is counted](#if-inactive-and-deleted-sites-are-cleaned-up)).
- **Entitlement** is a horizontal line at the SharePoint entitlement, when it is known.

Under the chart:

| Figure | Meaning |
| --- | --- |
| Avg growth / mo | The typical month-to-month growth: the median of the monthly changes ([how](../../reference/calculations.md#growth-rate)). |
| Added last N mo | Storage added between the first and last month of the trend. N counts the month-to-month steps it covers. |
| Live sites | SharePoint sites that are not deleted. |
| Drives near their quota | OneDrives at 90% or more of their own storage quota, the per-drive limit in the usage report. An admin can set it above or below the licence. |
::: feature optimization.storage.report.onedrive
| Drives over their licence | OneDrives holding more than the storage their licence includes, the OneDrive storage per user ([OneDrives over licence](../onedrive-usage/over-licence.md)). |
:::
::: unless-feature optimization.storage.report.onedrive
| Drives over their licence | OneDrives holding more than the storage their licence includes, the OneDrive storage per user. |
:::

## Growth impact

A status badge and a headline about the entitlement:

| Badge | Headline |
| --- | --- |
| **Critical** | Under 12 months of headroom, or the entitlement is already exceeded. |
| **At risk** | Under 36 months of headroom. |
| **Healthy** | 36 months or more, or storage is not growing. |
| **Unknown** | No entitlement, or under six months of history. |

The callout under the badge explains the headline. There are three special cases:

- **Entitlement already exceeded.** The tenant already uses more than its pooled entitlement.
  No future date is shown, because there is nothing left to run out. Procurement or cleanup is
  needed now.
- **Not enough history to forecast capacity.** A forecast needs six months of measured storage.
  This is **not an all-clear**. It appears once Microsoft 365 has reported enough history.
- **Capacity forecast unavailable without tenant entitlement.** Enter the entitlement in
  [Report settings](../../reference/settings.md#sharepoint-entitlement).

**Used today**, **Forecast (6 mo)** and **Over entitlement today** show where storage is now, where the
forecast ends, and how far past the entitlement the tenant already is.

### If inactive and deleted sites are cleaned up

| Figure | Meaning |
| --- | --- |
| Removable today | Storage in live sites with no activity for the inactivity window set in [Report settings](../../reference/settings.md#archive-sites-inactive-for) (the *Inactive sites to archive* card), plus storage in deleted sites still billing (the *Deleted but still billing* figure). |
| Forecast after clean-up (6 mo) | Where the dotted line ends. |
| Stays under the entitlement | **Yes** when the dotted line stays below the entitlement for the whole forecast, **No** when it reaches it, **Unknown** without an entitlement. |

Only SharePoint storage is counted. Deleted OneDrives are in the OneDrive pool, so they do not
lower the SharePoint forecast. **Versions are not counted**: Microsoft's usage reports do not
carry version storage.

The dotted line is not drawn when nothing is removable, or when there is under six months of
history to forecast from. The note under the figures says which.

A note can appear when the monthly figures are **uneven**, for example when one month dominates
rather than a steady trend. A single average is then a weak guide, so treat the projection as
indicative.

## Projected cost if nothing changes

The extra spend once storage grows past the entitlement, at the configured rate.

- **Next 12 months** is the same figure as the *Cost of doing nothing* card in
  [Tenant capacity](tenant-capacity.md#cost-of-doing-nothing-next-12-months).
- **Cumulative, 3 years** adds up three years. Each year is priced on its **mid-year** volume,
  with the same rule: growth inside the entitlement costs nothing.

Change the rate and currency in [Report settings](../../reference/settings.md#cost-per-gb-per-month).
