import { plainText, prepareBody } from './prepare'
import type { HelpContext, HelpPage } from './types'

export interface HelpSearchEntry {
  page: HelpPage
  title: string
  description: string
  text: string
}

export interface HelpSearchResult {
  page: HelpPage
  snippet: string
}

const TITLE_WEIGHT = 10
const DESCRIPTION_WEIGHT = 4
const SNIPPET_RADIUS = 70

export function buildSearchIndex(pages: readonly HelpPage[], context: HelpContext): HelpSearchEntry[] {
  return pages.map((page) => ({
    page,
    title: page.title.toLowerCase(),
    description: page.description.toLowerCase(),
    text: plainText(prepareBody(page.body, context)),
  }))
}

function occurrences(haystack: string, needle: string): number {
  let count = 0
  for (let at = haystack.indexOf(needle); at >= 0; at = haystack.indexOf(needle, at + needle.length)) count++
  return count
}

function snippetAround(text: string, lower: string, term: string, fallback: string): string {
  const at = lower.indexOf(term)
  if (at < 0) return fallback
  const start = Math.max(0, at - SNIPPET_RADIUS)
  const end = Math.min(text.length, at + term.length + SNIPPET_RADIUS)
  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`
}

export function searchHelp(index: readonly HelpSearchEntry[], query: string, limit = 12): HelpSearchResult[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return []
  const scored: { entry: HelpSearchEntry; score: number; lower: string }[] = []
  for (const entry of index) {
    const lower = entry.text.toLowerCase()
    let score = 0
    let everyTermFound = true
    for (const term of terms) {
      const inTitle = occurrences(entry.title, term)
      const inDescription = occurrences(entry.description, term)
      const inBody = occurrences(lower, term)
      if (inTitle + inDescription + inBody === 0) {
        everyTermFound = false
        break
      }
      score += inTitle * TITLE_WEIGHT + inDescription * DESCRIPTION_WEIGHT + inBody
    }
    if (everyTermFound) scored.push({ entry, score, lower })
  }
  return scored
    .sort((a, b) => b.score - a.score || a.entry.page.order - b.entry.page.order)
    .slice(0, limit)
    .map(({ entry, lower }) => ({
      page: entry.page,
      snippet: snippetAround(entry.text, lower, terms[0], entry.page.description),
    }))
}
