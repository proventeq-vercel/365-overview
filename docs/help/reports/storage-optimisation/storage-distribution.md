---
title: Current storage distribution
nav: Storage distribution
description: Where storage sits today — how much of the SharePoint entitlement is used, and how it splits by workload and site template.
section: storage-optimisation
order: 10
---

## Quota usage

A doughnut of SharePoint storage **Used** against **Available**, with the percentage and both
figures in the middle. It covers the whole tenant's pooled SharePoint storage against its
SharePoint entitlement. OneDrive is not included, because each OneDrive has its own allowance.

- **Used** is the latest value of Microsoft's SharePoint storage trend.
- **Available** is the entitlement minus what is used. It never goes below zero. A tenant
  already over its entitlement shows 100% or more used.
- If the entitlement is unknown, the gauge is replaced by a note. Enter the entitlement under
  **Options (⋯) → Report settings** to see it.
- If the entitlement was [estimated from licences](../../reference/calculations.md#sharepoint-entitlement),
  a note under the gauge says so.

## Storage by workload

Storage split between **SharePoint**, **Teams** and **OneDrive**, as Microsoft 365 reports it.

Microsoft Graph does not say which sites belong to Teams. The report groups by the template each
site was created from: Team Channel and Group templates count as Teams, and everything else
counts as SharePoint. So these counts will not match the SharePoint admin centre, which groups
differently. Deleted sites are left out.

## Storage by site template

SharePoint storage grouped by the template each live site was created from. The eight largest
templates are shown by name, and the rest are added together as **Other**. Sites without a
template are grouped as **Unknown**.

Use it to see which kind of site holds the volume, for example team sites, communication sites
or Teams channel sites.
