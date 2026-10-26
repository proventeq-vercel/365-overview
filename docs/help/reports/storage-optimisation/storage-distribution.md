---
title: Current storage distribution
nav: Storage distribution
description: Where storage sits today — every SharePoint workload on one line against the SharePoint entitlement, OneDrive as its own pool, and how SharePoint splits by site template.
section: storage-optimisation
feature: optimization.storage.report.overview
order: 10
---

## Storage usage

One line shows where SharePoint storage sits, split into six parts, and ends in what is left of
your SharePoint entitlement. Hover over or select a part, on the line or in the list under it, to
see its size, its share of the line and what it counts.

OneDrive is not on this line. Microsoft's
[SharePoint limits](https://learn.microsoft.com/en-us/office365/servicedescriptions/sharepoint-online-service-description/sharepoint-online-limits)
give the organisation's total storage as "not including the OneDrive created for each licensed
user": each OneDrive has its own allowance from the user's licence. OneDrive is shown on its own
under [Live OneDrive storage](#live-onedrive-storage).

Above the line, the percentage is SharePoint storage against the SharePoint entitlement. The percentage is
green below 85%, orange from 85% and red from 95%. A tenant already over its entitlement also
shows how far over it is, in red.

| Part | Colour | What it counts |
| --- | --- | --- |
| SharePoint | SharePoint teal | Live SharePoint sites with activity inside the inactivity window. It is Microsoft's SharePoint storage total less the Teams, Inactive and deleted-site parts, so the SharePoint parts add up to that total. |
| Teams | Teams purple | Live sites with activity inside the inactivity window, created from a Teams channel or group template. |
| Deleted | Red | Deleted sites that Microsoft still holds, and counts against the entitlement, until their retention period ends. Deleted OneDrives are not part of the SharePoint entitlement, so they are not on this line. [Main offenders](main-offenders.md#deleted-but-still-billing) lists both. |
| Inactive | Amber | Live sites, Teams sites included, with no activity for the [inactivity window](../../reference/settings.md#archive-sites-inactive-for). It is the same storage as the [Inactive sites to archive](tenant-capacity.md#inactive-sites-to-archive) card. |
| Versions | Striped grey, **Not measured** | Version history. Microsoft's usage reports count it inside each site's storage and do not split it out, so it has no size here. Proventeq 365 measures it library by library. |
| Free | Light grey | The SharePoint entitlement less SharePoint storage, never below zero. **Unknown** when the entitlement is unknown. |

- The parts never overlap: an inactive Teams site counts once, under **Inactive**.
- Microsoft Graph does not say which sites belong to Teams. The report groups by the template each
  site was created from, so these figures will not match the SharePoint admin centre, which
  groups differently.
- If the entitlement is unknown, the line has no **Free** part and a note says how to enter the
  entitlement under **Options (⋯) → Report settings**.
- If the entitlement was [estimated from licences](../../reference/calculations.md#sharepoint-entitlement),
  a note under the line says so.

## Live OneDrive storage

OneDrive is a separate pool, so it gets its own line under the SharePoint one. The percentage is
the storage in live OneDrives against the storage Microsoft allocates to them: the sum of every
live OneDrive's own limit, as the OneDrive usage report gives it.

| Part | Colour | What it counts |
| --- | --- | --- |
| Used | OneDrive blue | The storage in live OneDrives, as the OneDrive usage report lists them. Deleted OneDrives are listed under [Deleted but still billing](main-offenders.md#deleted-but-still-billing). |
| Unused allocation | Light grey | The allocation less the storage used, never below zero. |

- If Microsoft does not report an allocation for every live OneDrive, the total allocation is
  unknown: the panel gives the storage used and says so, with no line. With no live OneDrive at
  all, it says so.
- A small total does not mean no OneDrive is full: each has its own limit. The panel says how many
  are at 90% or more of theirs, whether or not the total allocation is known. A share that would
  round to 0.0% shows as **<0.1%**, and one that would round to 100.0% as **>99.9%**.

## Storage by site template

SharePoint storage grouped by the template each live site was created from. The eight largest
templates are shown by name, and the rest are added together as **Other**. Sites without a
template are grouped as **Unknown**.

Use it to see which kind of site holds the volume, for example team sites, communication sites
or Teams channel sites.
