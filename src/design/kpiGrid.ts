const XL_COLUMNS = ['xl:grid-cols-1', 'xl:grid-cols-2', 'xl:grid-cols-3', 'xl:grid-cols-4', 'xl:grid-cols-5', 'xl:grid-cols-6']

export function kpiGridColumns(cardCount: number): string {
  if (cardCount <= 1) return ''
  return `sm:grid-cols-2 ${XL_COLUMNS[Math.min(cardCount, XL_COLUMNS.length) - 1]}`
}
