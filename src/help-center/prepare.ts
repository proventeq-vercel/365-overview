import GithubSlugger from 'github-slugger'
import type { HelpContext, HelpHeading, HelpVariables } from './types'

const BLOCK_OPEN = /^:::\s+(audience|if|unless)\s+(\S+)\s*$/
const BLOCK_CLOSE = /^:::\s*$/
const VARIABLE = /\{\{\s*([A-Za-z][\w]*)\s*\}\}/g
const FENCE = /^(```|~~~)/
const HEADING = /^(#{2,3})\s+(.+?)\s*#*\s*$/

function hasValue(variables: HelpVariables, name: string): boolean {
  const value = variables[name]
  return typeof value === 'string' && value !== ''
}

function blockApplies(kind: string, argument: string, context: HelpContext): boolean {
  if (kind === 'audience') return argument === context.audience
  if (kind === 'if') return hasValue(context.variables, argument)
  return !hasValue(context.variables, argument)
}

export function selectBlocks(body: string, context: HelpContext): string {
  const visible: boolean[] = []
  const kept: string[] = []
  let inFence = false
  for (const line of body.split(/\r?\n/)) {
    if (FENCE.test(line)) inFence = !inFence
    if (!inFence) {
      const open = BLOCK_OPEN.exec(line)
      if (open) {
        visible.push(blockApplies(open[1], open[2], context))
        continue
      }
      if (BLOCK_CLOSE.test(line) && visible.length > 0) {
        visible.pop()
        continue
      }
    }
    if (visible.every(Boolean)) kept.push(line)
  }
  if (visible.length > 0) throw new Error('A help block opened with ::: was never closed')
  return kept.join('\n').replace(/\n{3,}/g, '\n\n')
}

export function fillVariables(body: string, variables: HelpVariables): string {
  return body.replace(VARIABLE, (_, name: string) => variables[name] ?? '')
}

export function variablesUsed(body: string): string[] {
  return [...new Set([...body.matchAll(VARIABLE)].map((match) => match[1]))]
}

export function prepareBody(body: string, context: HelpContext): string {
  return fillVariables(selectBlocks(body, context), context.variables)
}

export function plainInline(markdown: string): string {
  return markdown
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[`*_~]/g, '')
    .trim()
}

export function outline(body: string): HelpHeading[] {
  const slugger = new GithubSlugger()
  const headings: HelpHeading[] = []
  let inFence = false
  for (const line of body.split(/\r?\n/)) {
    if (FENCE.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    const match = HEADING.exec(line)
    if (!match) continue
    const text = plainInline(match[2])
    headings.push({ id: slugger.slug(text), text, depth: match[1].length as 2 | 3 })
  }
  return headings
}

export function plainText(body: string): string {
  return body
    .split(/\r?\n/)
    .filter((line) => !FENCE.test(line))
    .map((line) => plainInline(line.replace(/^\s*(?:#+|[-*+]|\d+\.|>|\|)\s*/, '').replace(/\|/g, ' ')))
    .filter((line) => line !== '' && !/^[-:\s]+$/.test(line))
    .join(' ')
}
