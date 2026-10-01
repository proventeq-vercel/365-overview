---
title: OneDrive Usage report
nav: Overview
description: How much of the tenant sits in personal OneDrives, who holds the most, and which drives are running out of room or over their licence.
section: onedrive-usage
order: 0
---

The OneDrive Usage report looks only at personal OneDrives. It uses the same data as the Storage
Optimisation report, so switching between the two never reloads anything.

OneDrive is a separate pool from SharePoint. Each drive has its own allocation and its own
licensed allowance. A percentage of a drive's allocation means something, while a percentage of
a SharePoint site's allocation does not.

## Cards

| Card | Shows | Colour |
| --- | --- | --- |
| OneDrive storage | Tenant-wide OneDrive storage, as Microsoft 365 reports it. | Navy |
| OneDrives | Live drives in the usage report. | Blue |
| Drives near capacity | Drives at 90% or more of their own allocation. | Orange when any, green when none |
| Over licensed storage | Drives holding more than the OneDrive storage per user, and by how much in total. | Orange when any, green when none, grey when unknown |
| Deleted but still billing | Deleted drives still using quota under retention. | Yellow when any, grey when none |

**Over licensed storage** shows **Unknown** when the tenant's licences could not be read, or
when none of them has a OneDrive allowance the report knows. Set the figure in
[Report settings](../../reference/settings.md#onedrive-storage-per-user).

## Sections

- [Top OneDrives by storage](top-drives.md): the five largest drives.
- [OneDrives over their licensed storage](over-licence.md): the drives that hold more than any
  licence in the tenant includes.
- [All OneDrives](drives.md): every drive, with how much of its allocation it uses.
