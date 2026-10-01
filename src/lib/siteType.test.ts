import { describe, expect, it } from 'vitest'
import { SITE_TYPE_LABELS, siteTypeOf } from './siteType'

describe('siteTypeOf', () => {
  it('grades a group-connected site by the flag, whatever the template says', () => {
    expect(siteTypeOf('Communication Site', true)).toBe('groupConnected')
  })

  it('recognises a communication site', () => {
    expect(siteTypeOf('Communication Site', false)).toBe('communication')
  })

  it('recognises the publishing template a communication site reports', () => {
    expect(siteTypeOf('SITEPAGEPUBLISHING#0', false)).toBe('communication')
  })

  it('recognises a team site by name and by template code', () => {
    expect(siteTypeOf('Team Site', false)).toBe('teamSite')
    expect(siteTypeOf('STS#3', false)).toBe('teamSite')
  })

  it('does not guess at an unrecognised template', () => {
    expect(siteTypeOf('Redirect Site', false)).toBe('other')
    expect(siteTypeOf('', false)).toBe('other')
  })

  it('labels every site type', () => {
    expect(SITE_TYPE_LABELS.groupConnected).toBe('Group-connected')
    expect(SITE_TYPE_LABELS.communication).toBe('Communication site')
    expect(SITE_TYPE_LABELS.teamSite).toBe('Team site')
    expect(SITE_TYPE_LABELS.other).toBe('Other')
  })
})
