---
title: Troubleshooting
description: Each screen the report can stop at, what it means and what fixes it.
section: start
order: 40
---

Each error screen names what is missing. Find the heading that matches what you saw.

## Your organisation has not approved this app yet

An administrator has not approved the app for your tenant yet. Send a Global Administrator the
admin consent link. It is on the error screen, and on [Enable access](enable-access.md). Once
they approve, sign in again.

::: audience application
This site reads with application permissions, so a sign-in approval is not enough. Only the
admin consent link grants them.
:::

## This tenant is not enabled for the report yet

This only happens with application permissions. Consent is in place, but Proventeq has not
switched your tenant on. Contact Proventeq with your tenant's name.

## Your account cannot read usage reports

::: audience delegated
Microsoft does not give usage reports to an account without a reporting role. Ask an
administrator to assign you **Reports Reader**, or sign in with an account that has a reporting
role. See [Enable access](enable-access.md) for the full list of roles.
:::

::: audience application
This site reads with the app's own permissions, so Microsoft does not check your role here. The
request was refused before it reached Microsoft 365: either this site has been set up to admit
only certain directory roles, or Microsoft Graph refused the app itself. Contact Proventeq with
the account you signed in with.
:::

## Your account is not allowed to use this app

Your administrator allows only assigned users or groups to use this app (`AADSTS50105`). Ask them
to add you, or a group you are in, under the app's **Users and groups**. See
[Limit who can open the report](limit-access.md).

## Sign-in failed

Use a work or school account from a Microsoft 365 tenant. Personal Microsoft accounts cannot sign
in. To pick a different account, open the report in a private window, or use **Options (⋯) →
Switch account**.

## Insufficient permissions

This note sits under an error Microsoft Graph returned when it refused a request. Either your
organisation has not approved the app, or your account has no reporting role: see
[Your organisation has not approved this app yet](#your-organisation-has-not-approved-this-app-yet)
and [Your account cannot read usage reports](#your-account-cannot-read-usage-reports).

## Couldn't start the dashboard

The report could not start in your browser. Refresh the page. If the screen says the tab
overrides the deployed modes, select **Reset the modes for this tab**. If it keeps happening,
send Proventeq the message shown under the heading.

## Sites are listed by an id instead of a name

The figures are still correct. The name is missing for one of these reasons:

- The app has no `Sites.Read.All`. With delegated permissions, the signed-in user cannot open
  that site.
- Your tenant conceals names in usage reports. In the Microsoft 365 admin centre, go to
  **Settings → Org settings → Reports**.
- The link turned on hidden names (`?hideNames=true`).

[Site names](../reference/site-names.md) explains each one.

## Figures show as Unknown

The report could not read your licences, usually because `Organization.Read.All` was not
granted. Or none of your licences has a storage allowance the report knows. Enter the SharePoint
entitlement and the OneDrive storage per user in [Report settings](../reference/settings.md).

## The data looks a few days old

Microsoft publishes usage reports two to three days behind. The report shows the date its data
is from. **Options (⋯) → Refresh data** reloads it, but it cannot be newer than what Microsoft
has published.
