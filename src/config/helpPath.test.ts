import { describe, expect, it } from 'vitest'
import { helpUrl, isHelpPath } from './helpPath'

describe('isHelpPath', () => {
  it('matches the help overview with or without a trailing slash', () => {
    expect(isHelpPath('/help')).toBe(true)
    expect(isHelpPath('/help/')).toBe(true)
  })

  it('matches every help page under it', () => {
    expect(isHelpPath('/help/getting-started/enable-access')).toBe(true)
    expect(isHelpPath('/help/reports/storage-optimisation/')).toBe(true)
  })

  it('leaves the report and look-alike paths to the app', () => {
    expect(isHelpPath('/')).toBe(false)
    expect(isHelpPath('/helpdesk')).toBe(false)
    expect(isHelpPath('/onedrive-usage')).toBe(false)
  })
})

describe('helpUrl', () => {
  it('builds the address of a help page', () => {
    expect(helpUrl('')).toBe('/help')
    expect(helpUrl('reference/settings')).toBe('/help/reference/settings')
  })
})
