---
title: Enable access to the report
nav: Enable access
description: The one-off steps an administrator takes so people in your tenant can open the report.
section: start
order: 10
---

The report reads your tenant's Microsoft 365 usage reports. Your organisation has to allow that
once. What that takes depends on how the site reads Microsoft Graph, and each site is built for
one way only:

- **Delegated permissions:** your browser reads the reports as the signed-in user. Nothing
  passes through Proventeq.
- **Application permissions:** Proventeq's service reads the reports on the app's own behalf,
  only for the tenant you signed in to.

Nobody picks the mode at sign-in. This page shows the steps for this site's mode. To see the
other mode, use the switch at the top right of this page.

::: audience delegated
## How delegated access works

Your browser asks Microsoft Graph for the usage reports as you, and the data goes straight from
Microsoft to your browser. Microsoft only gives usage reports to accounts that hold a reporting
role. So an administrator approves the app once, and each person who opens the report needs one
of those roles.

## Steps

1. **Grant admin consent, once.** A Global Administrator opens this site's admin consent link,
   signs in and selects **Accept**. This covers the whole tenant. Until it is done, the report
   stops at *Your organisation has not approved this app yet*.
2. **Give readers a reporting role.** Whoever opens the report needs **Reports Reader**,
   **SharePoint Administrator**, **Exchange Administrator**, **Teams Administrator**, **Teams
   Communications Administrator**, **Skype for Business Administrator** or **Global
   Administrator**. **Global Reader** and **Usage Summary Reports Reader** are not enough:
   Microsoft gives them tenant totals only, not the per-site and per-drive detail this report
   reads. To assign the least of these, go to the Microsoft Entra admin centre → **Roles &
   admins** → **Reports Reader** → **Add assignments**.
3. **Open the report.** They open this site and sign in with that work account.
4. **Site names.** On this site, a site shows its name only when the signed-in user can open it.
   Other sites are listed by their id. Use the application-permissions site when every name
   matters (see [Site names](../reference/site-names.md)).

::: if consentUrl
[Grant admin consent for this site]({{consentUrl}})
:::
:::

::: audience application
## How application access works

Proventeq's Graph proxy reads the usage reports with the app's own permissions. It reads only
the tenant you signed in to, and only the report calls the site needs. Once your organisation
has approved the app, anyone in the tenant can open the report. No admin role is needed.

## Steps

1. **Grant admin consent, once.** A Global Administrator or Privileged Role Administrator opens
   this site's admin consent link, signs in and selects **Accept**. This covers the whole
   tenant.
2. **Get your tenant switched on.** If Proventeq limits the report to named tenants, it adds
   yours. Until then the report shows *This tenant is not enabled for the report yet*.
3. **Open the report.** Anyone in the tenant opens this site and signs in with their work
   account. To allow only some people, see [Limit who can open the report](limit-access.md).
4. **Optional: site names.** The same administrator also grants the app Microsoft Graph's
   `Sites.Read.All` application permission, for example with Graph PowerShell
   (`New-MgServicePrincipalAppRoleAssignment`). Without it, every site is listed by its id.

::: if consentUrl
[Grant admin consent for this site]({{consentUrl}})
:::

> Approving sign-in is not the same as admin consent. Application permissions are granted only
> through the admin consent link. Signing in again does not grant them.
:::

::: unless consentUrl
The admin consent link is on the report's own error screen, and on the help of the site that
uses this mode. Proventeq can also send it to you.
:::

## What the approval covers

The report only reads data. [Permissions](permissions.md) lists every permission, which ones are
optional and what the report loses without them.

## If something still goes wrong

Each error screen names what is missing. [Troubleshooting](troubleshooting.md) shows the fix for
each one.
