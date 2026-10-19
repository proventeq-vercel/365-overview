---
title: Storage Optimisation report
nav: Overview
description: A consolidated summary of tenant storage — where it sits today, where it is heading, and what drives it.
section: storage-optimisation
feature: optimization.storage.report.overview
order: 0
---

The Storage Optimisation report covers your whole tenant on one page. From top to bottom it runs
from today's position to the actions that would change it:

1. [Capacity cards](tenant-capacity.md), straight under the title: inactive sites to archive,
   what archiving would save once you are over the entitlement, what growth beyond the
   entitlement costs, and when the entitlement runs out.
2. [Current storage distribution](storage-distribution.md): one line for SharePoint, OneDrive,
   Teams, deleted, inactive, versions and free storage against the SharePoint entitlement, and
   how SharePoint splits by site template.
3. [Future state & growth impact](growth-forecast.md): the storage trend, a six-month forecast,
   and the projected cost if nothing changes.
4. [Main offenders](main-offenders.md): the biggest sites and OneDrives, storage that is deleted
   but still billing, and a searchable table of every site and drive.

## Reading the report

- **Data as of** under the title is the day Microsoft's usage report was produced. Microsoft
  publishes it two to three days behind.
- **Colours carry a state.** Green means healthy. Orange means watch it. Red means act. Grey
  means the figure is unknown. Each card's page says what moves it between them.
- **SharePoint and OneDrive are two pools.** The SharePoint entitlement is shared by the whole
  tenant. Each OneDrive has its own per-user allowance. The report never mixes the two in one
  percentage.
- **Settings change the figures straight away.** The cost rate, currency, entitlement and
  inactivity window are in [Report settings](../../reference/settings.md), and changing them
  never reloads data from Microsoft.

## Notes that can appear

- **Your storage quota was estimated from licence counts.** The entitlement is
  [worked out from your licences](../../reference/calculations.md#sharepoint-entitlement), so
  headroom and cost figures are approximate. Enter the real figure from the SharePoint admin
  centre in Report settings to remove the note.
- **Concealed or hidden names.** See [Site names](../../reference/site-names.md).
