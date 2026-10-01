import { slugOfFile } from './catalogue'

export interface HelpTarget {
  slug: string
  hash: string
}

const EXTERNAL = /^(?:[a-z][a-z\d+.-]*:|\/\/)/i

export function isExternalHref(href: string): boolean {
  return EXTERNAL.test(href)
}

function normalise(segments: string[]): string[] {
  const resolved: string[] = []
  for (const segment of segments) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') resolved.pop()
    else resolved.push(segment)
  }
  return resolved
}

export function resolveDocLink(fromFile: string, href: string): HelpTarget | null {
  if (isExternalHref(href) || href.startsWith('/')) return null
  const [path, hash = ''] = href.split('#', 2)
  if (path === '') return { slug: slugOfFile(fromFile), hash }
  if (!path.endsWith('.md')) return null
  const directory = fromFile.split('/').slice(0, -1)
  return { slug: slugOfFile(normalise([...directory, ...path.split('/')]).join('/')), hash }
}

export function helpHref(basePath: string, target: HelpTarget, query = ''): string {
  const base = basePath.replace(/\/+$/, '')
  const path = target.slug ? `${base}/${target.slug}` : base || '/'
  return `${path}${query}${target.hash ? `#${target.hash}` : ''}`
}

export function slugOfPath(basePath: string, pathname: string): string | null {
  const base = basePath.replace(/\/+$/, '')
  const path = pathname.replace(/\/+$/, '')
  if (path === base) return ''
  if (!path.startsWith(`${base}/`)) return null
  return decodeURIComponent(path.slice(base.length + 1))
}

export function isPlainClick(event: { button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }) {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey
}
