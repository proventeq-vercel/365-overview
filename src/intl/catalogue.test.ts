import { describe, expect, it } from 'vitest'
import messages from './en.json'

const SOURCES = import.meta.glob<string>('/src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
})
const KEY_USE = /(?:\bt\(|titleKey: |label: )'([a-z][A-Za-z0-9]*(?:\.[A-Za-z0-9]+)+)'/g
const DYNAMIC_PREFIX_SIZES: Record<string, number> = {
  'storageOptimisation.growth.risk.': 4,
  'pagination.jump.': 4,
  'table.pool.': 2,
}
const DYNAMIC_PREFIXES = Object.keys(DYNAMIC_PREFIX_SIZES)

function usedKeys(): Set<string> {
  const keys = new Set<string>()
  for (const [file, source] of Object.entries(SOURCES)) {
    if (/\.test\.tsx?$/.test(file) || file.startsWith('/src/test/')) continue
    for (const match of source.matchAll(KEY_USE)) keys.add(match[1])
    for (const match of source.matchAll(/t\(`([a-z][A-Za-z0-9.]*\.)\$\{/g)) keys.add(`${match[1]}*`)
  }
  return keys
}

describe('en.json catalogue', () => {
  const catalogue = new Set(Object.keys(messages))
  const used = usedKeys()

  it('has a message for every key the source asks for', () => {
    const missing = [...used].filter((key) => !key.endsWith('*') && !catalogue.has(key))
    expect(missing).toEqual([])
  })

  it('has no dead messages nobody asks for', () => {
    const dead = [...catalogue].filter(
      (key) => !used.has(key) && !DYNAMIC_PREFIXES.some((prefix) => key.startsWith(prefix)),
    )
    expect(dead).toEqual([])
  })

  it('covers every dynamic prefix the source builds keys from', () => {
    for (const [prefix, size] of Object.entries(DYNAMIC_PREFIX_SIZES)) {
      expect(used.has(`${prefix}*`)).toBe(true)
      expect([...catalogue].filter((key) => key.startsWith(prefix))).toHaveLength(size)
    }
  })

  it('has no empty or unbalanced messages', () => {
    for (const [key, message] of Object.entries(messages)) {
      expect(message.trim(), key).not.toBe('')
      expect((message.match(/\{/g) ?? []).length, key).toBe((message.match(/\}/g) ?? []).length)
    }
  })
})
