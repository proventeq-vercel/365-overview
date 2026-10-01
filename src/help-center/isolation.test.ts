import { describe, expect, it } from 'vitest'

const SOURCES = import.meta.glob<string>('/src/help-center/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const ALLOWED_PACKAGES = new Set(['node:fs', 'node:os', 'node:path', 'vite', 'react', 'react-markdown', 'remark-gfm', 'rehype-slug', 'github-slugger', 'vitest', '@testing-library/react', '@testing-library/user-event'])

function importsOf(source: string): string[] {
  return [...source.matchAll(/(?<![\w'"])(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].map((match) => match[1])
}

describe('help-center stays reusable', () => {
  it('imports only its own files and its declared packages', () => {
    const offending: string[] = []
    for (const [file, source] of Object.entries(SOURCES)) {
      for (const specifier of importsOf(source)) {
        const local = specifier.startsWith('./')
        const ownPackage = ALLOWED_PACKAGES.has(specifier.split('/').slice(0, specifier.startsWith('@') ? 2 : 1).join('/'))
        if (!local && !ownPackage) offending.push(`${file} → ${specifier}`)
      }
    }
    expect(offending).toEqual([])
  })
})
