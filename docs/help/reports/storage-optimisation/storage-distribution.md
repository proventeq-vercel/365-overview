---
title: Current storage distribution
nav: Storage distribution
description: Where storage sits today — what SharePoint, Teams and OneDrive each store, and how SharePoint splits by site template.
section: storage-optimisation
feature: optimization.storage.report.overview
order: 10
---

When neither the SharePoint site usage report nor a SharePoint storage trend with storage in it
comes back, this section is left out: see [A Microsoft report did not come back](../../getting-started/troubleshooting.md#a-microsoft-report-did-not-come-back).

## Storage usage

One line per source shows what it stores today: SharePoint, Teams and OneDrive. Every line is drawn
against the largest one, so the lengths compare, and each gives its size and its share of all the
storage shown. Above the lines is the total. Hover over or select a line to see what it counts.

| Line | Colour | What it counts |
| --- | --- | --- |
| SharePoint | SharePoint teal | Live SharePoint sites, from the SharePoint site usage report. |
| Teams | Teams purple | Live sites created from a Teams channel or group template, from the same report. |
| OneDrive | OneDrive blue | Live OneDrives, from the OneDrive usage report. |

- Deleted sites and OneDrives are not on the lines. [Main offenders](main-offenders.md#deleted-but-still-billing)
  lists the ones Microsoft still holds. Inactive sites are on their lines like any live site; the
  [Inactive sites to archive](tenant-capacity.md#inactive-sites-to-archive) card adds them up.
- How much of the SharePoint entitlement is used is not shown here: this panel is about what is
  stored, not about the quota.
- OneDrive is a separate pool. Microsoft's
  [SharePoint limits](https://learn.microsoft.com/en-us/office365/servicedescriptions/sharepoint-online-service-description/sharepoint-online-limits)
  give the organisation's total storage as "not including the OneDrive created for each licensed
  user": each OneDrive has its own allowance from the user's licence.
- When the SharePoint site usage report does not come back, one SharePoint line holds all the
  SharePoint storage in the storage trend, Teams sites included, and there is no Teams line. When
  the OneDrive usage report does not come back, the OneDrive line comes from the OneDrive storage
  trend. See [A Microsoft report did not come back](../../getting-started/troubleshooting.md#a-microsoft-report-did-not-come-back).
- Microsoft Graph does not say which sites belong to Teams. The report groups by the template each
  site was created from, so these figures will not match the SharePoint admin centre, which
  groups differently.
- A share that would round to 0.0% shows as **<0.1%**, and one that would round to 100.0% as
  **>99.9%**.

## Storage by site template

SharePoint storage grouped by the template each live site was created from. The eight largest
templates are shown by name, and the rest are added together as **Other**. Sites the usage report
gives no template for are grouped as **Template not reported**, which is added to **Other** when it
is not among the eight largest.

Use it to see which kind of site holds the volume, for example team sites, communication sites
or Teams channel sites.
