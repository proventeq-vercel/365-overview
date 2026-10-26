import type { StorageRow } from '@/types/storage'

const MAX_INITIALS = 5
const WORD_SEPARATOR = /[^\p{L}\p{N}]+/u
const PSEUDONYM = /^[0-9a-f]{16}$/

const INITIALS_KEYS = new Set(['ownerDisplayName', 'displayName'])
const PSEUDONYM_KEYS = new Set(['siteId', 'ownerPrincipalName', 'userPrincipalName'])
const DROPPED_KEYS = new Set(['siteUrl'])

export function initialsOf(text: string): string {
  return text
    .split(WORD_SEPARATOR)
    .filter(Boolean)
    .slice(0, MAX_INITIALS)
    .map((word) => `${word[0].toUpperCase()}.`)
    .join('')
}

const hex8 = (word: number) => (word >>> 0).toString(16).padStart(8, '0')

export function pseudonymOf(value: string): string {
  if (value === '' || PSEUDONYM.test(value)) return value
  const text = value.toLowerCase()
  let a = 0x811c9dc5
  let b = 0x9747b28c
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    a = Math.imul(a ^ code, 0x01000193)
    b = Math.imul(b ^ code, 0x5bd1e995)
  }
  return `${hex8(a)}${hex8(b)}`
}

function hiddenValue(key: string, value: unknown): unknown {
  if (typeof value !== 'string') return value
  if (INITIALS_KEYS.has(key)) return initialsOf(value)
  if (PSEUDONYM_KEYS.has(key)) return pseudonymOf(value)
  if (DROPPED_KEYS.has(key)) return ''
  return value
}

const PLACEHOLDER = 'Lorem ipsum dolor sit amet'
const PLACEHOLDER_MIN_LENGTH = 8
const PLACEHOLDER_LENGTH_SPREAD = 14

export function hiddenNameLength(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (Math.imul(hash, 31) + seed.charCodeAt(i)) >>> 0
  return PLACEHOLDER_MIN_LENGTH + (hash % PLACEHOLDER_LENGTH_SPREAD)
}

export function hiddenNamePlaceholder(seed: string): string {
  return PLACEHOLDER.slice(0, hiddenNameLength(seed)).trimEnd()
}

export function hideReportRowNames<T extends object>(row: T): T {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) out[key] = hiddenValue(key, value)
  return out as T
}

export function hideRowNames(row: StorageRow): StorageRow {
  return {
    ...row,
    id: pseudonymOf(row.id),
    name: undefined,
    url: '',
    ownerDisplayName: initialsOf(row.ownerDisplayName),
  }
}
