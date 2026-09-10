import { describe, expect, it } from 'vitest'
import { isGroupConnectedTemplate, parseSiteUsage, reportRefreshDateOf, type RawSiteUsageRow } from './siteUsage'

const MARKETING: RawSiteUsageRow = {
  reportRefreshDate: '2026-09-06',
  siteId: 'site-1',
  siteUrl: 'https://contoso.sharepoint.com/sites/marketing',
  ownerDisplayName: 'Ada Lovelace',
  ownerPrincipalName: 'ada@contoso.com',
  rootWebTemplate: 'Group',
  fileCount: '400',
  activeFileCount: '120',
  anonymousLinkCount: '12',
  companyLinkCount: '40',
  secureLinkForGuestCount: '20',
  secureLinkForMemberCount: '28',
  externalSharing: 'True',
  siteSensitivityLabelId: 'label-guid',
  unmanagedDevicePolicy: 'BlockAccess',
  lastActivityDate: '2026-09-04',
  isDeleted: 'False',
}

describe('parseSiteUsage', () => {
  it('coerces the string numerics and True/False strings of the beta report', () => {
    const [site] = parseSiteUsage([MARKETING])
    expect(site.fileCount).toBe(400)
    expect(site.anonymousLinks).toBe(12)
    expect(site.organizationLinks).toBe(40)
    expect(site.guestLinks).toBe(20)
    expect(site.memberLinks).toBe(28)
    expect(site.externalSharingEnabled).toBe(true)
    expect(site.isDeleted).toBe(false)
  })

  it('computes links per file across all four link kinds', () => {
    const [site] = parseSiteUsage([MARKETING])
    expect(site.linksPerFile).toBe(0.25)
  })

  it('leaves links per file null for an empty site rather than dividing by zero', () => {
    const [site] = parseSiteUsage([{ ...MARKETING, fileCount: '0' }])
    expect(site.linksPerFile).toBeNull()
  })

  it('nulls an unlabelled site rather than reporting an empty label id', () => {
    const [site] = parseSiteUsage([{ ...MARKETING, siteSensitivityLabelId: '' }])
    expect(site.sensitivityLabelId).toBeNull()
  })

  it('nulls the activity date of a site that has never been touched', () => {
    const [site] = parseSiteUsage([{ ...MARKETING, lastActivityDate: '' }])
    expect(site.lastActivityDate).toBeNull()
  })

  it('survives a row where every optional column is missing', () => {
    const [site] = parseSiteUsage([{}])
    expect(site).toEqual({
      siteId: '',
      siteUrl: '',
      template: '',
      isGroupConnected: false,
      ownerDisplayName: '',
      ownerPrincipalName: '',
      fileCount: 0,
      activeFileCount: 0,
      lastActivityDate: null,
      isDeleted: false,
      anonymousLinks: 0,
      organizationLinks: 0,
      guestLinks: 0,
      memberLinks: 0,
      externalSharingEnabled: false,
      sensitivityLabelId: null,
      unmanagedDevicePolicy: '',
      linksPerFile: null,
    })
  })

  it('keeps concealed owner and url values verbatim', () => {
    const [site] = parseSiteUsage([
      { ...MARKETING, ownerPrincipalName: '9C4F2B1A0D', siteUrl: '3F7A1C9E20' },
    ])
    expect(site.ownerPrincipalName).toBe('9C4F2B1A0D')
    expect(site.siteUrl).toBe('3F7A1C9E20')
  })
})

describe('isGroupConnectedTemplate', () => {
  it('recognises the group-backed web templates', () => {
    expect(isGroupConnectedTemplate('Group')).toBe(true)
    expect(isGroupConnectedTemplate('TEAMCHANNEL')).toBe(true)
  })

  it('does not claim a classic team site is group connected', () => {
    expect(isGroupConnectedTemplate('STS')).toBe(false)
    expect(isGroupConnectedTemplate('')).toBe(false)
  })
})

describe('reportRefreshDateOf', () => {
  it('reads the refresh date off the first row that carries one', () => {
    expect(reportRefreshDateOf([{ reportRefreshDate: '' }, MARKETING])).toBe('2026-09-06')
  })

  it('is null for an empty report', () => {
    expect(reportRefreshDateOf([])).toBeNull()
  })
})
