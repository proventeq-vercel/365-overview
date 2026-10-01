---
title: Data and privacy
description: What the report reads from Microsoft 365, where that data goes, and what is kept.
section: reference
order: 40
---

## What the report reads

Through Microsoft Graph, read-only:

| Call | Used for |
| --- | --- |
| SharePoint site usage detail (180 days) | Storage, files, activity and template per site. |
| OneDrive account detail (180 days) | Storage, files, activity and allocation per drive. |
| SharePoint and OneDrive storage trends (180 days) | Used storage today and the growth rate. |
| Subscribed licences | The SharePoint entitlement and OneDrive storage per user. |
| Organisation | The tenant name in the header. |
| Site details and the site directory | Site names and links (see [Site names](site-names.md)). |

It does not read files, file contents, lists, mail or user profiles.

## Where the data goes

::: audience delegated
On this site, your browser calls Microsoft Graph directly as you. The data goes from Microsoft
to your browser, and it does not pass through Proventeq.
:::

::: audience application
On this site, your browser calls Proventeq's Graph proxy. The proxy checks your sign-in, allows
only the report's own calls, signs them with the app's certificate for your tenant only, and
passes Microsoft's answer back. It stores nothing.
:::

## What is kept

- **Nothing is stored on a server.** The report is built in your browser and goes when you close
  the tab.
- **Report settings** are saved in this browser's local storage, and only there.
- **No telemetry and no lead capture.** The report sends no analytics.
- Your sign-in is handled by Microsoft. The report keeps Microsoft's session in the browser as
  any Microsoft 365 web app does.
