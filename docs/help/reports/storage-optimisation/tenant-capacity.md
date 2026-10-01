---
title: Tenant capacity
description: The four cards for what archiving inactive sites would save, what growth beyond the entitlement costs, and when the entitlement runs out.
section: storage-optimisation
order: 20
---

Four cards sit under the storage distribution. Each card's left rail and value take the colour
of its state.

| Card | Green | Orange | Red | Grey |
| --- | --- | --- | --- | --- |
| Inactive sites to archive | 5% of live site storage or less | above 5%, up to 50% | above 50% | — |
| Potential saving per year | follows *Inactive sites to archive* | | | — |
| Cost of doing nothing, next 12 months | zero | above zero | the next 12 months' billable growth is more than 10% of the entitlement (never while the entitlement is unknown) | — |
| Forecast exhaustion | Healthy: 36 months or more, or no growth | At risk: under 36 months | Critical: under 12 months, or already exceeded | Unknown |

## Inactive sites to archive

The storage held by live SharePoint sites with **no activity for the inactivity window**. The
window is 3 years by default, and you can set 1 to 10 years in
[Report settings](../../reference/settings.md#archive-sites-inactive-for). The description gives
the share of live site storage, the number of sites and the cutoff date.

- The cutoff counts back from the report date: with a report from 30 August 2026 and a 3-year
  window, a site last active before 30 August 2023 counts.
- A site with **no recorded activity** is never counted. It may simply be new.
- Deleted sites are not counted. They are in [Main offenders](main-offenders.md#deleted-but-still-billing).
- The share is of live site storage, so it is not affected by OneDrive.

## Potential saving per year

What the inactive storage costs a year at the configured rate:
`inactive GB × cost per GB per month × 12`. It is the spend you avoid by archiving those sites
out of SharePoint. It takes the same colour as the archive card.

## Cost of doing nothing, next 12 months

The extra spend over the next 12 months on growth that goes **beyond your SharePoint
entitlement**, at the configured rate. It is **zero while growth stays within the entitlement**.

- Growth that stays under the entitlement costs nothing, because you already pay for it.
- If growth crosses the entitlement during the year, only the part above it is priced.
- If the tenant is already over its entitlement, all of the year's growth is priced.
- If the entitlement is unknown, nothing shows that the growth fits, so all of it is priced.

The growth rate is the typical month-to-month growth from the storage trend
([how](../../reference/calculations.md#growth-rate)). The card turns red once the next 12 months'
billable growth is more than a tenth of the entitlement. That rule does not depend on the rate,
so changing the currency or price does not change the colour, except a price of 0, which leaves
nothing to pay and turns the card green. With an unknown entitlement there is nothing to compare
with, so the card stays orange however large the growth.

> This figure is a deliberate departure from the full Proventeq 365 product, which prices all
> growth. Here, growth already covered by your entitlement is treated as free.

## Forecast exhaustion

The month SharePoint storage passes your entitlement if it keeps growing at the current rate.
The description gives the entitlement, the monthly growth and the headroom left.

| You see | Because |
| --- | --- |
| A month, for example *March 2028* | The headroom runs out then at the current rate. |
| **Beyond 10 years** | The headroom outlasts the ten-year horizon. |
| **No growth detected** | Storage has not grown over the measured months. |
| **Not enough history** | Fewer than six months of storage history. This is not an all-clear. |
| **Entitlement already exceeded** | Used storage is already at or over the entitlement. There is no future date to project. |
| **Unknown** (grey) | The entitlement is unknown. Enter it in Report settings. |

[Future state & growth impact](growth-forecast.md) shows the trend behind this card.
