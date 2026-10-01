# Help content — authoring guide

This folder **is** the product reference. It is rendered at `/help/*` by `src/help-center/`,
summarised at `/llms.txt` (full text at `/llms-full.txt`), and agents read it as the description
of what the app does. This file is the only one here that is not a page.

**Every user-visible change updates these pages in the same PR**: a new or renamed card, column,
setting, threshold, colour rule, permission or error screen. `src/app/help/helpContent.test.ts`
fails on a broken link or anchor, an unknown `{{variable}}`, a report with no page, a help topic
with no page and a failure screen missing from troubleshooting. It cannot catch a page that
describes yesterday's behaviour, so review that by hand.

## A page

```markdown
---
title: Tenant capacity          # the h1; don't repeat it in the body
nav: Short sidebar label        # optional; defaults to the title
description: One sentence.      # lead paragraph, "?" dialog text, search, llms.txt
section: storage-optimisation   # an id from src/app/help/helpSections.ts
order: 20                       # position within the section
---

## Second-level headings only
```

- The path is the address: `reports/storage-optimisation/tenant-capacity.md` →
  `/help/reports/storage-optimisation/tenant-capacity`; `index.md` is the folder's page.
- Link other pages relatively, to the `.md` file: `[Settings](../../reference/settings.md#currency)`.
  Anchors are GitHub-style heading slugs.
- Use the on-screen wording exactly — copy labels from `src/intl/en.json`.
- GitHub-flavoured markdown: tables, `> callouts` (rendered as a teal note), code.

## Mode-specific content

Each deployment reads Graph one way: delegated (the main site) or application permissions (the
proxy site). Put content that differs in blocks; the page then shows the site's own mode, with a
switch at the top right to read the other one:

```markdown
::: audience delegated
Only on the delegated site.
:::

::: if consentUrl
[Grant admin consent for this site]({{consentUrl}})
:::

::: unless consentUrl
Fallback when the site has no consent link to offer.
:::
```

Variables are filled only for the site's own mode: `{{consentUrl}}` (null in mock mode) and
`{{clientId}}`.

## Linking from the app

A report section's **?** button opens the `description` of a page and a *See more* link to it. The
pages it can point at are `HELP_TOPICS` in `src/app/help/topics.ts`; adding a section means adding
a topic and a page.
