import { describe, expect, it } from 'vitest'
import { createHelpCatalogue } from './catalogue'
import { buildLlmsFull, buildLlmsIndex } from './llms'

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

const OPTIONS = { title: 'My app', summary: 'What it is.', basePath: '/help' }

describe('llms.txt', () => {
  it('indexes every page under its section with its address and description', () => {
    expect(buildLlmsIndex(catalogue, OPTIONS)).toBe(
      [
        '# My app',
        '',
        '> What it is.',
        '',
        '## Get started',
        '',
        '- [Home](/help): Start here.',
        '',
        '## Reference',
        '',
        '- [Settings](/help/reference/settings): Every option.',
        '',
      ].join('\n'),
    )
  })

  it('carries every page’s full markdown in the full file', () => {
    const full = buildLlmsFull(catalogue, OPTIONS)
    expect(full).toContain('# Settings\n\n> Every option.\n\n## Currency\nPick one.')
    expect(full).toContain('# Home\n\n> Start here.\n\nWelcome.')
  })
})
