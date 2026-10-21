import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { IndexHtmlTransformContext, IndexHtmlTransformHook, ResolvedConfig } from 'vite'
import { helpBoot, helpBootScriptHash, helpChunkFiles } from './helpBoot'

type Bundle = NonNullable<IndexHtmlTransformContext['bundle']>

const chunk = (fileName: string, facadeModuleId: string | null, imports: string[] = []) =>
  ({ type: 'chunk', fileName, facadeModuleId, imports }) as unknown as Bundle[string]

const bundle = {
  'assets/index-a1.js': chunk('assets/index-a1.js', 'C:\\repo\\index.html'),
  'assets/HelpPage-b2.js': chunk('assets/HelpPage-b2.js', 'C:\\repo\\src\\app\\help\\HelpPage.tsx', [
    'assets/rolldown-runtime-c3.js',
  ]),
} as Bundle

function transform(base: string, context: Partial<IndexHtmlTransformContext>) {
  const plugin = helpBoot({ entry: 'src/app/help/HelpPage.tsx' })
  ;(plugin.configResolved as (config: ResolvedConfig) => void)({ base } as ResolvedConfig)
  const hook = plugin.transformIndexHtml as { handler: IndexHtmlTransformHook }
  return hook.handler.call({} as never, '', context as IndexHtmlTransformContext)
}

describe('helpBoot', () => {
  it('preloads the built help chunk and what it imports', () => {
    expect(helpChunkFiles(bundle, 'src/app/help/HelpPage.tsx')).toEqual([
      'assets/HelpPage-b2.js',
      'assets/rolldown-runtime-c3.js',
    ])
  })

  it('fails the build when no chunk comes from the help entry', () => {
    expect(() => helpChunkFiles(bundle, 'src/app/help/Missing.tsx')).toThrow('no chunk is built from src/app/help/Missing.tsx')
  })

  it('writes the preload list under the site base into a head script', () => {
    expect(transform('/app/', { bundle })).toEqual([
      expect.objectContaining({
        tag: 'script',
        injectTo: 'head-prepend',
        attrs: { 'data-preload': '["/app/assets/HelpPage-b2.js","/app/assets/rolldown-runtime-c3.js"]' },
      }),
    ])
  })

  it('preloads the help source module on the dev server', () => {
    expect(transform('/', {})).toEqual([
      expect.objectContaining({ attrs: { 'data-preload': '["/src/app/help/HelpPage.tsx"]' } }),
    ])
  })

  it('is allowed by the Static Web App content security policy', () => {
    const config = JSON.parse(readFileSync(join(__dirname, '../../../public/staticwebapp.config.json'), 'utf8'))
    const scriptSrc = config.globalHeaders['Content-Security-Policy'].split(';').find((part: string) => part.trim().startsWith('script-src'))
    expect(scriptSrc).toContain(helpBootScriptHash())
  })
})
