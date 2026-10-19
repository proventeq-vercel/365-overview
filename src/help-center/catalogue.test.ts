import { describe, expect, it } from 'vitest'
import { createHelpCatalogue, parseFrontmatter, parseHelpPage, slugOfFile } from './catalogue'

const SECTIONS = [
  { id: 'start', label: 'Get started' },
  { id: 'reference', label: 'Reference' },
]

const page = (fields: string, body = 'Body.') => `---\n${fields}\n---\n${body}\n`

describe('parseFrontmatter', () => {
  it('reads key: value lines and strips matching quotes', () => {
    const { fields, body } = parseFrontmatter('---\ntitle: "Quoted: title"\norder: 3\n---\n\nText')
    expect(fields).toEqual({ title: 'Quoted: title', order: '3' })
    expect(body).toBe('\nText')
  })

  it('reads the frontmatter of a file saved with a byte-order mark', () => {
    expect(parseFrontmatter('﻿---\ntitle: Saved by Notepad\n---\nText').fields).toEqual({ title: 'Saved by Notepad' })
  })

  it('treats a file without frontmatter as all body', () => {
    expect(parseFrontmatter('# Just text')).toEqual({ fields: {}, body: '# Just text' })
  })
})

describe('slugOfFile', () => {
  it('drops the extension and a trailing index', () => {
    expect(slugOfFile('index.md')).toBe('')
    expect(slugOfFile('reports/storage/index.md')).toBe('reports/storage')
    expect(slugOfFile('reports/storage/cards.md')).toBe('reports/storage/cards')
  })

  it('keeps a page whose name merely ends in index', () => {
    expect(slugOfFile('reports/reindex.md')).toBe('reports/reindex')
  })
})

describe('parseHelpPage', () => {
  it('uses the nav title when given and the title otherwise', () => {
    expect(parseHelpPage('a.md', page('title: Long title\nnav: Short\ndescription: d\nsection: start')).navTitle).toBe('Short')
    expect(parseHelpPage('a.md', page('title: Long title\ndescription: d\nsection: start')).navTitle).toBe('Long title')
  })

  it('refuses a page without a description, naming the file', () => {
    expect(() => parseHelpPage('a.md', page('title: T\nsection: start'))).toThrow('a.md has no "description"')
  })

  it('flags pages that carry audience blocks', () => {
    const plain = parseHelpPage('a.md', page('title: T\ndescription: d\nsection: start', '::: if x\nY\n:::'))
    const split = parseHelpPage('b.md', page('title: T\ndescription: d\nsection: start', '::: audience one\nY\n:::'))
    expect(plain.hasAudienceContent).toBe(false)
    expect(split.hasAudienceContent).toBe(true)
  })

  it('does not count an audience block shown as an example inside a code fence', () => {
    const example = parseHelpPage('c.md', page('title: T\ndescription: d\nsection: start', '```\n::: audience one\nY\n:::\n```'))
    expect(example.hasAudienceContent).toBe(false)
  })
})

describe('createHelpCatalogue', () => {
  const catalogue = createHelpCatalogue(
    {
      '/docs/reference/b.md': page('title: B\ndescription: d\nsection: reference\norder: 1'),
      '/docs/start/later.md': page('title: Later\ndescription: d\nsection: start\norder: 20'),
      '/docs/index.md': page('title: Home\ndescription: d\nsection: start\norder: 0'),
      '/docs/reference/a.md': page('title: A\ndescription: d\nsection: reference\norder: 2'),
      '/docs/README.md': 'Authoring notes, not a page.',
    },
    SECTIONS,
    '/docs/',
  )

  it('orders pages by section, then order, and leaves the authoring guide out', () => {
    expect(catalogue.pages.map((each) => each.slug)).toEqual(['', 'start/later', 'reference/b', 'reference/a'])
  })

  it('links each page to its neighbours across sections', () => {
    expect(catalogue.neighbours('start/later').previous?.slug).toBe('')
    expect(catalogue.neighbours('start/later').next?.slug).toBe('reference/b')
    expect(catalogue.neighbours('').previous).toBeNull()
    expect(catalogue.neighbours('reference/a').next).toBeNull()
    expect(catalogue.neighbours('missing')).toEqual({ previous: null, next: null })
  })

  it('refuses two files that would be served at the same address', () => {
    expect(() =>
      createHelpCatalogue(
        {
          'a.md': page('title: A\ndescription: d\nsection: start'),
          'a/index.md': page('title: A again\ndescription: d\nsection: start'),
        },
        SECTIONS,
      ),
    ).toThrow('share the address "/a"')
  })

  it('refuses a page in a section the host did not declare', () => {
    expect(() =>
      createHelpCatalogue({ 'x.md': page('title: X\ndescription: d\nsection: nowhere') }, SECTIONS),
    ).toThrow('unknown section "nowhere"')
  })
})

describe('features', () => {
  const sources = {
    'a.md': page(
      'title: A\ndescription: d\nsection: start\norder: 1',
      'Always.\n\n::: feature beta\nBeta only.\n:::\n\n::: unless-feature beta\nWithout beta.\n:::',
    ),
    'b.md': page('title: B\ndescription: d\nsection: reference\nfeature: beta', 'Beta page.'),
  }
  const withBeta = createHelpCatalogue(sources, SECTIONS, '', (feature) => feature === 'beta')
  const withoutBeta = createHelpCatalogue(sources, SECTIONS, '', () => false)

  it('keeps a feature block and drops its unless-feature twin when the feature is on', () => {
    expect(withBeta.page('a')!.body).toBe('Always.\n\nBeta only.')
  })

  it('drops a feature block and keeps its unless-feature twin when the feature is off', () => {
    expect(withoutBeta.page('a')!.body).toBe('Always.\n\nWithout beta.')
  })

  it('leaves out a page whose feature is off, and a section left with no pages', () => {
    expect(withBeta.page('b')?.title).toBe('B')
    expect(withBeta.sections.map((section) => section.id)).toEqual(['start', 'reference'])
    expect(withoutBeta.page('b')).toBeUndefined()
    expect(withoutBeta.pages.map((entry) => entry.slug)).toEqual(['a'])
    expect(withoutBeta.sections.map((section) => section.id)).toEqual(['start'])
    expect(withoutBeta.neighbours('a')).toEqual({ previous: null, next: null })
  })

  it('keeps other blocks inside a feature block, and shows everything by default', () => {
    const nested = page('title: N\ndescription: d\nsection: start', '::: feature beta\n::: if x\nY\n:::\n:::')
    expect(parseHelpPage('n.md', nested, () => true).body).toBe('::: if x\nY\n:::')
    expect(parseHelpPage('n.md', nested, () => false).body).toBe('')
    expect(parseHelpPage('n.md', nested).body).toBe('::: if x\nY\n:::')
  })

  it('ignores a feature block shown as an example inside a code fence', () => {
    const example = page('title: E\ndescription: d\nsection: start', '```\n::: feature beta\nY\n:::\n```')
    expect(parseHelpPage('e.md', example, () => false).body).toBe('```\n::: feature beta\nY\n:::\n```')
  })
})
