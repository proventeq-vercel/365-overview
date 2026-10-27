---
title: Tenant capacity
nav: Capacity cards
description: The cards at the top of the report — inactive sites to archive, what archiving would save, what growth beyond the entitlement costs, and when the entitlement runs out.
section: storage-optimisation
feature: optimization.storage.report.overview
order: 20
---

The cards sit at the top of the report, straight under its title. Each card's left rail and value
take the colour of its state.

Only the cards that apply to your tenant are shown:

| Your SharePoint storage is | Cards shown |
| --- | --- |
| Within the entitlement | Inactive sites to archive · Cost of doing nothing · Forecast exhaustion |
| At or over the entitlement | Inactive sites to archive · Potential saving per year · Cost of doing nothing |
| Against an unknown entitlement | All four, with *SharePoint growth per month* in place of *Forecast exhaustion* |
| With a single reported day of storage | Inactive sites to archive · *SharePoint storage used* in place of the forecast, plus Potential saving per year against an unknown entitlement. *Cost of doing nothing* is left out: there is no growth rate to price yet. An exceeded entitlement shows Inactive sites to archive and Potential saving per year. |

- **Potential saving per year** appears only once you are over the entitlement. Below it, storage
  you archive was already paid for by your licences, so archiving saves nothing.
- **Forecast exhaustion** is left out once the entitlement is already exceeded. There is no
  future date to forecast.
- **Inactive sites to archive** is always shown.

| Card | Green | Orange | Red | Grey |
| --- | --- | --- | --- | --- |
| Inactive sites to archive | 5% of live site storage or less | above 5%, up to 50% | above 50% | — |
| Potential saving per year | follows *Inactive sites to archive* | | | — |
| Cost of doing nothing, next 12 months | zero | above zero | the next 12 months' billable growth is more than 10% of the entitlement (never while the entitlement is unknown) | — |
| Forecast exhaustion | Healthy: 36 months or more, or no growth | At risk: under 36 months | Critical: under 12 months | — |

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

The spend you avoid in a year by archiving the inactive sites out of SharePoint, at the configured
rate. Only storage **over the entitlement** costs anything, so only that part is priced:
`smaller of (inactive GB, GB over the entitlement) × cost per GB per month × 12`. The description
says how much of the overage archiving would clear. It takes the same colour as the archive card.

With an unknown entitlement nothing shows that the storage is covered, so all the inactive
storage is priced, as the cost of doing nothing does.

## Cost of doing nothing, next 12 months

The extra spend over the next 12 months on growth that goes **beyond your SharePoint
entitlement**, at the configured rate. It is **zero while growth stays within the entitlement**.

- Growth that stays under the entitlement costs nothing, because you already pay for it.
- If growth crosses the entitlement during the year, only the part above it is priced.
- If the tenant is already over its entitlement, all of the year's growth is priced.
- If the entitlement is unknown, nothing shows that the growth fits, so all of it is priced.

The growth rate is the typical month-to-month growth from the storage trend, or the daily rate
under six months of history ([how](../../reference/calculations.md#growth-rate)). The card is left
out when Microsoft 365 has reported a single day of storage: there is no growth to price yet. The card turns red once the next 12 months'
billable growth is more than a tenth of the entitlement. That rule does not depend on the rate,
so changing the currency or price does not change the colour, except a price of 0, which leaves
nothing to pay and turns the card green. With an unknown entitlement there is nothing to compare
with, so the card stays orange however large the growth.

> This figure is a deliberate departure from the full Proventeq 365 product, which prices all
> growth. Here, growth already covered by your entitlement is treated as free.

## Forecast exhaustion

The month SharePoint storage passes your entitlement if it keeps growing at the current rate.
The card is not shown once the entitlement is already exceeded.
The description gives the entitlement, the monthly growth and the headroom left.

| You see | Because |
| --- | --- |
| A month, for example *March 2028* | The headroom runs out then at the current rate. |
| **Beyond 10 years** | The headroom outlasts the ten-year horizon. |
| **No growth detected** | Storage has not grown over the measured months. |

With under six months of storage history, the month comes from the daily storage reported so
far, and the description says how many days it was measured over.

Two cases show a different card in the same place, in navy:

| Card | Because |
| --- | --- |
| **SharePoint growth per month** | The entitlement is unknown. The value is the monthly growth, and the description gives the storage used and where to enter the entitlement. |
| **SharePoint storage used** | Microsoft 365 has reported a single day of storage, so there is no rate to forecast from yet. When the storage trend lists no day at all, the value is the total of the site usage report, and the description says so. |

[Future state & growth impact](growth-forecast.md) shows the trend behind this card.
