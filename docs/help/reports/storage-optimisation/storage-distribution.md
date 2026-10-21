---
title: Current storage distribution
nav: Storage distribution
description: Where storage sits today — every workload on one line against the SharePoint entitlement, and how SharePoint splits by site template.
section: storage-optimisation
order: 10
---

## Storage usage

One line shows where all storage sits, split into seven parts, and ends in what is left of your
SharePoint entitlement. Hover over or select a part, on the line or in the list under it, to see
its size, its share of the line and what it counts.

Above the line, the percentage is SharePoint storage against the SharePoint entitlement. OneDrive
is not part of that percentage, because each OneDrive has its own allowance. The percentage is
green below 85%, orange from 85% and red from 95%. A tenant already over its entitlement also
shows how far over it is, in red.

| Part | Colour | What it counts |
| --- | --- | --- |
| SharePoint | SharePoint teal | Live SharePoint sites with activity inside the inactivity window. It is Microsoft's SharePoint storage total less the Teams, Inactive and deleted-site parts, so the SharePoint parts add up to that total. |
| OneDrive | OneDrive blue | Live OneDrives: Microsoft's OneDrive storage total less deleted OneDrives. It does not use the SharePoint entitlement. |
| Teams | Teams purple | Live sites with activity inside the inactivity window, created from a Teams channel or group template. |
| Deleted | Red | Deleted sites and OneDrives that Microsoft still holds, and bills for, until their retention period ends. [Main offenders](main-offenders.md#deleted-but-still-billing) lists them. |
| Inactive | Amber | Live sites, Teams sites included, with no activity for the [inactivity window](../../reference/settings.md#archive-sites-inactive-for). It is the same storage as the [Inactive sites to archive](tenant-capacity.md#inactive-sites-to-archive) card. |
| Versions | Striped grey, **Not measured** | Version history. Microsoft's usage reports count it inside each site's and OneDrive's storage and do not split it out, so it has no size here. Proventeq 365 measures it library by library. |
| Free | Light grey | The SharePoint entitlement less SharePoint storage, never below zero. **Unknown** when the entitlement is unknown. |

- The parts never overlap: an inactive Teams site counts once, under **Inactive**.
- Microsoft Graph does not say which sites belong to Teams. The report groups by the template each
  site was created from, so these figures will not match the SharePoint admin centre, which
  groups differently.
- If the entitlement is unknown, the line has no **Free** part and a note says how to enter the
  entitlement under **Options (⋯) → Report settings**.
- If the entitlement was [estimated from licences](../../reference/calculations.md#sharepoint-entitlement),
  a note under the line says so.

## Storage by site template

SharePoint storage grouped by the template each live site was created from. The eight largest
templates are shown by name, and the rest are added together as **Other**. Sites without a
template are grouped as **Unknown**.

Use it to see which kind of site holds the volume, for example team sites, communication sites
or Teams channel sites.
