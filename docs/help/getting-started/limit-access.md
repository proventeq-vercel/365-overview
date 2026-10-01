---
title: Limit who can open the report
nav: Limit who can open it
description: Allow only chosen groups or users to sign in, in Microsoft Entra, with no change to the site.
section: start
order: 30
---

By default anyone in your tenant can sign in to the report. An administrator can allow only
chosen groups or users in Microsoft Entra. Nothing on this site needs to change.

## Steps

::: if clientId
1. In the Microsoft Entra admin centre, open **Enterprise applications** and find the app with
   this Application ID: `{{clientId}}`
:::
::: unless clientId
1. In the Microsoft Entra admin centre, open **Enterprise applications** and find the report's
   app. Its Application ID is in the admin consent link, after `client_id=`.
:::
2. Under **Properties**, set **Assignment required** to **Yes** and save.
3. Under **Users and groups**, add the groups or users who may open the report.

## What to expect

- Anyone else is stopped at the Microsoft sign-in with error `AADSTS50105`. The report then shows
  *Your account is not allowed to use this app*.
- Assigning a group needs Microsoft Entra ID P1 or P2. On the free tier, assign users one by one.
- Members of nested groups are not included. Assign the group they belong to directly.

::: audience application
With application permissions, this limits who sees the report. It does not change what the
report can read.
:::

::: audience delegated
With delegated permissions, people still need a reporting role (see
[Enable access](enable-access.md)). Assignment only narrows who can sign in.
:::
