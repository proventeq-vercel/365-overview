import { describe, expect, it } from 'vitest'
import { isHelpPath } from './helpPath'

describe('isHelpPath', () => {
  it('matches the help page with or without a trailing slash', () => {
    expect(isHelpPath('/help')).toBe(true)
    expect(isHelpPath('/help/')).toBe(true)
  })

  it('leaves the report and look-alike paths to the app', () => {
    expect(isHelpPath('/')).toBe(false)
    expect(isHelpPath('/helpdesk')).toBe(false)
    expect(isHelpPath('/onedrive-usage')).toBe(false)
  })
})
