---
title: Main offenders
description: The sites and OneDrives growing fastest and holding the most, storage that is deleted but still billing, and a searchable table of everything.
section: storage-optimisation
feature: optimization.storage.report.overview
order: 40
---

## Fastest-growing sites & OneDrives

The ten sites and OneDrives together that added the most storage over about the last four weeks,
ranked by storage added. It shows who is driving growth, which the size alone does not.

- The report reads Microsoft's site and OneDrive usage reports twice: for the report date, and
  for the day four weeks earlier. Microsoft keeps those daily reports for 30 days only, so when
  four weeks back is older than that, the earlier day is the oldest one Microsoft still has. The
  description under the title gives both dates and the number of days.
- **Storage added** is the size on the report date less the size on the earlier day. A site or
  OneDrive that did not exist on the earlier day counts from nothing.
- Sites and OneDrives that shrank, stayed the same or were deleted are left out. If nothing grew,
  the panel says so instead of drawing an empty chart.
- The chart loads after the rest of the report, with a placeholder while it does. If Microsoft
  does not return the earlier day's report, the panel says growth is unavailable. It never shows
  zero growth in its place.

## Largest sites and OneDrives

Two lists sit under the growth chart:

- **Top SharePoint sites by storage**: the five largest sites.
- **Top OneDrives by storage**: the five largest personal drives.

The names come from the site directory on the application-permissions site, or from a lookup as
the signed-in user on the delegated site.
When a name cannot be found, the row is listed by its id (see
[Site names](../../reference/site-names.md)). A long name is cut short; hover over or focus it to
see it in full (see [Long names](../../reference/site-names.md#long-names)).

## Deleted but still billing

Sites and OneDrives that have been deleted but still count against your storage under retention.
They keep using quota until retention ends or they are purged from the recycle bin. The panel
only appears when there are some. It shows their total size and how many there are.

## All sites and OneDrives

Every site and drive in the usage reports, in one table.

| Column | Meaning |
| --- | --- |
| Site | The display name and a link to the site, which opens in a new tab. A site that cannot be named shows its id. |
| Owner | The primary owner as Microsoft records it. For group-connected sites, these are the Microsoft 365 group's owners. |
| Storage used | Storage consumed as of the report date. |
| Share | This row's storage as a percentage of all SharePoint and OneDrive storage in use, with a bar on the same scale. |
| Files | Files stored as of the report date. |
| Active files | Files created, edited or otherwise active in the 180-day period. |
| Last activity | The most recent day with file activity. **Never** means none in the 180 days. |
| Template | The template the site was created from. |

Hover over or focus a column header to see its explanation in the table itself.

### Search, sort and pages

- **Search** matches the name, owner and id, and it updates as you type. It searches every name
  the report has looked up so far, including names from pages you have opened.
- **Sort** by selecting a column header. Search and sort go back to the first page.
- **Rows per page** can be 50, 100, 250 or 500.

The table is built for tenants with millions of rows, so names are looked up only for the rows
on screen. A row shows a short placeholder while its name loads.
