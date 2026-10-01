import { hasAudienceBlocks } from './prepare'
import type { HelpPage, HelpSection } from './types'

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/
const FIELD = /^([A-Za-z][\w-]*):\s*(.*)$/
const AUTHORING_GUIDE = 'README.md'

export interface HelpCatalogue {
  pages: readonly HelpPage[]
  sections: readonly HelpSection[]
  page(slug: string): HelpPage | undefined
  pagesIn(section: string): HelpPage[]
  neighbours(slug: string): { previous: HelpPage | null; next: HelpPage | null }
}

function unquote(value: string): string {
  const trimmed = value.trim()
  const quoted = /^(['"])(.*)\1$/.exec(trimmed)
  return quoted ? quoted[2] : trimmed
}

export function parseFrontmatter(raw: string): { fields: Record<string, string>; body: string } {
  const source = raw.replace(/^\uFEFF/, '')
  const match = FRONTMATTER.exec(source)
  if (!match) return { fields: {}, body: source }
  const fields: Record<string, string> = {}
  for (const line of match[1].split(/\r?\n/)) {
    const field = FIELD.exec(line)
    if (field) fields[field[1]] = unquote(field[2])
  }
  return { fields, body: source.slice(match[0].length) }
}

export function slugOfFile(file: string): string {
  return file
    .replace(/\.md$/, '')
    .replace(/(^|\/)index$/, '')
    .replace(/^\/+|\/+$/g, '')
}

function required(fields: Record<string, string>, name: string, file: string): string {
  const value = fields[name]
  if (!value) throw new Error(`Help page ${file} has no "${name}" in its frontmatter`)
  return value
}

export function parseHelpPage(file: string, raw: string): HelpPage {
  const { fields, body } = parseFrontmatter(raw)
  const title = required(fields, 'title', file)
  const order = Number(fields.order ?? 0)
  return {
    slug: slugOfFile(file),
    file,
    title,
    navTitle: fields.nav || title,
    description: required(fields, 'description', file),
    section: required(fields, 'section', file),
    order: Number.isFinite(order) ? order : 0,
    body: body.trim(),
    hasAudienceContent: hasAudienceBlocks(body),
  }
}

export function createHelpCatalogue(
  sources: Readonly<Record<string, string>>,
  sections: readonly HelpSection[],
  root = '',
): HelpCatalogue {
  const sectionRank = new Map(sections.map((section, index) => [section.id, index]))
  const pages = Object.entries(sources)
    .filter(([path]) => !path.endsWith(`/${AUTHORING_GUIDE}`) && path !== AUTHORING_GUIDE)
    .map(([path, raw]) => parseHelpPage(path.startsWith(root) ? path.slice(root.length) : path, raw))
  for (const page of pages) {
    if (!sectionRank.has(page.section)) {
      throw new Error(`Help page ${page.file} names an unknown section "${page.section}"`)
    }
  }
  pages.sort(
    (a, b) =>
      sectionRank.get(a.section)! - sectionRank.get(b.section)! ||
      a.order - b.order ||
      a.slug.localeCompare(b.slug),
  )
  const bySlug = new Map(pages.map((page) => [page.slug, page]))

  return {
    pages,
    sections,
    page: (slug) => bySlug.get(slug),
    pagesIn: (section) => pages.filter((page) => page.section === section),
    neighbours(slug) {
      const index = pages.findIndex((page) => page.slug === slug)
      if (index < 0) return { previous: null, next: null }
      return { previous: pages[index - 1] ?? null, next: pages[index + 1] ?? null }
    },
  }
}
