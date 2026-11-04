import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useExclusiveOpen } from '@/hooks/useExclusiveOpen'

function renderCounted() {
  const counter = { renders: 0 }
  const { result } = renderHook(() => {
    counter.renders += 1
    return useExclusiveOpen()
  })
  return {
    counter,
    isOpen: () => result.current[0],
    setOpen: (next: boolean) => act(() => result.current[1](next)),
  }
}

describe('useExclusiveOpen', () => {
  let opened: ReturnType<typeof renderCounted> | null = null

  afterEach(() => {
    opened?.setOpen(false)
    opened = null
    cleanup()
  })

  it('keeps one open at a time', () => {
    const first = renderCounted()
    const second = renderCounted()
    first.setOpen(true)
    second.setOpen(true)
    opened = second
    expect(first.isOpen()).toBe(false)
    expect(second.isOpen()).toBe(true)
  })

  it('leaves the open one alone when another closes late', () => {
    const first = renderCounted()
    const second = renderCounted()
    second.setOpen(true)
    opened = second
    first.setOpen(false)
    expect(second.isOpen()).toBe(true)
  })

  it('re-renders only the ones whose state changed', () => {
    const first = renderCounted()
    const second = renderCounted()
    const bystander = renderCounted()
    const rendersBefore = bystander.counter.renders
    first.setOpen(true)
    second.setOpen(true)
    opened = second
    expect(bystander.counter.renders).toBe(rendersBefore)
  })
})
