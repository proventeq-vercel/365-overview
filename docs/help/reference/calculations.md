---
title: How the figures are calculated
nav: Calculations
description: The exact rules behind the entitlement, growth rate, forecast, costs and archive figures.
section: reference
order: 20
---

Every figure on screen is calculated in one place from the same inputs, so the cards, charts and
tables always agree.

## SharePoint entitlement

Microsoft does not publish the tenant's storage entitlement through Graph, so the report
estimates it from your licences, the same way Proventeq 365 does:

- **1 TB** for the tenant,
- **plus 10 GB** for each licence whose plans include SharePoint (Plan 1, Plan 2 and the
  equivalent education and government plans) and for each Project or Visio licence,
- **plus 1 GB** for each unit of the Office 365 Extra File Storage add-on,
- **plus 0.5 GB** for each OneDrive-only licence.

A licence counts only through the service plans it carries, never by its name. Free and trial
licences carry no storage plan, so their large seat counts add nothing. Only enabled licences
count.

The estimate can differ from the SharePoint admin centre, for example when storage was bought
another way. Enter the real figure in [Report settings](settings.md#sharepoint-entitlement).

## OneDrive storage per user

The most generous allowance any licence in the tenant gives:

- **5 TB** when the tenant holds five or more licences with a SharePoint/OneDrive Plan 2
  (E3, E5, G3, G5, OneDrive Plan 2),
- otherwise **1 TB** with a standard plan (Business plans, OneDrive Plan 1) or with one to four
  Plan 2 licences,
- otherwise **2 GB** with a frontline plan.

Education, Project, Visio and Dynamics plans give no allowance here.

## Growth rate

1. The 180-day SharePoint storage trend is grouped by month, and each month keeps its last
   reported value.
2. The month-to-month changes are taken.
3. The growth rate is the **median** of those changes. One unusual month cannot swing it the way
   it would swing an average.

When the median and the start-to-end average disagree by more than half, the series is
**uneven**, and the report says the projection is only indicative.

## Forecast

- **Months to exhaustion** = headroom ÷ growth rate, rounded down.
- At or over the entitlement, the forecast is **already exceeded**: zero months and no date.
- No growth, or shrinking storage: no exhaustion.
- Under six months of history: no forecast.
- Status: **Critical** under 12 months, **At risk** under 36, otherwise **Healthy**.

## Costs

- **Annual growth** = growth rate × 12.
- **Billable growth** is only the part of that growth above the entitlement. It is all of the
  growth when the tenant is already over the entitlement or the entitlement is unknown.
- **Cost of doing nothing, next 12 months** = billable growth × rate × 12.
- **Cumulative, 3 years** adds up years 1 to 3. Each year's billable growth is worked out on the
  volume grown by mid-year (0.5, 1.5 and 2.5 years of growth).
- **Potential saving per year** = inactive site storage × rate × 12.

## Archive

- **Cutoff** = the report date minus the inactivity window, in whole years.
- A live site counts when its last activity is **before** the cutoff. A site with no recorded
  activity never counts.
- **Share** = inactive storage ÷ storage of all live sites.
- Status: over **50%** needs attention (red), over **5%** needs watching (orange), otherwise
  healthy (green).

## Units

Sizes use binary units: 1 GB is 1,024 MB and 1 TB is 1,024 GB, as in the SharePoint admin centre.
