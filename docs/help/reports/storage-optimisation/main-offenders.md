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

- Microsoft keeps no history of each site's size. Its daily usage report for an earlier day lists
  only the sites and OneDrives that had activity on that day, with their size at the end of it.
  Microsoft offers those daily reports for the last 28 days, counting today. The report reads
  every day from 26 days ago, keeping a day in hand, up to the report date. The description
  under the title gives the first and last day and the number of days.
- **Storage added** is the size on the report date less the size on the first day in that window
  the site or OneDrive was active. Storage added on that first day itself is not counted, so a
  site that received everything in one day, or was created inside the window, can show less
  growth than it had. Each one is measured from its own first active day, so two rows can cover
  different spans of the window.
- A site or OneDrive with no activity in the window has no daily figure, so it is left out. So
  are those that shrank, stayed the same or were deleted. If none of the measured ones grew, the
  panel says so instead of drawing an empty chart. If no daily report lists any activity at all,
  it says there was nothing to measure, which is not the same as no growth.
- The chart loads after the rest of the report, with a placeholder while it does. If Microsoft
  does not return every daily report, or the report date is older than the days Microsoft keeps,
  the panel says growth is unavailable. It never shows zero growth in its place.
- Microsoft limits how often its usage reports can be read, so once growth has loaded for a report
  date, **Refresh data** does not read it again. If it failed, **Refresh data** tries again.

## Largest sites and OneDrives

Two lists sit under the growth chart:

- **Top SharePoint sites by storage**: the five largest sites.
- **Top OneDrives by storage**: the five largest personal drives.

The names come from the site directory on the application-permissions site, or from a lookup as
the signed-in user on the delegated site.
When a name cannot be found, the row is listed by its id (see
[Site names](../../reference/site-names.md)).

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
