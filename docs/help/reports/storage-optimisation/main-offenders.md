---
title: Main offenders
description: The sites and OneDrives growing fastest and holding the most, storage that is deleted but still billing, and a searchable table of everything.
section: storage-optimisation
feature: optimization.storage.report.overview
order: 40
---

When the SharePoint site usage report or the OneDrive usage report does not come back, this
section lists the pool whose report did, and *Deleted but still billing* is left out. Without
both, the section is left out: see [A Microsoft report did not come back](../../getting-started/troubleshooting.md#a-microsoft-report-did-not-come-back).

## Fastest-growing sites & OneDrives

The ten sites and OneDrives together that added the most storage over about the last four weeks,
ranked by storage added. It shows who is driving growth, which the size alone does not.

- Microsoft keeps no history of each site's size. Its daily usage report for an earlier day lists
  only the sites and OneDrives that had activity on that day, with their size on that day.
  Microsoft offers those daily reports for the last 28 days, counting today. The report reads
  every day from 26 days ago, keeping a day in hand, up to the report date. When it ranks by
  growth or by storage freed, the description under the title gives the first and last day and
  the number of days.
- **Storage added** is the size on the report date less the size on the first day in that window
  the site or OneDrive was active. Storage added on that first day itself is not counted, so a
  site that received everything in one day, or was created inside the window, can show less
  growth than it had. Each one is measured from its own first active day, so two rows can cover
  different spans of the window.
- From the growth ranking, a site or OneDrive with no activity in the window has no daily figure,
  so it is left out. So are those that shrank, stayed the same or were deleted.
- Each day has two daily reports, one for SharePoint and one for OneDrive, and each is read on its
  own. If one does not come back, the panel measures from the ones that did. The window then
  starts on the first day a report came back, and the description says how many of each came
  back, out of the days in the window.
- The panel asks four days at a time. It stops asking for one of the two reports once Microsoft
  limits the requests for it, or once a whole group of four days of it fails after the first
  group, and measures from what it already has, so it does not spend more of the limit the rest
  of the report shares. The other report is still read.
- The panel always draws a chart, and its title says what it ranks:
  - **Sites & OneDrives that shrank the most**, by **Storage freed**, when none of the measured
    ones grew but some shrank.
  - **Sites & OneDrives by storage used**, by **Storage used** on the report date, when no daily
    report came back, when the report date is not at least two days inside the days Microsoft
    keeps, when no site or
    OneDrive in the report was active in the reports that came back, when none of them changed
    size, or when measuring did not finish. The description says which. It lists the
    ten largest sites and OneDrives together, so it repeats the two lists below it.
- The chart loads after the rest of the report, with a placeholder while it does.
- Microsoft limits how often its usage reports can be read, so once growth has loaded from every
  daily report for a report date, **Refresh data** does not read it again. If some daily reports did
  not come back, **Refresh data** reads every day of the window again once the report itself
  reloads and ten minutes have passed since they were read. Unless the new result has every
  report, it keeps the earlier one if the new one brings back fewer reports, or as many but fewer
  of SharePoint's or of OneDrive's. If
  measuring did not finish, it reads them again at once. When the report itself moves to a new
  date, the chart shows its placeholder again while the new date's daily reports are read.

## Largest sites and OneDrives

Two lists sit under the growth chart:

- **Top SharePoint sites by storage**: the five largest sites.
- **Top OneDrives by storage**: the five largest personal drives.

The names come from the site directory on the application-permissions site, or from a lookup as
the signed-in user on the delegated site.
When a name cannot be found, the row is listed by its id (see
[Site names](../../reference/site-names.md)).

## Deleted but still billing

Sites and OneDrives that have been deleted but are still held under retention. A deleted site
keeps using the SharePoint entitlement until retention ends or it is purged from the recycle bin.
A deleted OneDrive is not part of the SharePoint entitlement, but Microsoft keeps it, and its
storage, until its own retention ends. The panel
only appears when there are some. It shows their total size and how many there are.

## All sites and OneDrives

Every site and drive in the usage reports, in one table.

| Column | Meaning |
| --- | --- |
| Site | The display name and a link to the site, which opens in a new tab. A site that cannot be named shows its id. |
| Owner | The primary owner as Microsoft records it. For group-connected sites, these are the Microsoft 365 group's owners. |
| Storage used | Storage consumed as of the report date. |
| Share | This row's storage as a percentage of its own pool: a site's share of all SharePoint storage in use, a OneDrive's share of all OneDrive storage in use. The bar is on the same scale. The pool's total is Microsoft's storage trend, or the total of the usage report's rows when the trend lists no day with storage. A pool that holds no storage at all gives each of its rows **0.0%**; a share that would round to 0.0% shows as **<0.1%**, and one that would round to 100.0% as **>99.9%**. |
| Files | Files stored as of the report date. |
| Active files | Files created, edited or otherwise active in the 180-day period. |
| Last activity | The most recent day with file activity. **Never** means none in the 180 days. |
| Template | The template the site was created from, or **Template not reported** when Microsoft's usage report gives none. Empty for OneDrives. |

Hover over or focus a column header to see its explanation in the table itself.

### Search, sort and pages

- **Search** matches the name, owner and id, and it updates as you type. It searches every name
  the report has looked up so far, including names from pages you have opened.
- **Sort** by selecting a column header. Search and sort go back to the first page.
- **Rows per page** can be 50, 100, 250 or 500.

The table is built for tenants with millions of rows, so names are looked up only for the rows
on screen. A row shows a short placeholder while its name loads.
