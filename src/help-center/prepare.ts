import GithubSlugger from 'github-slugger'
import type { HelpContext, HelpHeading, HelpVariables } from './types'

const BLOCK_OPEN = /^:::\s+(audience|if|unless)\s+(\S+)\s*$/
const BLOCK_CLOSE = /^:::\s*$/
const FEATURE_OPEN = /^:::\s+(feature|unless-feature)\s+(\S+)\s*$/
const ANY_OPEN = /^:::\s+\S+/
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

export type FeatureCheck = (feature: string) => boolean

export function selectFeatureBlocks(body: string, enabled: FeatureCheck): string {
  const stack: { feature: boolean; visible: boolean }[] = []
  const kept: string[] = []
  let inFence = false
  const visible = () => stack.every((block) => block.visible)
  for (const line of body.split(/\r?\n/)) {
    if (FENCE.test(line)) inFence = !inFence
    if (!inFence) {
      const feature = FEATURE_OPEN.exec(line)
      if (feature) {
        const on = enabled(feature[2])
        stack.push({ feature: true, visible: feature[1] === 'feature' ? on : !on })
        continue
      }
      if (ANY_OPEN.test(line)) {
        if (visible()) kept.push(line)
        stack.push({ feature: false, visible: true })
        continue
      }
      if (BLOCK_CLOSE.test(line) && stack.length > 0) {
        const closed = stack.pop()!
        if (!closed.feature && visible()) kept.push(line)
        continue
      }
    }
    if (visible()) kept.push(line)
  }
  if (stack.length > 0) throw new Error('A help block opened with ::: was never closed')
  return kept.join('\n').replace(/\n{3,}/g, '\n\n')
}

export function featuresUsed(body: string): string[] {
  const features = new Set<string>()
  let inFence = false
  for (const line of body.split(/\r?\n/)) {
    if (FENCE.test(line)) inFence = !inFence
    else if (!inFence) {
      const feature = FEATURE_OPEN.exec(line)
      if (feature) features.add(feature[2])
    }
  }
  return [...features]
}

export function hasAudienceBlocks(body: string): boolean {
  let inFence = false
  for (const line of body.split(/\r?\n/)) {
    if (FENCE.test(line)) inFence = !inFence
    else if (!inFence && BLOCK_OPEN.exec(line)?.[1] === 'audience') return true
  }
  return false
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
