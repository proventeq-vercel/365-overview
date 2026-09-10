import { ApiError } from '../clients/apiError'
import type { DataSource } from './dataSource'
import {
  DEFAULT_FIXTURE_TENANT,
  FIXTURE_TENANTS,
  isFixtureTenantKey,
  type FixtureTenant,
  type FixtureTenantKey,
} from './fixtureTenants'

export type { DataSource } from './dataSource'

export function readFixtureTenantKey(search: string): FixtureTenantKey {
  const requested = new URLSearchParams(search).get('tenant')
  return isFixtureTenantKey(requested) ? requested : DEFAULT_FIXTURE_TENANT
}

function served<T>(tenant: FixtureTenant, call: keyof DataSource, value: T): Promise<T> {
  if (tenant.forbidden.includes(call)) {
    return Promise.reject(
      new ApiError(403, 'Either the signed-in user does not have the required role, or the request is not permitted.'),
    )
  }
  return Promise.resolve(value)
}

export function createMockDataSource(key: FixtureTenantKey = DEFAULT_FIXTURE_TENANT): DataSource {
  const tenant = FIXTURE_TENANTS[key]
  return {
    getOrganization: () => served(tenant, 'getOrganization', tenant.organization),
    getReportSettings: () => served(tenant, 'getReportSettings', tenant.reportSettings),
    getSiteUsage: () => served(tenant, 'getSiteUsage', tenant.siteUsage),
    getSharePointActivity: () => served(tenant, 'getSharePointActivity', tenant.sharePointActivity),
    getOneDriveActivity: () => served(tenant, 'getOneDriveActivity', tenant.oneDriveActivity),
    getSharePointFileCounts: () => served(tenant, 'getSharePointFileCounts', tenant.sharePointFileCounts),
    getOneDriveFileCounts: () => served(tenant, 'getOneDriveFileCounts', tenant.oneDriveFileCounts),
    getGuests: () => served(tenant, 'getGuests', tenant.guests),
    getUnifiedGroups: () => served(tenant, 'getUnifiedGroups', tenant.groups),
    getTenantSharingSettings: () => served(tenant, 'getTenantSharingSettings', tenant.tenantSharing),
    getGuestInvitePolicy: () => served(tenant, 'getGuestInvitePolicy', tenant.guestPolicy),
    getGlobalAdminCount: () => served(tenant, 'getGlobalAdminCount', tenant.globalAdmins),
  }
}
