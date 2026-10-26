---
title: Inactive, deleted and unlicensed OneDrives
nav: Inactive and unlicensed
description: OneDrives no one uses, deleted OneDrives under retention, and OneDrives whose owner has no licence, which Microsoft can bill for once it archives them.
section: onedrive-usage
feature: optimization.storage.report.onedrive
order: 15
---

Three groups of OneDrives that hold storage nobody may need. They are kept apart and never added
together, because they cost different things.

| Group | What it counts | Billed? |
| --- | --- | --- |
| **Inactive OneDrives** | Live OneDrives whose owner holds a OneDrive licence and that have had no activity since the [inactivity window](../../reference/settings.md#archive-sites-inactive-for), or no activity recorded at all. The window is the one the site archive uses; unlike sites, a OneDrive with no activity ever recorded counts too. | No extra storage charge: a licensed owner's OneDrive sits inside the storage the licence includes. |
| **Deleted, under retention** | OneDrives that were deleted and that Microsoft still holds until their retention period ends. | Their owner has no licence, so one that retention keeps past 93 days is archived and billed like an unlicensed OneDrive, once billing is enabled. Not part of the SharePoint entitlement. |
| **Owner unlicensed** | Live OneDrives whose owner holds no OneDrive licence. | Yes, once archived, if billing is enabled (below). |

## Who counts as unlicensed

The licence comes from Microsoft's active-user usage report, read with the same permission as the
other usage reports. That report lists **licensed users**. So an owner it lists without a OneDrive licence, and an
owner it does not list at all, both count as unlicensed. That includes owners deleted from Entra
ID, which Microsoft also treats as unlicensed. An owner the report does not list most likely holds
no licence; the card says how many owners are counted that way.

The group shows **Unknown** when the report cannot be read, or when it lists none of the
OneDrives' owners, which would mean the two reports cannot be matched at all. The inactive group may then
include unlicensed OneDrives, and its card says so.

## What Microsoft does with an unlicensed OneDrive

From Microsoft's
[Manage unlicensed OneDrive user accounts](https://learn.microsoft.com/en-us/sharepoint/unlicensed-onedrive-accounts):

- An unlicensed OneDrive is made **read-only after 60 days** and **archived after 93 days**.
- Once billing for unlicensed OneDrive accounts is enabled, archived accounts cost **$0.05 per GB
  per month**, and reactivating one costs **$0.60 per GB**.
- Unlicensed OneDrives cannot use unused SharePoint storage.
- A OneDrive kept by a retention policy, setting or hold after being unlicensed for 93 days is
  still billed for its archive storage when billing is enabled.
- An unlicensed OneDrive that stays unpaid is at risk of deletion after 365 days unpaid in total.
- These rules do not apply to EDU, GCC or DoD tenants. In education tenants, unlicensed OneDrives
  use the pooled storage instead.

The usage reports do not say how long an owner has been unlicensed, so the report cannot tell
which of these OneDrives are already past day 93. It shows what they hold, not a price.

## How long the inactive ones have been inactive

A bar per band, by storage: up to one year past the inactivity window, one to two years past it,
more than that, and OneDrives with no activity recorded. Change the window under
**Options (⋯) → Report settings**.
