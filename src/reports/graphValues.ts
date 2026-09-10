export function num(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function bool(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value.trim().toLowerCase() === 'true'
  return false
}

export function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function dateOrNull(value: unknown): string | null {
  const raw = text(value).trim()
  return raw === '' ? null : raw
}
