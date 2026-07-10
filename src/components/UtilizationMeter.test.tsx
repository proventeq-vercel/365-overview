import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UtilizationMeter } from './UtilizationMeter'
import { STORAGE_THRESHOLDS } from '@/lib/thresholds'

describe('UtilizationMeter', () => {
  it('exposes a progressbar with the rounded percent and a label', () => {
    render(<UtilizationMeter used={90} total={100} thresholds={STORAGE_THRESHOLDS} label="Storage" />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '90')
    expect(screen.getByText('Storage')).toBeInTheDocument()
    expect(screen.getByText('90%')).toBeInTheDocument()
  })
})
