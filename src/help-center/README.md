# help-center

A self-contained docs site for a React app, laid out like the Proventeq Help Center
(learn.proventeq.com): a sticky top bar with the host's brand, an inline search with a results
dropdown and the host's actions; a landing page with a hero, quick links and a card per section; a
sidebar of collapsible sections; breadcrumbs, an on-page outline, previous/next links and
per-audience content; plus `llms.txt` for agents. It imports nothing from the host app (`isolation.test.ts` enforces
this), so the folder can be copied into another Vite + React site as it is.

Dependencies: `react` 19, `react-markdown`, `remark-gfm`, `rehype-slug`, `github-slugger`, and
`vite` for the optional plugin.

## Use it

```tsx
import { createHelpCatalogue } from './help-center/catalogue'
import { HelpCenter } from './help-center/HelpCenter'

const sources = import.meta.glob<string>('/docs/help/**/*.md', { query: '?raw', import: 'default', eager: true })
const sections = [
  { id: 'start', label: 'Get started', description: 'Set it up.' },
  { id: 'reference', label: 'Reference', description: 'Every option.' },
]
const catalogue = createHelpCatalogue(sources, sections, '/docs/help/')

<HelpCenter
  catalogue={catalogue}
  basePath="/help"
  audiences={[{ id: 'admins', label: 'Administrators' }, { id: 'users', label: 'Users' }]}
  defaultAudience="users"
  variables={(audience) => ({ supportEmail: 'help@example.com' })}  // keep it stable (useCallback)
  brand={<MyLogo />}                                                   // left of the top bar
  actions={<a href="/">Back to the app</a>}                            // right of the search
  sectionIcons={{ start: <RocketIcon />, reference: <BookIcon /> }}    // sidebar and landing cards
  markdownLinks                                                        // "View as Markdown" (needs the plugin)
  labels={{ home: 'Docs' }}                                            // any of DEFAULT_HELP_LABELS
/>
```

The host must serve `index.html` for every path under `basePath` (an SPA fallback). Routing is
the history API; no router is needed.

- **Pages**: frontmatter `title`, `description`, `section` (required), `nav`, `order`. Slugs come
  from the path; `index.md` is its folder's page; a `README.md` is skipped.
- **Links**: relative `.md` links resolve against the linking file and navigate in place.
- **Blocks**: `::: audience <id>`, `::: if <variable>`, `::: unless <variable>`, closed by `:::`,
  nestable. A page with an audience block gets the audience switch; `?audience=<id>` selects one.
- **Variables**: `{{name}}`, from `variables(audience)`; missing ones render empty.
- **Landing**: the root page (`index.md`) renders as a hero (its title and description), quick
  links to the other pages of its section, a card per section (its `description`, or its page
  titles) linking to the section's first page, then its body.
- **Theme**: override the `--hc-*` custom properties on `.hc` (accent, ink, text, borders, widths).
  The defaults are learn.proventeq.com's tokens.
- **Keyboard**: while mounted it listens on `window`: `/` (outside a field, without Cmd, or Ctrl or
  Alt alone) and Ctrl+K / Cmd+K focus the search, and `Escape` closes an open topic list. In the
  search, the arrow keys move through the results, `Enter` opens one and `Escape` clears it. A host
  with its own `/`, Ctrl+K or `Escape` shortcuts must not bind them on this page.

`catalogue.ts`, `prepare.ts`, `links.ts`, `search.ts` and `llms.ts` are framework-free, so a host
can read page metadata (for example for a contextual "?" dialog) without loading the markdown
renderer. Import `HelpCenter` lazily to keep it out of the main bundle.

## llms.txt

```ts
import { helpLlms } from './src/help-center/vitePlugin'

plugins: [helpLlms({ dir: 'docs/help', sections, basePath: '/help', title: 'My app', summary: '…' })]
```

It serves `/llms.txt` (an index of pages with descriptions), `/llms-full.txt` (every page's
markdown) and each page's markdown (title and description on top, frontmatter removed) under
`<basePath>/` at its source path (`index.md` pages included, so relative links between pages
still resolve) from the dev server, and emits all of them into the build. A page's `.md` file
that uses `:::` blocks or `{{variables}}` gets a line explaining them (`/llms-full.txt` explains
them once, at the top), and each page in `/llms-full.txt` starts with the file it is published at
so its relative links can be resolved. The index links the `.md` files, not the rendered pages: a
page address returns the SPA shell, which an agent cannot read. The host must serve existing files before its
SPA fallback and serve `.md` and `.txt` as UTF-8 text.
