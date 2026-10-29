import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { UserConfigFnObject } from 'vite'
import viteConfig from '../../vite.config'
import { HELP_LLMS } from './help/helpSections'

const root = join(__dirname, '../..')

describe('site shell', () => {
  it('previews the build with the Static Web App response headers', async () => {
    const staticWebApp = JSON.parse(readFileSync(join(root, 'public/staticwebapp.config.json'), 'utf8'))
    const config = await (viteConfig as UserConfigFnObject)({ command: 'serve', mode: 'test', isPreview: true })
    expect(staticWebApp.globalHeaders['Content-Security-Policy']).toContain("script-src 'self'")
    expect(config.preview?.headers).toEqual(staticWebApp.globalHeaders)
  })

  it('describes the site with the first sentence of the help summary', () => {
    const html = readFileSync(join(root, 'index.html'), 'utf8')
    const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1]
    expect(description).toBe(
      'A sneak peek of the Proventeq 365 storage-optimisation report, built from a Microsoft 365 tenant’s own Graph usage reports.',
    )
    expect(HELP_LLMS.summary.startsWith(`${description} `)).toBe(true)
  })
})
