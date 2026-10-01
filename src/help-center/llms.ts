import type { HelpCatalogue } from './catalogue'
import { helpHref } from './links'

export interface LlmsOptions {
  title: string
  summary: string
  basePath: string
}

export function buildLlmsIndex(catalogue: HelpCatalogue, { title, summary, basePath }: LlmsOptions): string {
  const lines = [`# ${title}`, '', `> ${summary}`, '']
  for (const section of catalogue.sections) {
    const pages = catalogue.pagesIn(section.id)
    if (pages.length === 0) continue
    lines.push(`## ${section.label}`, '')
    for (const page of pages) {
      lines.push(`- [${page.title}](${helpHref(basePath, { slug: page.slug, hash: '' })}): ${page.description}`)
    }
    lines.push('')
  }
  return `${lines.join('\n').trimEnd()}\n`
}

export function buildLlmsFull(catalogue: HelpCatalogue, { title, summary }: LlmsOptions): string {
  const parts = [
    `# ${title}`,
    `> ${summary}`,
    'Blocks fenced by `::: audience <id>` apply to that audience only; `{{name}}` is filled in by the site.',
  ]
  for (const page of catalogue.pages) {
    parts.push(`---\n\n# ${page.title}\n\n> ${page.description}\n\n${page.body}`)
  }
  return `${parts.join('\n\n')}\n`
}
