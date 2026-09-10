const HASH_LIKE = /^[0-9A-F]{20,}$/i
const CONCEALED_SHARE_THRESHOLD = 0.5

export function namesAreConcealed(
  rows: { url: string; ownerDisplayName: string }[],
): boolean {
  if (rows.length === 0) return false
  const concealed = rows.filter(
    (row) => !row.url || HASH_LIKE.test(row.ownerDisplayName.replace(/\s/g, '')),
  ).length
  return concealed / rows.length > CONCEALED_SHARE_THRESHOLD
}
