import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import messages from './en.json'

const SRC = join(__dirname, '..')
const KEY_USE = /(?:\bt\(|titleKey: |label: )'([a-z][A-Za-z0-9]*(?:\.[A-Za-z0-9]+)+)'/g
const DYNAMIC_PREFIXES = ['storageOptimisation.growth.risk.']

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) && !path.includes(`${join('src', 'test')}`)
      ? [path]
      : []
  })
}

function usedKeys(): Set<string> {
  const keys = new Set<string>()
  for (const file of sourceFiles(SRC)) {
    const source = readFileSync(file, 'utf-8')
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
    for (const prefix of DYNAMIC_PREFIXES) {
      expect(used.has(`${prefix}*`)).toBe(true)
      expect([...catalogue].filter((key) => key.startsWith(prefix))).toHaveLength(4)
    }
  })

  it('has no empty or unbalanced messages', () => {
    for (const [key, message] of Object.entries(messages)) {
      expect(message.trim(), key).not.toBe('')
      expect((message.match(/\{/g) ?? []).length, key).toBe((message.match(/\}/g) ?? []).length)
    }
  })
})
