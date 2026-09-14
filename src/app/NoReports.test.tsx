import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { render } from '@/test/render'
import { NoReports } from './NoReports'

const envState = vi.hoisted(() => ({ overrides: {} as Record<string, string> }))

vi.mock('@/config/env', () => ({
  env: {
    get overrides() {
      return envState.overrides
    },
  },
}))

afterEach(() => {
  cleanup()
  envState.overrides = {}
})

describe('NoReports', () => {
  it('points at the build when the deployed env enables nothing', () => {
    render(<NoReports />)
    expect(screen.getByText('No report is enabled in this build')).toBeInTheDocument()
    expect(screen.getByText(/VITE_FEATURES names no report/)).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('offers a reset link when this tab overrides the modes from the URL', () => {
    envState.overrides = { features: 'nothing.known' }
    render(<NoReports />)
    expect(screen.getByText(/this tab overrides the deployed modes/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Reset the modes for this tab' })).toHaveAttribute(
      'href',
      '?modes=reset',
    )
  })
})
