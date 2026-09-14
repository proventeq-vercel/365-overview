import { describe, expect, it } from 'vitest'
import { pageWindow } from './usePagination'

describe('pageWindow', () => {
  it('slices the first page of a large estate', () => {
    expect(pageWindow(1308, 0, 50)).toEqual({
      page: 0,
      pageCount: 27,
      start: 0,
      end: 50,
      from: 1,
      to: 50,
    })
  })

  it('shortens the last page to what is left', () => {
    expect(pageWindow(1308, 26, 50)).toEqual({
      page: 26,
      pageCount: 27,
      start: 1300,
      end: 1308,
      from: 1301,
      to: 1308,
    })
  })

  it('clamps a page past the end back onto the last page', () => {
    expect(pageWindow(120, 9, 50)).toMatchObject({ page: 2, from: 101, to: 120 })
  })

  it('clamps a negative page onto the first page', () => {
    expect(pageWindow(120, -3, 50)).toMatchObject({ page: 0, from: 1, to: 50 })
  })

  it('reports one empty page for no rows', () => {
    expect(pageWindow(0, 0, 50)).toEqual({ page: 0, pageCount: 1, start: 0, end: 0, from: 0, to: 0 })
  })

  it('fits an exact multiple without an empty trailing page', () => {
    expect(pageWindow(100, 1, 50)).toMatchObject({ pageCount: 2, from: 51, to: 100 })
  })
})
