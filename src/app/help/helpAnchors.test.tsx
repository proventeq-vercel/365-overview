import { describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { ACCESS_MODES } from '@/config/accessMode'
import { HelpMarkdown } from '@/help-center/HelpMarkdown'
import { outline, prepareBody } from '@/help-center/prepare'
import { helpCatalogue } from './helpContent'

describe('help anchors', () => {
  it('gives every rendered heading the id the outline and link check use, on every page and audience', () => {
    const drift: string[] = []
    for (const page of helpCatalogue.pages) {
      for (const audience of ACCESS_MODES) {
        const body = prepareBody(page.body, { audience, variables: {} })
        const { container } = render(
          <HelpMarkdown body={body} file={page.file} basePath="/help" query="" onNavigate={() => {}} />,
        )
        const rendered = [...container.querySelectorAll('h2, h3')].map((heading) => heading.id)
        const expected = outline(body).map((heading) => heading.id)
        if (rendered.join('|') !== expected.join('|')) drift.push(`${page.file} (${audience})`)
        cleanup()
      }
    }
    expect(drift).toEqual([])
  })
})
