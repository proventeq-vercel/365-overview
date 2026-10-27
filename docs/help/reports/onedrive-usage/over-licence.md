---
title: OneDrives over their licensed storage
nav: Over licensed storage
description: Accounts holding more OneDrive storage than any licence in the tenant includes, and by how much.
section: onedrive-usage
feature: optimization.storage.report.onedrive
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
| Business plans, OneDrive Plan 1 and other standard plans, or E3, E5, G3, G5 and OneDrive Plan 2 with one to four licences | 1 TB |
| Frontline (F1, F3) | 2 GB |

The usage report does not say which licence each user holds. So the report measures every drive
against the **most generous plan the tenant holds**. A listed drive is then one that no licence
in your tenant could cover.

Some licences get no allowance here, so they never set the figure: Project, Visio and Dynamics
plans, and education plans (their allowances vary by agreement).

## Without a licence figure

If the licences cannot be read (the Organization.Read.All permission was not granted), or none
has a known allowance, and no figure is set, the section becomes **OneDrives over the usual
OneDrive limit**. It measures against the storage limit most live OneDrives report, which is
usually the tenant's default, and its subtitle says how many report it. A drive listed then is
one whose limit was raised above the default and that holds more than the default. If no live
OneDrive reports a limit, the section is left out.

To measure against a different figure, set **OneDrive storage per user** in
[Report settings](../../reference/settings.md#onedrive-storage-per-user). Clear it to go back to
the estimate.

## The table

Largest first.

| Column | Meaning |
| --- | --- |
| Drive | The OneDrive account, named after its owner, with a link to the drive. |
| Owner | The drive's owner. |
| Storage used | Storage consumed as of the report date. |
| Over licence by | How much more the drive holds than the storage per user. |
| Quota used | How much of the drive's own storage quota is used. The quota can be higher than the licence. |
| Last activity | The most recent day with file activity. **Never** means none in the 180 days. |

Deleted drives are not listed.
