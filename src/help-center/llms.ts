import type { HelpCatalogue } from './catalogue'
import type { HelpPage } from './types'

export interface LlmsOptions {
  title: string
  summary: string
  basePath: string
}

const AUDIENCE_LEGEND =
  'Blocks fenced by `::: audience <id>` apply to that audience only; `{{name}}` is filled in by the site.'

export function markdownPath(basePath: string, slug: string): string {
  return `${basePath.replace(/\/+$/, '')}/${slug || 'index'}.md`
}

export function buildLlmsPage(page: HelpPage): string {
  return `# ${page.title}\n\n> ${page.description}\n\n${page.body}\n`
}

export function buildLlmsPages(catalogue: HelpCatalogue, { basePath }: LlmsOptions): Record<string, string> {
  return Object.fromEntries(
    catalogue.pages.map((page) => [markdownPath(basePath, page.slug).replace(/^\/+/, ''), buildLlmsPage(page)]),
  )
}

export function buildLlmsIndex(catalogue: HelpCatalogue, { title, summary, basePath }: LlmsOptions): string {
  const lines = [`# ${title}`, '', `> ${summary}`, '', AUDIENCE_LEGEND, '']
  for (const section of catalogue.sections) {
    const pages = catalogue.pagesIn(section.id)
    if (pages.length === 0) continue
    lines.push(`## ${section.label}`, '')
    for (const page of pages) {
      lines.push(`- [${page.title}](${markdownPath(basePath, page.slug)}): ${page.description}`)
    }
    lines.push('')
  }
  return `${lines.join('\n').trimEnd()}\n`
}

export function buildLlmsFull(catalogue: HelpCatalogue, { title, summary }: LlmsOptions): string {
  const parts = [`# ${title}`, `> ${summary}`, AUDIENCE_LEGEND]
  for (const page of catalogue.pages) {
    parts.push(`---\n\n${buildLlmsPage(page).trimEnd()}`)
  }
  return `${parts.join('\n\n')}\n`
}
