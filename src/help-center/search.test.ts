import { describe, expect, it } from 'vitest'
import { createHelpCatalogue } from './catalogue'
import { buildSearchIndex, searchHelp } from './search'

const catalogue = createHelpCatalogue(
  {
    'settings.md': '---\ntitle: Report settings\ndescription: Currency and rate.\nsection: s\norder: 1\n---\nThe cost rate prices growth.',
    'cost.md': '---\ntitle: Cost cards\ndescription: What growth costs.\nsection: s\norder: 2\n---\nCost of doing nothing.',
    'access.md':
      '---\ntitle: Access\ndescription: Enable it.\nsection: s\norder: 3\n---\n::: audience delegated\nAssign Reports Reader.\n:::\n::: audience application\nNo role is needed.\n:::',
  },
  [{ id: 's', label: 'S' }],
)

const delegated = buildSearchIndex(catalogue.pages, { audience: 'delegated', variables: {} })
const application = buildSearchIndex(catalogue.pages, { audience: 'application', variables: {} })
const slugs = (query: string, index = delegated) => searchHelp(index, query).map((result) => result.page.slug)

describe('searchHelp', () => {
  it('ranks a title match above a body match', () => {
    expect(slugs('cost')).toEqual(['cost', 'settings'])
  })

  it('needs every term to match somewhere', () => {
    expect(slugs('cost rate')).toEqual(['settings'])
  })

  it('searches only the content of the audience being shown', () => {
    expect(slugs('reports reader')).toEqual(['access'])
    expect(slugs('reports reader', application)).toEqual([])
  })

  it('returns nothing for a blank query', () => {
    expect(searchHelp(delegated, '   ')).toEqual([])
  })

  it('quotes the body around the first term as the snippet', () => {
    expect(searchHelp(delegated, 'prices')[0].snippet).toBe('The cost rate prices growth.')
  })
})
