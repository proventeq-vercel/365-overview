---
title: Tenant capacity
nav: Capacity cards
description: The cards at the top of the report — storage used against the entitlement, and only the cards you can act on: over the entitlement, when it runs out, what growth costs, inactive sites to archive and deleted storage.
section: storage-optimisation
feature: optimization.storage.report.overview
order: 20
---

The cards sit at the top of the report, straight under its title, below a small *Tenant capacity*
label. Each card's left rail and value take the colour of its state.

**SharePoint storage used** is always shown. The other cards appear only when there is something
to act on, in this order:

| Card | Shown when |
| --- | --- |
| Over entitlement | SharePoint storage is above the entitlement. |
| Forecast exhaustion | At the current growth the entitlement runs out within 24 months, and it is not reached yet. A tenant exactly at or over its entitlement gets no forecast card. |
| Cost of doing nothing, next 3 years | There is a growth rate and growth over the next three years costs money. |
| Inactive sites to archive | At least one live site has had no activity for the inactivity period, and those sites hold storage. |
| Deleted but still counting (or billing) | Deleted sites or OneDrives still hold storage, and both usage reports came back. |

A card whose value would be zero, empty or "no exhaustion" is left out rather than shown with that
value.

The money on *Over entitlement*, the billed amount on the deleted storage card and the saving on
*Inactive sites to archive* overlap: the last two are parts of the first. Do not add them up.

## SharePoint storage used

The SharePoint storage in use today. The description gives it against the entitlement, for
example *500 GB of 1000 GB entitlement*.

- Over the entitlement it adds the amount over, in red: *1.1 TB of 1000 GB entitlement · 100 GB over*.
- When the entitlement comes from your licences rather than a figure you entered, it adds
  *entitlement estimated from licences*.
- With no entitlement at all it reads *No entitlement entered · Enter it in Report settings*. The link
  opens [Report settings](../../reference/settings.md#sharepoint-entitlement) on the SharePoint
  entitlement.
- When the storage figure is the total of the site usage report, a second line says so: *This is
  the total of its site usage report: Microsoft 365's storage trend lists no day with storage
  yet.*, or *… Microsoft 365's SharePoint storage trend did not come back this time.*

## Over entitlement

How much SharePoint storage is above the entitlement, in red. The description prices it:
*Billed now: about £120.00/yr for the storage above your entitlement*, at the configured rate.

## Forecast exhaustion

The month SharePoint storage passes your entitlement if it keeps growing at the current rate. It is
shown only when that month is at most 24 months away and the entitlement is not reached yet. With
no entitlement the card is left out. The description reads *At current growth*;
with under six months of storage history it adds how many days the rate was measured over.

| Rail | Because |
| --- | --- |
| Red | Critical: under 12 months. |
| Orange | At risk: under 36 months. |

The growth rate and the entitlement line behind it are in
[Future state & growth impact](growth-forecast.md).

## Cost of doing nothing, next 3 years

The extra spend over the next three years on growth that goes **beyond your SharePoint
entitlement**, at the configured rate. Growth that stays under the entitlement costs nothing,
because you already pay for it, so the card is left out while growth fits.

- If growth crosses the entitlement, only the part above it is priced.
- If the tenant is already over its entitlement, all of the growth is priced.
- If the entitlement is unknown, nothing shows that the growth fits, so all of it is priced.

The card is shown only when there is a growth rate and the three-year figure is above zero. Its
colour is graded on that figure:

| Rail | Because |
| --- | --- |
| Orange | Above zero. |
| Red | The billable growth in the third year (priced on its mid-year volume) is more than a tenth of the entitlement. With no entitlement it is orange, never red. |

The growth rate is the typical month-to-month growth from the storage trend, or the daily rate
under six months of history ([how](../../reference/calculations.md#growth-rate)).

> This figure is a deliberate departure from the full Proventeq 365 product, which prices all
> growth. Here, growth already covered by your entitlement is treated as free.

## Inactive sites to archive

The storage held by live SharePoint sites with **no activity for the inactivity period**. The
description gives the number of sites, their share of live site storage and the cutoff day, for
example *42 sites · 24.0% of live site storage · no activity since 30 Aug 2023*. A share too small
to round reads *<0.1%*. Under it, *Inactive means no activity for 3 years. Change it in Report
settings* opens [Report settings](../../reference/settings.md#archive-sites-inactive-for) on the
inactivity period (1 to 10 years, 3 by default).

| Rail | Share of live site storage |
| --- | --- |
| Green | 5% or less |
| Orange | above 5%, up to 50% |
| Red | above 50% |

- The cutoff counts back from the report date: with a report from 30 August 2026 and a 3-year
  period, a site last active before 30 August 2023 counts.
- A site with **no recorded activity** is never counted. It may simply be new.
- Deleted sites are not counted here. They are the deleted storage card below.
- Sites that hold no storage do not make the card appear.

### Potential saving per year

When no entitlement is entered, or you are already at or over it, the description adds what
archiving saves a year: *· archiving saves £24.00/yr*. Only storage **over the entitlement** costs
anything, so only that part is priced:
`smaller of (inactive GB, GB over the entitlement) × cost per GB per month × 12`. With no
entitlement entered, nothing shows that the storage fits, so all of the inactive storage is priced.
Under the entitlement, storage you archive was already paid for by your licences, so nothing is
added.

## Deleted but still counting

Deleted sites in the recycle bin or under retention, and deleted OneDrives under retention, still
hold storage until they are purged. The value is their total size; the description says how many
there are and whether that storage costs money. Only a pool whose deleted rows hold storage is
counted. The card adds the SharePoint and OneDrive reports, so it is left out when either usage
report did not come back:

| Your SharePoint storage is | The card reads |
| --- | --- |
| Over the entitlement | **Deleted but still billing**, in orange: *24 GB of it is past your entitlement and billed · £5.76/yr until purged*. Only the deleted storage that sits above the entitlement is billed. |
| Under the entitlement | *Counts toward your storage, not billed today: you are under your entitlement by 500 GB.* |
| Exactly at the entitlement | *Counts toward your storage, not billed today: you are at your entitlement, so any growth is billed.* |
| Against no entitlement | *Counts toward your storage; whether it is billed depends on your entitlement.*, with a link to enter it. |

Deleted OneDrives are not part of the SharePoint entitlement. When only OneDrives are deleted the
card reads *Held in the OneDrive pool, outside your SharePoint storage entitlement*.
[Main offenders](main-offenders.md#deleted-but-still-billing) lists them.
