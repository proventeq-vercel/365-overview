---
title: OneDrives over their licensed storage
nav: Over licensed storage
description: Accounts holding more OneDrive storage than any licence in the tenant includes, and by how much.
section: onedrive-usage
order: 10
---

A drive is listed when it holds **more than the OneDrive storage per user**. That figure comes
from your licences, not from the drive's quota. Administrators can raise a drive's quota above
what the licence includes, and this list shows the drives where that has happened, or would
need to.

## The storage per user

Microsoft's OneDrive service description sets what a user licence includes:

| Licence | OneDrive storage per user |
| --- | --- |
| Microsoft 365 E3, E5, G3, G5 and OneDrive Plan 2, with five or more licences | 5 TB |
| Business plans, OneDrive Plan 1 and other standard plans | 1 TB |
| Frontline (F1, F3) | 2 GB |

The usage report does not say which licence each user holds. So the report measures every drive
against the **most generous plan the tenant holds**. A listed drive is then one that no licence
in your tenant could cover.

Some licences get no allowance here, so they never set the figure: Project, Visio and Dynamics
plans, and education plans (their allowances vary by agreement). If no licence has a known
allowance, the figure is **Unknown** and the list is not shown.

To measure against a different figure, set **OneDrive storage per user** in
[Report settings](../../reference/settings.md#onedrive-storage-per-user). Clear it to go back to
the estimate.

## The table

Largest first. It has the same columns as the drive table, plus **Over licence by**: how much
more the drive holds than the storage per user. **Capacity used** is measured against the drive's
own allocation, which can be higher than the licence.

Deleted drives are not listed.
