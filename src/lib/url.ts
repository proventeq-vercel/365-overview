export function urlPathname(rawUrl: string): string {
  try {
    const { pathname } = new URL(rawUrl)
    return decodeURIComponent(pathname || rawUrl)
  } catch {
    return rawUrl
  }
}
