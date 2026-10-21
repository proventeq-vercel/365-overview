import { createHash } from 'node:crypto'
import type { IndexHtmlTransformContext, Plugin } from 'vite'
import { HELP_PATH } from '../../config/helpPath'

export const HELP_BOOT_SCRIPT = `(function (script) {
  var path = location.pathname.replace(/\\/+$/, '')
  if (path !== '${HELP_PATH}' && path.indexOf('${HELP_PATH}/') !== 0) return
  document.documentElement.setAttribute('data-boot', 'help')
  JSON.parse(script.getAttribute('data-preload')).forEach(function (href) {
    var link = document.createElement('link')
    link.rel = 'modulepreload'
    link.crossOrigin = ''
    link.href = href
    document.head.appendChild(link)
  })
})(document.currentScript)`

export const helpBootScriptHash = () => `'sha256-${createHash('sha256').update(HELP_BOOT_SCRIPT).digest('base64')}'`

const normalise = (path: string) => path.split('\\').join('/')

export function helpChunkFiles(bundle: NonNullable<IndexHtmlTransformContext['bundle']>, entry: string): string[] {
  const chunk = Object.values(bundle).find(
    (output) => output.type === 'chunk' && normalise(output.facadeModuleId ?? '').endsWith(`/${entry}`),
  )
  if (!chunk || chunk.type !== 'chunk') throw new Error(`help-boot: no chunk is built from ${entry}`)
  return [chunk.fileName, ...chunk.imports]
}

export function helpBoot({ entry }: { entry: string }): Plugin {
  let base = '/'
  return {
    name: 'help-boot',
    configResolved(config) {
      base = config.base
    },
    transformIndexHtml: {
      order: 'post',
      handler(_html, context) {
        const files = context.bundle ? helpChunkFiles(context.bundle, entry) : [entry]
        return [
          {
            tag: 'script',
            attrs: { 'data-preload': JSON.stringify(files.map((file) => `${base}${file}`)) },
            children: HELP_BOOT_SCRIPT,
            injectTo: 'head-prepend',
          },
        ]
      },
    },
  }
}
