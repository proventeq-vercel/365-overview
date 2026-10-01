import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import type { Plugin } from 'vite'
import { createHelpCatalogue } from './catalogue'
import { buildLlmsFull, buildLlmsIndex, buildLlmsPages, type LlmsOptions } from './llms'
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
  const files = (): Record<string, string> => {
    const catalogue = createHelpCatalogue(readSources(options.dir), options.sections)
    return {
      'llms.txt': buildLlmsIndex(catalogue, options),
      'llms-full.txt': buildLlmsFull(catalogue, options),
      ...buildLlmsPages(catalogue, options),
    }
  }
  const contentType = (name: string) => (name.endsWith('.md') ? 'text/markdown' : 'text/plain')
  const baseFolder = options.basePath.replace(/^\/+|\/+$/g, '')
  const pagePrefix = baseFolder ? `${baseFolder}/` : ''
  const served = (name: string) =>
    name === 'llms.txt' || name === 'llms-full.txt' || (name.startsWith(pagePrefix) && name.endsWith('.md'))
  return {
    name: 'help-center-llms',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const [path, query] = (request.url ?? '').split('?')
        const name = path.replace(/^\//, '')
        if (query !== undefined || !served(name)) return next()
        let body: string | undefined
        try {
          body = files()[name]
        } catch (error) {
          return next(error)
        }
        if (body === undefined) return next()
        response.setHeader('Content-Type', `${contentType(name)}; charset=utf-8`)
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
