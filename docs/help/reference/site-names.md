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
On this site, the report looks up names as the signed-in user. A site gets its name when you can
open it, and the rest are listed by their id. The application-permissions site names every site.
:::

A name you have seen anywhere in the report becomes searchable in the table.

## Concealed names

Microsoft 365 can conceal user, group and site names in all usage reports. Identities then appear
as hashes, and the report says so in a note. To show real names, go to the Microsoft 365 admin
centre → **Settings → Org settings → Reports** and clear **Display concealed user, group, and
site names**. Microsoft can take a while to apply it.

## Hidden names

Add `?hideNames=true` to the report's address to hide identities, for example before you share
your screen. Sites then show as masked ids, owners as initials, and site links are removed. The
report does not look up names at all while they are hidden. It stays on for the rest of the tab,
including after signing in again. `?hideNames=` turns it off, unless the site itself is set up
to hide names. A note on the report says when
names are hidden.
