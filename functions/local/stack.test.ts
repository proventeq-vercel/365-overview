import { describe, expect, it } from 'vitest'
import { allowedOriginsFrom, DEFAULT_LOCAL_ORIGINS } from './stack.js'

describe('allowedOriginsFrom', () => {
  it('allows Vite\'s default ports when nothing is named', () => {
    expect(allowedOriginsFrom(['node', 'local-stack.js'])).toEqual([
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ])
  })

  it('adds a named origin to the defaults rather than replacing them', () => {
    expect(allowedOriginsFrom(['node', '--func', '--origin=http://localhost:5017'])).toEqual([
      ...DEFAULT_LOCAL_ORIGINS,
      'http://localhost:5017',
    ])
  })

  it('takes every named origin', () => {
    const origins = allowedOriginsFrom(['--origin=http://localhost:5017', '--origin=http://localhost:4173'])
    expect(origins.slice(-2)).toEqual(['http://localhost:5017', 'http://localhost:4173'])
  })

  it('ignores an empty or whitespace-only origin', () => {
    expect(allowedOriginsFrom(['--origin=', '--origin=   '])).toEqual(DEFAULT_LOCAL_ORIGINS)
  })
})
