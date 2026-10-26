import { describe, expect, it } from 'vitest'
import type { StorageRow } from '@/types/storage'
import { oneDriveAttention } from './oneDriveAttention'

const GB = 1_073_741_824

const drive = (id: string, lastActivityDate: string | null, gb: number, over: Partial<StorageRow> = {}): StorageRow => ({
  pool: 'OneDrive',
  id,
  url: '',
  ownerDisplayName: 'An owner',
  storageUsedBytes: gb * GB,
  fileCount: 1,
  activeFileCount: 0,
  lastActivityDate,
  isDeleted: false,
  allocatedBytes: 1024 * GB,
  ...over,
})

const drives = [
  drive('busy@c.com', '2026-08-01', 50),
  drive('three@c.com', '2023-01-15', 10),
  drive('four@c.com', '2022-03-01', 20),
  drive('ancient@c.com', '2019-05-05', 30),
  drive('never@c.com', null, 1),
  drive('leaver@c.com', '2026-07-01', 40),
  drive('gone@c.com', '2020-01-01', 99, { isDeleted: true }),
]

const at = (licences: Map<string, boolean> | null) =>
  oneDriveAttention({
    drives,
    licences,
    reportRefreshDate: '2026-08-30',
    inactiveYears: 3,
    now: new Date('2026-09-01T00:00:00Z'),
  })

describe('oneDriveAttention', () => {
  it('counts live OneDrives with no activity since the archive cutoff, or none ever, as inactive', () => {
    const { inactiveSince, inactive } = at(null)
    expect(inactiveSince).toBe('2023-08-30')
    expect([inactive.count, inactive.bytes]).toEqual([4, 61 * GB])
  })

  it('bands the inactive OneDrives by how long they have been inactive past the cutoff', () => {
    expect(at(null).inactive.bands).toEqual([
      { band: 'firstYear', fromYears: 3, toYears: 4, count: 1, bytes: 10 * GB },
      { band: 'secondYear', fromYears: 4, toYears: 5, count: 1, bytes: 20 * GB },
      { band: 'older', fromYears: 5, toYears: null, count: 1, bytes: 30 * GB },
      { band: 'never', fromYears: null, toYears: null, count: 1, bytes: 1 * GB },
    ])
  })

  const allLicensed = new Map(drives.map((drive) => [drive.id, true]))

  it('puts a live OneDrive whose owner has no OneDrive licence in the unlicensed group, never also in inactive', () => {
    const licences = new Map([...allLicensed, ['ancient@c.com', false], ['leaver@c.com', false]])
    const { inactive, unlicensed } = at(licences)
    expect(unlicensed).toEqual({ count: 2, bytes: 70 * GB, notListed: 0 })
    expect([inactive.count, inactive.bytes]).toEqual([3, 31 * GB])
  })

  it('counts an owner the licence report does not list as unlicensed, since it lists licensed users only', () => {
    const licences = new Map([...allLicensed].filter(([id]) => id !== 'leaver@c.com'))
    expect(at(licences).unlicensed).toEqual({ count: 1, bytes: 40 * GB, notListed: 1 })
  })

  it('leaves the unlicensed group unknown, not empty, when the licence report could not be read', () => {
    expect(at(null).unlicensed).toBeNull()
  })

  it('leaves the unlicensed group unknown when fewer than half the owners match the licence report', () => {
    const half = new Map([...allLicensed].slice(0, 2))
    expect(at(half).unlicensed).toBeNull()
    const most = new Map([...allLicensed].slice(0, 3))
    expect(at(most).unlicensed?.count).toBe(3)
  })

  it('leaves the unlicensed group unknown, never all OneDrives, when no owner matches the licence report at all', () => {
    const { unlicensed, inactive } = at(new Map([['someone-else@c.com', true]]))
    expect(unlicensed).toBeNull()
    expect(inactive.count).toBe(4)
  })

  it('bands a OneDrive last active exactly on a cutoff into the newer band, and one a day before into the older', () => {
    const edge = (id: string, date: string) => drive(id, date, 1)
    const banded = oneDriveAttention({
      drives: [edge('on-window', '2023-08-30'), edge('on-year', '2022-08-30'), edge('day-before-year', '2022-08-29'), edge('on-two', '2021-08-30'), edge('day-before-two', '2021-08-29')],
      licences: null,
      reportRefreshDate: '2026-08-30',
      inactiveYears: 3,
      now: new Date('2026-09-01T00:00:00Z'),
    })
    expect(banded.inactive.bands.map(({ band, count }) => [band, count])).toEqual([
      ['firstYear', 1],
      ['secondYear', 2],
      ['older', 1],
      ['never', 0],
    ])
  })

  it('matches owners whatever case Graph returns their principal name in', () => {
    const shouting = oneDriveAttention({
      drives: [drive('Leaver@C.com', '2026-07-01', 40)],
      licences: new Map([['leaver@c.com', false]]),
      reportRefreshDate: '2026-08-30',
      inactiveYears: 3,
      now: new Date('2026-09-01T00:00:00Z'),
    })
    expect(shouting.unlicensed?.count).toBe(1)
  })
})
