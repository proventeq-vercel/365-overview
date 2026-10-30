---
title: Troubleshooting
description: Each screen the report can stop at, what it means and what fixes it.
section: start
order: 40
---

Each error screen names what is missing. Find the heading that matches what you saw.

The first three screens below check again on their own, every 30 seconds and whenever you
return to the report's tab. Once the fix is in place, leave the report open and it loads by
itself. You do not need to reload the page or sign in again.

## Your organisation has not approved this app yet

An administrator has not approved the app for your tenant yet. Send a Global Administrator the
admin consent link. It is on the error screen, and on [Enable access](enable-access.md). Once
they approve, the report loads on its own. An administrator who approves through the link in
this browser comes back to the report, which keeps its loading screen up for up to two minutes
while Microsoft applies the approval.

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
request was refused for one of two reasons: this site has been set up to admit only certain
directory roles, or Microsoft Graph refused the app itself. Contact Proventeq with
the account you signed in with.
:::

## Your account is not allowed to use this app

Your administrator allows only assigned users or groups to use this app (`AADSTS50105`). Ask them
to add you, or a group you are in, under the app's **Users and groups**. See
[Limit who can open the report](limit-access.md).

## Sign-in failed

Use a work or school account from a Microsoft 365 tenant. Personal Microsoft accounts cannot sign
in. To pick a different account, open the report in a private window. Once you are signed in,
**Options (⋯) → Switch account** does the same.

## Insufficient permissions

This note sits under an error Microsoft Graph returned when it refused a request. Either your
organisation has not approved the app, or your account has no reporting role: see
[Your organisation has not approved this app yet](#your-organisation-has-not-approved-this-app-yet)
and [Your account cannot read usage reports](#your-account-cannot-read-usage-reports).

## Couldn't start the dashboard

The report could not start in your browser. Refresh the page. If the screen says the tab
overrides the deployed modes, select **Reset the modes for this tab**. If it keeps happening,
send Proventeq the message shown under the heading.

## The data service sent a link to another address

A large answer arrives a page at a time, and each page links to the next. The report follows a
link only when it leads back to the same data service, so your sign-in token is never sent to
another address. A refused link stops the answer it belongs to:

- When nothing usable comes back, the screen shows this heading. Select **Try again** once. If
  the screen returns, see below.
- When only some answers were refused, the page loads from the rest. A refused usage report
  shows as a report that did not come back (see
  [A Microsoft report did not come back](#a-microsoft-report-did-not-come-back)). A refused
  site directory leaves site names to be looked up a page at a time, so search finds only the
  fifty largest sites and those already shown. On a tenant of more than 10,000 licensed users, a
  refused user licence report leaves OneDrives with no activity for over 93 days standing in for
  the unlicensed ones. **Refresh data** meets the same link again, so see below.

::: audience application
The data service here is Proventeq's Graph proxy. This is a setup fault on Proventeq's side:
either the address the proxy puts in its links does not match the address this site calls, or
this site was built with a proxy address that is not a full web address. In the first case only
answers that span more than one page are refused, so the page usually loads without the usage
reports; in the second every request is, and the screen shows this heading. Either way, contact
Proventeq.
:::

::: audience delegated
The data service here is Microsoft Graph, and its links always lead back to Microsoft Graph. A
link anywhere else means something between your browser and Microsoft changed the answer, for
example a browser extension or a network appliance that inspects traffic. Try another browser or
network.
:::

## Sites are listed by an id instead of a name

The figures are still correct. The app has no `Sites.Read.All`, or, with delegated permissions,
the signed-in user cannot open that site. [Site names](../reference/site-names.md) explains it.

## Names are blurred

The figures are still correct. Hover over or click a blurred name to see why:

- Your tenant conceals names in usage reports. In the Microsoft 365 admin centre, go to
  **Settings → Org settings → Reports**.
- The link turned on hidden names (`?hideNames=true`).

[Site names](../reference/site-names.md#blurred-names) explains both.

## Figures are measured against a stand-in

When the report cannot read your licences, usually because `Organization.Read.All` was not
granted, or none of your licences has a OneDrive allowance the report knows, the OneDrive figures
measured against the storage each user is licensed for use the commonest OneDrive limit instead,
and say so (*Over the usual OneDrive limit*). Enter the OneDrive storage per user in
[Report settings](../reference/settings.md) to measure against your licences.

The SharePoint figures never show as Unknown: without the entitlement the report shows the
monthly growth and the storage in use instead. Enter the SharePoint entitlement in Report settings
to see the headroom and when it runs out.

## A Microsoft report did not come back

The report reads four Microsoft 365 usage reports: the SharePoint site usage report, the OneDrive
usage report and the SharePoint and OneDrive storage trends. When one of them does not answer,
the page still loads from the others. The report asks for a failed one a second time, unless
Microsoft said it was busy, which the report has already waited out. A note at the top names the
report that did not come back, and the figures drawn from it are left out:

- Without the **SharePoint site usage report**, the per-site figures are left out: inactive sites,
  the saving, the template chart, *Live sites*, the top sites, the line after clean-up and the
  Teams, Deleted and Inactive parts of the storage usage line. Storage used and the forecast come
  from the storage trend.
- Without the **OneDrive usage report**, the per-OneDrive figures are left out: the OneDrive cards
  other than the storage, *Drives near their quota*, the top OneDrives, the over-licence and
  inactive sections and the table of OneDrives. The OneDrive storage comes from its storage trend.
- If one of the two usage reports is missing, *Deleted but still billing* is left out, since it
  adds the two, and *Main offenders* lists the pool whose report came back. If both are missing,
  *Main offenders* is left out.
- Without a **storage trend**, storage used is the total of the matching usage report, and there
  is no forecast until the trend comes back.
- When a pool's usage report is missing and its storage trend holds no storage, that pool is left
  out as a whole.

**Refresh data** in the note asks for the missing report again. If a refresh fails to bring back
a report that is on screen, the page stays as it was, and the note names the report the reload
did not bring back and says the page still shows the earlier load. The report stops with an error only when
nothing usable comes back, or when Microsoft refuses access (see the sections above).

## The data looks a few days old

Microsoft publishes usage reports two to three days behind. The report shows the date its data
is from. **Options (⋯) → Refresh data** reloads it, but it cannot be newer than what Microsoft
has published.
