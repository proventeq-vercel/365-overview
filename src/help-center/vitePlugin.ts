import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import type { Plugin } from 'vite'
import { createHelpCatalogue } from './catalogue'
import { buildLlmsFull, buildLlmsIndex, type LlmsOptions } from './llms'
import type { HelpSection } from './types'

export interface HelpLlmsOptions extends LlmsOptions {
  dir: string
  sections: readonly HelpSection[]
}

function markdownFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return markdownFiles(path)
    return entry.name.endsWith('.md') ? [path] : []
  })
}

function readSources(dir: string): Record<string, string> {
  return Object.fromEntries(
    markdownFiles(dir).map((path) => [relative(dir, path).split(sep).join('/'), readFileSync(path, 'utf8')]),
  )
}

export function helpLlms(options: HelpLlmsOptions): Plugin {
  const files = () => {
    const catalogue = createHelpCatalogue(readSources(options.dir), options.sections)
    return { 'llms.txt': buildLlmsIndex(catalogue, options), 'llms-full.txt': buildLlmsFull(catalogue, options) }
  }
  return {
    name: 'help-center-llms',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const name = request.url?.split('?')[0].replace(/^\//, '')
        const body = name === 'llms.txt' || name === 'llms-full.txt' ? files()[name] : undefined
        if (body === undefined) return next()
        response.setHeader('Content-Type', 'text/plain; charset=utf-8')
        response.end(body)
      })
    },
    generateBundle() {
      for (const [fileName, source] of Object.entries(files())) {
        this.emitFile({ type: 'asset', fileName, source })
      }
    },
  }
}
