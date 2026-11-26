import { describe, expect, it } from 'vitest'
import { kpiGridColumns } from './kpiGrid'

describe('kpiGridColumns', () => {
  it.each([
    [0, 'sm:grid-cols-2 xl:grid-cols-2'],
    [1, 'sm:grid-cols-2 xl:grid-cols-2'],
    [2, 'sm:grid-cols-2 xl:grid-cols-2'],
    [3, 'sm:grid-cols-2 xl:grid-cols-3'],
    [4, 'sm:grid-cols-2 xl:grid-cols-4'],
    [5, 'sm:grid-cols-2 xl:grid-cols-5'],
    [6, 'sm:grid-cols-2 xl:grid-cols-6'],
    [7, 'sm:grid-cols-2 xl:grid-cols-6'],
  ])('lays %i cards out as %s', (count, classes) => {
    expect(kpiGridColumns(count)).toBe(classes)
  })
})
