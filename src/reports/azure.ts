import type { AzureSubscription, AzureResourceCount, AzureCost } from '../types/reports'

export function parseSubscriptions(raw: {
  value: { subscriptionId: string; displayName: string; state: string }[]
}): AzureSubscription[] {
  return raw.value.map((s) => ({ subscriptionId: s.subscriptionId, displayName: s.displayName, state: s.state }))
}

export function parseResourceCounts(raw: { value: { type: string }[] }): AzureResourceCount[] {
  const counts = new Map<string, number>()
  for (const r of raw.value) counts.set(r.type, (counts.get(r.type) ?? 0) + 1)
  return [...counts.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count)
}

export interface RawCostQuery {
  properties: { columns: { name: string }[]; rows: (string | number)[][] }
}

export function parseCostQuery(raw: RawCostQuery, subscriptionId: string): AzureCost {
  const cols = raw.properties.columns.map((c) => c.name)
  const costIdx = cols.findIndex((c) => c === 'Cost' || c === 'PreTaxCost')
  const curIdx = cols.findIndex((c) => c === 'Currency')
  const amount = raw.properties.rows.reduce((a, row) => a + Number(row[costIdx] ?? 0), 0)
  const currency = curIdx >= 0 ? String(raw.properties.rows[0]?.[curIdx] ?? '') : ''
  return { subscriptionId, currency, amount }
}
