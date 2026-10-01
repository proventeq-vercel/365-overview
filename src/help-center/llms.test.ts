import { describe, expect, it } from 'vitest'
import { createHelpCatalogue } from './catalogue'
import { buildLlmsFull, buildLlmsIndex, buildLlmsPages } from './llms'

const catalogue = createHelpCatalogue(
  {
    'index.md': '---\ntitle: Home\ndescription: Start here.\nsection: start\n---\nWelcome.',
    'reference/settings.md': '---\ntitle: Settings\ndescription: Every option.\nsection: reference\n---\n## Currency\nPick one.',
  },
  [
    { id: 'start', label: 'Get started' },
    { id: 'empty', label: 'Nothing here' },
    { id: 'reference', label: 'Reference' },
  ],
)

const OPTIONS = { title: 'My app', summary: 'What it is.', basePath: '/help/' }

describe('llms.txt', () => {
  it('indexes every page under its section, linking the markdown file an agent can read', () => {
    expect(buildLlmsIndex(catalogue, OPTIONS)).toBe(
      [
        '# My app',
        '',
        '> What it is.',
        '',
        'Blocks fenced by `::: audience <id>` apply to that audience only; `{{name}}` is filled in by the site.',
        '',
        '## Get started',
        '',
        '- [Home](/help/index.md): Start here.',
        '',
        '## Reference',
        '',
        '- [Settings](/help/reference/settings.md): Every option.',
        '',
      ].join('\n'),
    )
  })

  it('emits one markdown file per page at the address the index links', () => {
    expect(buildLlmsPages(catalogue, OPTIONS)).toEqual({
      'help/index.md': '# Home\n\n> Start here.\n\nWelcome.\n',
      'help/reference/settings.md': '# Settings\n\n> Every option.\n\n## Currency\nPick one.\n',
    })
  })

  it('carries every page’s full markdown in the full file', () => {
    const full = buildLlmsFull(catalogue, OPTIONS)
    expect(full).toContain('# Settings\n\n> Every option.\n\n## Currency\nPick one.')
    expect(full).toContain('# Home\n\n> Start here.\n\nWelcome.')
  })
})
