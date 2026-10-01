---
title: Proventeq 365 storage report help
nav: Overview
description: What the storage report shows, where its figures come from, and where to start.
section: start
order: 0
---

The Proventeq 365 storage report is a sneak peek of the Proventeq 365 storage-optimisation report.
It reads your Microsoft 365 tenant's own usage reports. From them it shows where SharePoint and
OneDrive storage sits today, how fast it grows and when it will pass the storage your licences
include. It also shows what that growth costs and which sites and drives drive the volume.

## Start here

- **Setting the report up for your organisation?** Read
  [Enable access to the report](getting-started/enable-access.md). An administrator does it once
  for the whole tenant.
- **Not sure what the report may read?** [Permissions](getting-started/permissions.md) lists
  every permission, which ones are optional and what you lose without them.
- **The report showed an error screen?** [Troubleshooting](getting-started/troubleshooting.md)
  covers each screen and what fixes it.

## The reports

| Report | What it answers |
| --- | --- |
| [Storage Optimisation](reports/storage-optimisation/index.md) | Where tenant storage sits, how much is inactive, when the SharePoint entitlement runs out and what growth will cost. |
| [OneDrive Usage](reports/onedrive-usage/index.md) | How much sits in personal OneDrives, who holds the most, and which drives are near their cap or over their licence. |

Every section of a report has a **?** button next to its title. It explains the section in a
sentence and links to the matching page here.

## Where the figures come from

The report reads Microsoft's usage reports for the last 180 days, through Microsoft Graph.
Microsoft publishes those reports two to three days behind, so every report says which day its
data is from. Nothing is estimated from samples: storage figures are Microsoft's own. Only two
figures are estimates, and each says so on screen:

- the **SharePoint entitlement**, which is worked out from your licences
  ([how](reference/calculations.md#sharepoint-entitlement));
- the **OneDrive storage per user**, which is the most generous licence in the tenant
  ([how](reference/calculations.md#onedrive-storage-per-user)).

You can replace either in [Report settings](reference/settings.md).

## Using the report

- **Options (⋯)**, top right, lets you refresh the data, open Report settings, open this help,
  switch account or sign out.
- With more than one report enabled, the menu button at the top left lists them.
- [Data and privacy](reference/data-and-privacy.md) explains what leaves your browser and what
  does not.
