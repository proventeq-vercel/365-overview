export const HELP_PATH = '/help'

export function isHelpPath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, '')
  return path === HELP_PATH || path.startsWith(`${HELP_PATH}/`)
}

export function helpUrl(slug: string): string {
  return slug ? `${HELP_PATH}/${slug}` : HELP_PATH
}
