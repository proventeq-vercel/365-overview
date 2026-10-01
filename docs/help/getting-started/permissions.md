---
title: Permissions the report uses
nav: Permissions
description: Every Microsoft Graph permission the report asks for, which are optional, and what it loses without each one.
section: start
order: 20
---

All of these permissions only read data. The report never writes to your tenant. Only
`Reports.Read.All` is required. Each optional permission adds detail, and without it the report
still works.

| Permission | Required | What the report reads with it | Without it |
| --- | --- | --- | --- |
| `Reports.Read.All` | Required | Microsoft 365 usage reports: storage per site and per OneDrive, and the 180-day storage trend. | The report cannot load. |
| `Organization.Read.All` | Optional | The tenant's name and licences. The licences give the SharePoint entitlement and the OneDrive storage per user. | The header says *Your tenant*. The entitlement and the OneDrive storage per user show as **Unknown** until you enter them in [Report settings](../reference/settings.md). |
| `Sites.Read.All` | Optional | Each site's name and address. | Sites are listed by their id (see [Site names](../reference/site-names.md)). |

::: audience delegated
## On this site (delegated permissions)

This site acts as the signed-in user, so two things decide what it can read:

- **The admin consent.** A Global Administrator grants it once, and it covers
  `Reports.Read.All` and `Organization.Read.All`. This site does not ask for `Sites.Read.All`.
- **The user's role.** Microsoft only gives usage reports to accounts that hold Reports Reader,
  Global Reader, SharePoint Administrator or Global Administrator.

A site shows its name when the signed-in user can open that site. The rest are listed by their
id.
:::

::: audience application
## On this site (application permissions)

This site reads with the app's own permissions, through Proventeq's Graph proxy. It reads only
for the tenant the user signed in to. The admin consent link grants `Reports.Read.All`, and
nothing else is needed to load the report. Grant `Organization.Read.All` and `Sites.Read.All` as
application permissions too, for licence-based figures and site names.

Users need no admin role. Anyone in the tenant can open the report unless an administrator
[limits who can open it](limit-access.md).
:::

## Things the report never does

- It never lists every site in your tenant one by one from the browser. On large tenants that
  would take hours, so the report reads names only for the sites it shows.
- It does not read files, lists, mail or user profiles.
- It does not store your tenant's data anywhere. See [Data and privacy](../reference/data-and-privacy.md).
