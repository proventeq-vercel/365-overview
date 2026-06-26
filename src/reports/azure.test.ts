import { describe, it, expect } from 'vitest'
import { parseSubscriptions, parseResourceCounts, parseCostQuery } from './azure'

describe('parseSubscriptions', () => {
  it('maps subscription fields', () => {
    const result = parseSubscriptions({
      value: [
        { subscriptionId: 'sub-1', displayName: 'Prod', state: 'Enabled' },
        { subscriptionId: 'sub-2', displayName: 'Dev', state: 'Disabled' },
      ],
    })
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ subscriptionId: 'sub-1', displayName: 'Prod', state: 'Enabled' })
    expect(result[1].state).toBe('Disabled')
  })

  it('handles empty value array', () => {
    expect(parseSubscriptions({ value: [] })).toEqual([])
  })
})

describe('parseResourceCounts', () => {
  it('groups by type and counts, sorted desc', () => {
    const result = parseResourceCounts({
      value: [
        { type: 'Microsoft.Compute/virtualMachines' },
        { type: 'Microsoft.Storage/storageAccounts' },
        { type: 'Microsoft.Compute/virtualMachines' },
        { type: 'Microsoft.Compute/virtualMachines' },
        { type: 'Microsoft.Storage/storageAccounts' },
      ],
    })
    expect(result[0]).toEqual({ type: 'Microsoft.Compute/virtualMachines', count: 3 })
    expect(result[1]).toEqual({ type: 'Microsoft.Storage/storageAccounts', count: 2 })
  })

  it('handles a single type', () => {
    const result = parseResourceCounts({ value: [{ type: 'Microsoft.Network/virtualNetworks' }] })
    expect(result).toEqual([{ type: 'Microsoft.Network/virtualNetworks', count: 1 }])
  })

  it('handles empty input', () => {
    expect(parseResourceCounts({ value: [] })).toEqual([])
  })
})

describe('parseCostQuery', () => {
  it('finds Cost and Currency columns and sums rows', () => {
    const result = parseCostQuery(
      {
        properties: {
          columns: [{ name: 'ServiceName' }, { name: 'Cost' }, { name: 'Currency' }],
          rows: [
            ['Compute', 150.5, 'USD'],
            ['Storage', 49.5, 'USD'],
          ],
        },
      },
      'sub-1',
    )
    expect(result).toEqual({ subscriptionId: 'sub-1', currency: 'USD', amount: 200 })
  })

  it('finds PreTaxCost column as fallback', () => {
    const result = parseCostQuery(
      {
        properties: {
          columns: [{ name: 'PreTaxCost' }, { name: 'Currency' }],
          rows: [[75.0, 'EUR']],
        },
      },
      'sub-2',
    )
    expect(result.amount).toBe(75)
    expect(result.currency).toBe('EUR')
  })

  it('returns zero amount and empty currency when rows is empty', () => {
    const result = parseCostQuery(
      {
        properties: {
          columns: [{ name: 'Cost' }, { name: 'Currency' }],
          rows: [],
        },
      },
      'sub-3',
    )
    expect(result.amount).toBe(0)
    expect(result.currency).toBe('')
  })
})
