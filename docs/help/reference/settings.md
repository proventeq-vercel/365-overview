---
title: Report settings
description: The cost rate, currency, SharePoint entitlement, OneDrive storage per user and inactivity window, and what each one changes.
section: reference
order: 10
---

Open **Options (⋯) → Report settings**, at the top right of the report. Settings are saved in
this browser only, and they are not shared with anyone else who opens the report. A change
updates the figures straight away and never reloads data from Microsoft.

## Currency

The currency every cost is shown in. The default is **GBP**. Changing it changes the symbol only.
It does not convert the rate, so enter the rate in the currency you pick.

## Cost per GB per month

The price of one GB of storage for one month. The default is **0.02** a GB a month, the same
default as Proventeq 365.

::: feature optimization.storage.report.overview
It prices:

- the [potential saving per year](../reports/storage-optimisation/tenant-capacity.md#potential-saving-per-year),
- the [cost of doing nothing](../reports/storage-optimisation/tenant-capacity.md#cost-of-doing-nothing-next-12-months),
- the [projected cost](../reports/storage-optimisation/growth-forecast.md#projected-cost-if-nothing-changes).
:::

The rate does not change a card's colour, except a rate of 0: with nothing to pay, the cost of
doing nothing is green.

## SharePoint entitlement

The tenant's pooled SharePoint storage, in TB. By default it is
[estimated from your licences](calculations.md#sharepoint-entitlement), and the setting shows
that estimate as a hint. To replace it, enter the tenant's total storage from the **SharePoint
admin centre**. Clear the field to go back to the estimate.

With no estimate and no figure entered, everything measured against the entitlement shows as
**Unknown**: the free part of the storage usage line, the forecast and the headroom. Nothing is filled in with a guess.

## OneDrive storage per user

What each user's licence includes, in GB. By default it is the
[most generous plan in the tenant](calculations.md#onedrive-storage-per-user). Enter a figure to
replace it, for example when you have raised every drive to a set quota. Clear it to go back to
the estimate. It decides which drives count as over licensed storage.

::: feature optimization.storage.report.onedrive
The [OneDrives over licence](../reports/onedrive-usage/over-licence.md) page lists them.
:::

## Archive sites inactive for

How long a site must go without activity to count as ready to archive, and a OneDrive to count
as inactive. You can pick 1 to 10 years. The default is 3 years.

::: feature optimization.storage.report.overview
It decides [Inactive sites to archive](../reports/storage-optimisation/tenant-capacity.md#inactive-sites-to-archive)
and the **Inactive** part of the
[storage usage line](../reports/storage-optimisation/storage-distribution.md#storage-usage).
:::

::: feature optimization.storage.report.onedrive
It also decides the [inactive OneDrives](../reports/onedrive-usage/inactive.md) and their bands.
:::

## Other options in the menu

| Option | What it does |
| --- | --- |
| Refresh data | Reloads every usage report from Microsoft Graph, except the daily reports behind the fastest-growing panel once they have loaded for the report date (a failed read is tried again once the report itself reloads). It is disabled while a refresh runs. |
| Report settings | Opens these settings. |
| Help | Opens this help in a new tab. |
| Switch account | Signs in with a different Microsoft account. |
| Sign out | Ends the session. |

## Link options

These query options are added to the report's address:

| Option | Effect |
| --- | --- |
| `?hideNames=true` | Blurs site names and owners for the rest of the tab ([Site names](site-names.md#hidden-names)). `?hideNames=` shows them again, unless the site itself is set up to hide names. |
