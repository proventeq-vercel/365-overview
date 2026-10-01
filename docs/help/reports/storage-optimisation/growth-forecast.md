---
title: Future state & growth impact
nav: Growth & forecast
description: Where SharePoint storage is heading at the current growth rate, when it passes the entitlement, and what that costs if nothing changes.
section: storage-optimisation
order: 30
---

## Storage trend & forecast

A line chart of SharePoint storage, one point per month:

- **Actual used** is the last reported value of each month in Microsoft's 180-day storage trend.
- **Linear forecast** (dashed) runs six months ahead from the latest month, at the current growth
  rate.
- **Entitlement** is a horizontal line at the SharePoint entitlement, when it is known.

Under the chart:

| Figure | Meaning |
| --- | --- |
| Avg growth / mo | The typical month-to-month growth: the median of the monthly changes ([how](../../reference/calculations.md#growth-rate)). |
| Added last N mo | Storage added between the first and last month of the trend. N counts the month-to-month steps it covers. |
| Live sites | SharePoint sites that are not deleted. |
| Drives near cap | OneDrives at 90% or more of their own allocation. |
| Drives over licence | OneDrives holding more than the OneDrive storage per user ([OneDrives over licence](../onedrive-usage/over-licence.md)). |

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
