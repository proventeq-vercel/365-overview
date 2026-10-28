import { describe, it, expect } from 'vitest'
import { reportedTemplate } from './reportedTemplate'

describe('reportedTemplate', () => {
  it('trims the template the usage report gives', () => {
    expect(reportedTemplate({ template: ' STS#3 ' })).toBe('STS#3')
  })

  it('reads a missing or blank template as none reported', () => {
    expect(reportedTemplate({ template: undefined })).toBe('')
    expect(reportedTemplate({ template: '  ' })).toBe('')
  })
})
