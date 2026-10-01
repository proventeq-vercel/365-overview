import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Connect, ViteDevServer } from 'vite'
import { helpLlms } from './vitePlugin'

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'help-llms-'))
  mkdirSync(join(dir, 'guide'))
  writeFileSync(join(dir, 'guide', 'setup.md'), '---\ntitle: Setup\ndescription: Steps.\nsection: start\n---\nDo it.')
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

function serve(basePath: string, url: string) {
  const plugin = helpLlms({ dir, sections: [{ id: 'start', label: 'Start' }], basePath, title: 'App', summary: 'It.' })
  let middleware: Connect.NextHandleFunction | undefined
  const server = { middlewares: { use: (handler: Connect.NextHandleFunction) => (middleware = handler) } }
  ;(plugin.configureServer as (server: ViteDevServer) => void)(server as unknown as ViteDevServer)
  const response = { setHeader: vi.fn(), end: vi.fn() }
  const next = vi.fn()
  middleware?.({ url } as Connect.IncomingMessage, response as never, next)
  return { response, next }
}

describe('helpLlms dev server', () => {
  it('serves a page file under its base path as markdown', () => {
    const { response, next } = serve('/help', '/help/guide/setup.md')
    expect(next).not.toHaveBeenCalled()
    expect(response.setHeader).toHaveBeenCalledWith('Content-Type', 'text/markdown; charset=utf-8')
    expect(response.end).toHaveBeenCalledWith('# Setup\n\n> Steps.\n\nDo it.\n')
  })

  it('serves page files when the help sits at the site root', () => {
    const { response, next } = serve('/', '/guide/setup.md')
    expect(next).not.toHaveBeenCalled()
    expect(response.end).toHaveBeenCalledWith('# Setup\n\n> Steps.\n\nDo it.\n')
  })

  it('passes on a module request for a page source, even at the site root', () => {
    const { response, next } = serve('/', '/guide/setup.md?raw')
    expect(next).toHaveBeenCalled()
    expect(response.end).not.toHaveBeenCalled()
  })

  it('serves the index with a cache-busting query', () => {
    const { response, next } = serve('/help', '/llms.txt?ts=1')
    expect(next).not.toHaveBeenCalled()
    expect(response.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain; charset=utf-8')
  })

  it('passes on a markdown request outside its base path without building the help', () => {
    writeFileSync(join(dir, 'guide.md'), '---\ntitle: Clash\ndescription: Same address.\nsection: start\n---\nX.')
    writeFileSync(join(dir, 'guide', 'index.md'), '---\ntitle: Guide\ndescription: Folder.\nsection: start\n---\nY.')
    const { response, next } = serve('/help', '/guide/setup.md')
    expect(next).toHaveBeenCalledWith()
    expect(response.end).not.toHaveBeenCalled()
  })
})
