---
title: OneDrive Usage report
nav: Overview
description: How much of the tenant sits in personal OneDrives, who holds the most, and which drives are running out of room or over their licence.
section: onedrive-usage
feature: optimization.storage.report.onedrive
order: 0
---

The OneDrive Usage report looks only at personal OneDrives. It uses the same data as the Storage
Optimisation report, so switching between the two never reloads anything.

When Microsoft's OneDrive usage report does not come back, the page shows the OneDrive storage
from its storage trend and leaves the per-OneDrive cards and sections out: see
[A Microsoft report did not come back](../../getting-started/troubleshooting.md#a-microsoft-report-did-not-come-back).

OneDrive is a separate pool from SharePoint. Each drive has its own storage quota and its own
licensed allowance. A percentage of a drive's allocation means something, while a percentage of
a SharePoint site's allocation does not.

## Cards

| Card | Shows | Colour |
| --- | --- | --- |
| OneDrive storage | Tenant-wide OneDrive storage, as Microsoft 365 reports it: its storage trend's latest day, or, when that trend lists no day with storage, the total of the OneDrive usage report, and the description says so. | Navy |
| OneDrives | Live drives in the usage report. | Blue |
| Drives near their quota | Drives at 90% or more of their own storage quota. | Orange when any, green when none |
| Over licensed storage | Drives holding more than the OneDrive storage per user, and by how much in total. | Orange when any, green when none |
| Deleted but still billing | Deleted drives still using quota under retention. | Yellow when any, grey when none |

When the tenant's licences give no OneDrive storage per user (they cannot be read, or none has
an allowance the report knows) and none is set, the card becomes **Over the usual OneDrive limit**:
the same count against the commonest storage limit among the live OneDrives, usually the tenant's default.
Set the licensed figure in [Report settings](../../reference/settings.md#onedrive-storage-per-user).
If no live OneDrive reports a limit either, the card is left out.

## Sections

- [Top OneDrives by storage](top-drives.md): the five largest drives.
- [OneDrives over their licensed storage](over-licence.md): the drives that hold more than any
  licence in the tenant includes.
- [Inactive, deleted and unlicensed OneDrives](inactive.md): three groups kept apart, and which
  of them Microsoft can bill.
- [All OneDrives](drives.md): every drive, with how much of its allocation it uses.
