import type { HelpCatalogue } from './catalogue'
import type { HelpPage } from './types'

export interface LlmsOptions {
  title: string
  summary: string
  basePath: string
}

const AUDIENCE_LEGEND =
  'Blocks fenced by `::: audience <id>` apply to that audience only, and `::: if <name>` / `::: unless <name>` to whether the site sets that value; `{{name}}` is filled in by the site.'
const SITE_SPECIFIC = /^:::|\{\{/m
const FILE_LEGEND = 'Each page starts with the file it is published at; its relative links resolve against that file.'

function markdownPath(basePath: string, page: HelpPage): string {
  return `${basePath.replace(/\/+$/, '')}/${page.file}`
}

function buildLlmsPage(page: HelpPage): string {
  const legend = SITE_SPECIFIC.test(page.body) ? `${AUDIENCE_LEGEND}\n\n` : ''
  return `# ${page.title}\n\n> ${page.description}\n\n${legend}${page.body}\n`
}

export function buildLlmsPages(catalogue: HelpCatalogue, { basePath }: LlmsOptions): Record<string, string> {
  return Object.fromEntries(
    catalogue.pages.map((page) => [markdownPath(basePath, page).replace(/^\/+/, ''), buildLlmsPage(page)]),
  )
}

export function buildLlmsIndex(catalogue: HelpCatalogue, { title, summary, basePath }: LlmsOptions): string {
  const lines = [`# ${title}`, '', `> ${summary}`, '', AUDIENCE_LEGEND, '']
  for (const section of catalogue.sections) {
    const pages = catalogue.pagesIn(section.id)
    if (pages.length === 0) continue
    lines.push(`## ${section.label}`, '')
    for (const page of pages) {
      lines.push(`- [${page.title}](${markdownPath(basePath, page)}): ${page.description}`)
    }
    lines.push('')
  }
  return `${lines.join('\n').trimEnd()}\n`
}

export function buildLlmsFull(catalogue: HelpCatalogue, { title, summary, basePath }: LlmsOptions): string {
  const parts = [`# ${title}`, `> ${summary}`, AUDIENCE_LEGEND, FILE_LEGEND]
  for (const page of catalogue.pages) {
    parts.push(`---\n\nFile: ${markdownPath(basePath, page)}\n\n# ${page.title}\n\n> ${page.description}\n\n${page.body}`)
  }
  return `${parts.join('\n\n')}\n`
}
