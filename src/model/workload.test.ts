import { describe, it, expect } from 'vitest'
import { classifyWorkload } from './workload'

describe('classifyWorkload', () => {
  it('treats Teams channel and group sites as Teams, in the words Graph reports', () => {
    expect(classifyWorkload('Team Channel')).toBe('Teams')
    expect(classifyWorkload('Group')).toBe('Teams')
  })

  it('still recognises the internal template ids', () => {
    expect(classifyWorkload('TEAMCHANNEL#0')).toBe('Teams')
    expect(classifyWorkload('GROUP#0')).toBe('Teams')
  })

  it('keeps Team Sites and Site Page Publishing under SharePoint', () => {
    expect(classifyWorkload('Team Site')).toBe('SharePoint')
    expect(classifyWorkload('Site Page Publishing')).toBe('SharePoint')
  })

  it('treats everything else, including an unknown template, as SharePoint', () => {
    expect(classifyWorkload('STS#3')).toBe('SharePoint')
    expect(classifyWorkload(undefined)).toBe('SharePoint')
  })
})
