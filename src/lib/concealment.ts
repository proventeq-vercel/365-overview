const HASH_LIKE = /^[0-9A-F]{20,}$/i
const CONCEALED_SHARE_THRESHOLD = 0.5

export const isConcealedName = (text: string): boolean => HASH_LIKE.test(text.replace(/\s/g, ''))

export function namesAreConcealed(rows: { ownerDisplayName: string }[]): boolean {
  if (rows.length === 0) return false
  const concealed = rows.filter((row) => isConcealedName(row.ownerDisplayName)).length
  return concealed / rows.length > CONCEALED_SHARE_THRESHOLD
}
