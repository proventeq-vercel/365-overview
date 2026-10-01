---
title: Main offenders
description: The sites and OneDrives driving the most storage, storage that is deleted but still billing, and a searchable table of everything.
section: storage-optimisation
order: 40
---

## Biggest sites & OneDrives by storage

The ten largest sites and OneDrives together, ranked by storage used. Two smaller lists sit
beside it:

- **Top SharePoint sites by storage**: the five largest sites.
- **Top OneDrives by storage**: the five largest personal drives.

The names come from the site directory, or from the sites you can open on the delegated site.
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
