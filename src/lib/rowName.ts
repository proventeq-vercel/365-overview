export function rowName(url: string, fallback: string): string {
  return url.replace(/\/$/, '').split('/').pop() || fallback
}
