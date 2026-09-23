import { describe, expect, it } from 'vitest'
import type { StorageRow } from '@/types/storage'
import {
  parseDeltaSites,
  parseSiteDetails,
  siteDetailsPath,
  siteDirectoryPath,
  unresolvedSiteIds,
  withSiteDirectory,
} from './siteDirectory'

const FINANCE_ID = '8f3c1a2b-9d4e-4f60-a1b2-c3d4e5f60718'
const GONE_ID = 'e5f60718-1234-4f60-a1b2-000000000000'

const directory = parseSiteDetails(
  [FINANCE_ID.toUpperCase(), GONE_ID, 'no-body'],
  [
    {
      status: 200,
      body: {
        id: `contoso.sharepoint.com,${FINANCE_ID},0a1b2c3d-1111-2222-3333-444455556666`,
        displayName: 'Finance',
        webUrl: 'https://contoso.sharepoint.com/sites/finance',
      },
    },
    { status: 404, body: { id: 'ignored', displayName: 'Ignored' } },
    { status: 200 },
  ],
)

const reportRow = (over: Partial<StorageRow>): StorageRow => ({
  pool: 'SharePoint',
  id: FINANCE_ID,
  url: '',
  ownerDisplayName: 'SharePoint Admin',
  storageUsedBytes: 10,
  fileCount: 1,
  activeFileCount: 0,
  lastActivityDate: null,
  isDeleted: false,
  ...over,
})

describe('siteDetailsPath', () => {
  it('asks for one site by the id the usage report carries, selecting only what the cell shows', () => {
    expect(siteDetailsPath(FINANCE_ID)).toBe(
      `/sites/${FINANCE_ID}?$select=id,displayName,webUrl`,
    )
  })
})

describe('parseSiteDetails', () => {
  it('keys a 200 response by the requested id, lower-cased', () => {
    expect(directory.get(FINANCE_ID)).toEqual({
      name: 'Finance',
      url: 'https://contoso.sharepoint.com/sites/finance',
    })
  })

  it('drops a non-200 response and a response without a body', () => {
    expect(directory.size).toBe(1)
    expect(directory.has(GONE_ID)).toBe(false)
  })

  it('leaves a missing display name empty rather than undefined', () => {
    const [site] = [
      ...parseSiteDetails(['x'], [{ status: 200, body: { webUrl: 'https://x' } }]).values(),
    ]
    expect(site).toEqual({ name: '', url: 'https://x' })
  })
})

describe('unresolvedSiteIds', () => {
  it('lists SharePoint rows without a name and skips drives and named rows', () => {
    const rows = [
      reportRow({}),
      reportRow({ id: 'named', name: 'Named' }),
      reportRow({ id: 'drive', pool: 'OneDrive' }),
    ]
    expect(unresolvedSiteIds(rows)).toEqual([FINANCE_ID])
  })
})

describe('withSiteDirectory', () => {
  it('fills the name and the URL the usage report left blank', () => {
    const [row] = withSiteDirectory([reportRow({})], directory)
    expect(row.name).toBe('Finance')
    expect(row.url).toBe('https://contoso.sharepoint.com/sites/finance')
  })

  it('matches the report id case-insensitively', () => {
    const [row] = withSiteDirectory([reportRow({ id: FINANCE_ID.toUpperCase() })], directory)
    expect(row.name).toBe('Finance')
  })

  it('keeps a URL the report did carry', () => {
    const [row] = withSiteDirectory(
      [reportRow({ url: 'https://contoso.sharepoint.com/sites/finance/' })],
      directory,
    )
    expect(row.url).toBe('https://contoso.sharepoint.com/sites/finance/')
  })

  it('leaves a row alone when the directory does not know it, such as a deleted site', () => {
    const unknown = reportRow({ id: GONE_ID, isDeleted: true })
    const [row] = withSiteDirectory([unknown], directory)
    expect(row).toBe(unknown)
  })

  it('hands back the same array when there is nothing to merge', () => {
    const rows = [reportRow({})]
    expect(withSiteDirectory(rows, new Map())).toBe(rows)
  })
})

describe('parseDeltaSites', () => {
  const compose = (siteCollectionId: string, webId: string) =>
    `contoso.sharepoint.com,${siteCollectionId},${webId}`

  it('keys the tenant directory by the site-collection id the usage report carries', () => {
    const directory = parseDeltaSites([
      {
        id: compose(FINANCE_ID.toUpperCase(), '0a1b2c3d-1111-2222-3333-444455556666'),
        displayName: 'Finance',
        webUrl: 'https://contoso.sharepoint.com/sites/finance',
      },
    ])

    expect([...directory.keys()]).toEqual([FINANCE_ID])
    expect(directory.get(FINANCE_ID)).toEqual({
      name: 'Finance',
      url: 'https://contoso.sharepoint.com/sites/finance',
    })
  })

  it('prefers the display name over the URL segment name', () => {
    const directory = parseDeltaSites([
      { id: compose(FINANCE_ID, 'web'), name: 'finance', displayName: 'Finance & Ops' },
    ])
    expect(directory.get(FINANCE_ID)?.name).toBe('Finance & Ops')
  })

  it('falls back to the URL segment name when a site has no display name', () => {
    const directory = parseDeltaSites([{ id: compose(FINANCE_ID, 'web'), name: 'finance' }])
    expect(directory.get(FINANCE_ID)?.name).toBe('finance')
  })

  it('keeps the root web when a site collection also returns its subsites', () => {
    const directory = parseDeltaSites([
      {
        id: compose(FINANCE_ID, 'subweb'),
        displayName: 'Payables',
        webUrl: 'https://contoso.sharepoint.com/sites/finance/payables',
      },
      {
        id: compose(FINANCE_ID, 'root'),
        displayName: 'Finance',
        webUrl: 'https://contoso.sharepoint.com/sites/finance',
      },
    ])

    expect(directory.size).toBe(1)
    expect(directory.get(FINANCE_ID)?.name).toBe('Finance')
  })

  it('takes an entry that has a URL over one that does not, whichever came first', () => {
    const withoutUrl = { id: compose(FINANCE_ID, 'a'), displayName: 'Finance' }
    const withUrl = {
      id: compose(FINANCE_ID, 'b'),
      displayName: 'Finance',
      webUrl: 'https://contoso.sharepoint.com/sites/finance',
    }

    expect(parseDeltaSites([withoutUrl, withUrl]).get(FINANCE_ID)?.url).toBe(
      'https://contoso.sharepoint.com/sites/finance',
    )
    expect(parseDeltaSites([withUrl, withoutUrl]).get(FINANCE_ID)?.url).toBe(
      'https://contoso.sharepoint.com/sites/finance',
    )
  })

  it('skips entries Graph returns without a usable composite id', () => {
    expect(parseDeltaSites([{ displayName: 'No id' }, { id: 'hostname-only' }]).size).toBe(0)
  })

  it('names the rows the usage report left blank', () => {
    const directory = parseDeltaSites([
      {
        id: compose(FINANCE_ID, 'root'),
        displayName: 'Finance',
        webUrl: 'https://contoso.sharepoint.com/sites/finance',
      },
    ])
    const [row] = withSiteDirectory([reportRow({})], directory)
    expect(row.name).toBe('Finance')
    expect(row.url).toBe('https://contoso.sharepoint.com/sites/finance')
  })
})

describe('siteDirectoryPath', () => {
  it('asks for one bounded page of the tenant delta, not a search of every site', () => {
    expect(siteDirectoryPath()).toBe('/sites/delta?$select=id,name,displayName,webUrl&$top=500')
  })
})
