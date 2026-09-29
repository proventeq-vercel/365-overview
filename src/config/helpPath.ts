export const HELP_PATH = '/help'

export function isHelpPath(pathname: string): boolean {
  return pathname.replace(/\/+$/, '') === HELP_PATH
}
