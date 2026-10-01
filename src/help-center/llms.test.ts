import { describe, expect, it } from 'vitest'
import { createHelpCatalogue } from './catalogue'
import { buildLlmsFull, buildLlmsIndex, buildLlmsPages } from './llms'

const catalogue = createHelpCatalogue(
  {
    'index.md': '---\ntitle: Home\ndescription: Start here.\nsection: start\n---\nWelcome. See the [report](reports/usage/index.md).',
    'reports/usage/index.md':
      '---\ntitle: Usage\ndescription: The report.\nsection: start\norder: 1\n---\nOpen [the cards](cards.md) or the [settings](../../reference/settings.md#currency).',
    'reports/usage/cards.md': '---\ntitle: Cards\ndescription: Each card.\nsection: start\norder: 2\n---\nBack to [the report](index.md).',
    'reference/settings.md': '---\ntitle: Settings\ndescription: Every option.\nsection: reference\n---\n## Currency\nPick one.',
  },
  [
    { id: 'start', label: 'Get started' },
    { id: 'empty', label: 'Nothing here' },
    { id: 'reference', label: 'Reference' },
  ],
)

const OPTIONS = { title: 'My app', summary: 'What it is.', basePath: '/help/' }

function resolve(fromFile: string, href: string): string {
  const segments = fromFile.split('/').slice(0, -1)
  for (const segment of href.split('#')[0].split('/')) {
    if (segment === '..') segments.pop()
    else if (segment !== '.') segments.push(segment)
  }
  return segments.join('/')
}

describe('llms.txt', () => {
  it('indexes every page under its section, linking the markdown file an agent can read', () => {
    expect(buildLlmsIndex(catalogue, OPTIONS)).toBe(
      [
        '# My app',
        '',
        '> What it is.',
        '',
        'Blocks fenced by `::: audience <id>` apply to that audience only, and `::: if <name>` / `::: unless <name>` to whether the site sets that value; `{{name}}` is filled in by the site.',
        '',
        '## Get started',
        '',
        '- [Home](/help/index.md): Start here.',
        '- [Usage](/help/reports/usage/index.md): The report.',
        '- [Cards](/help/reports/usage/cards.md): Each card.',
        '',
        '## Reference',
        '',
        '- [Settings](/help/reference/settings.md): Every option.',
        '',
      ].join('\n'),
    )
  })

  it('emits one markdown file per page at its source path, with its title and description', () => {
    const pages = buildLlmsPages(catalogue, OPTIONS)
    expect(Object.keys(pages).sort()).toEqual([
      'help/index.md',
      'help/reference/settings.md',
      'help/reports/usage/cards.md',
      'help/reports/usage/index.md',
    ])
    expect(pages['help/reference/settings.md']).toBe('# Settings\n\n> Every option.\n\n## Currency\nPick one.\n')
  })

  it('explains the site-specific blocks in a published page that carries them, and only there', () => {
    const blocks = createHelpCatalogue(
      { 'setup.md': '---\ntitle: Setup\ndescription: Steps.\nsection: start\n---\n::: audience one\nOnly for one.\n:::' },
      [{ id: 'start', label: 'Get started' }],
    )
    expect(buildLlmsPages(blocks, OPTIONS)['help/setup.md']).toContain('> Steps.\n\nBlocks fenced by `::: audience <id>`')
    expect(buildLlmsPages(catalogue, OPTIONS)['help/index.md']).not.toContain('Blocks fenced')
  })

  it('keeps every relative link in a published page pointing at another published page, folder index pages included', () => {
    const pages = buildLlmsPages(catalogue, OPTIONS)
    const broken = Object.entries(pages).flatMap(([file, markdown]) =>
      [...markdown.matchAll(/\]\(([^)\s]+\.md(?:#[^)\s]*)?)\)/g)]
        .map((match) => resolve(file, match[1]))
        .filter((target) => !(target in pages))
        .map((target) => `${file} → ${target}`),
    )
    expect(broken).toEqual([])
    expect(Object.values(pages).join('\n').match(/\]\([^)\s]+\.md/g)).toHaveLength(4)
  })

  it('carries every page’s full markdown in the full file', () => {
    const full = buildLlmsFull(catalogue, OPTIONS)
    expect(full).toContain('# Settings\n\n> Every option.\n\n## Currency\nPick one.')
    expect(full).toContain('# Home\n\n> Start here.\n\nWelcome.')
  })
})
