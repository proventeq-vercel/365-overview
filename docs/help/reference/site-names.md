---
title: Site names
description: Why a site can appear by its id instead of its name, and how to show real names.
section: reference
order: 30
---

Microsoft's site usage report leaves every site's address blank. The report therefore looks up
names separately. When it cannot find a name, it lists the site by its **site id**. It never uses
the owner instead, because one administrator often owns hundreds of sites. Storage figures are
correct either way.

## How names are found

::: audience application
On this site, the report reads the tenant's site directory once with `Sites.Read.All`. It reads
up to the first 5,000 entries (subsites count too), and names any other site one by one as it
appears on screen. Without
`Sites.Read.All`, every site is listed by its id.
:::

::: audience delegated
On this site, the report looks up names as the signed-in user, and Microsoft answers only when
your organisation's approval includes `Sites.Read.All`. This site does not ask for it, so sites are
usually listed by their id; where an earlier approval still includes it, a site gets its name when
you can open it. The application-permissions site names every site.
:::

A name you have seen anywhere in the report becomes searchable in the table.

## Long names

A name, owner or id too long for its list or column is cut short with an ellipsis, so it never
spills out of its card. Hover over it, or move to it with the Tab key, to see it in full. A name
that fits adds no Tab stop.

## Blurred names

Concealed and hidden names look the same: every site name, drive name and owner is blurred,
site links are removed, and the report looks up no names. One note above the tables says which
of the two applies. Hover over or click a blurred name to see why it is blurred and how to show
it. The blur covers a placeholder, not the name, so it cannot be copied or uncovered. Storage
figures are unaffected.

## Concealed names

Microsoft 365 can conceal user, group and site names in all usage reports. Microsoft then sends
hashes instead of names, and the report blurs them. To show real names, go to the Microsoft 365
admin centre → **Settings → Org settings → Reports** and clear **Display concealed user, group,
and site names**. Microsoft can take a while to apply it.

## Hidden names

Add `?hideNames=true` to the report's address to hide identities, for example before you share
your screen. Names are masked before they reach the page and then blurred. It stays on for the
rest of the tab, including after signing in again. `?hideNames=` turns it off, unless the site
itself is set up to hide names.
