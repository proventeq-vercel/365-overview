import { useState } from 'react'
import {
  useOrg,
  useActiveUsers,
  useOneDrive,
  useTeams,
} from '../../hooks/useReports'
import { KpiCard } from '../../components/KpiCard'
import { TrendChart } from '../../components/TrendChart'
import { PeriodSelector } from '../../components/PeriodSelector'
import { ErrorState } from '../../components/ErrorState'
import { SkeletonCard } from '../../components/SkeletonCard'
import type { ReportPeriod } from '../../types/reports'

export function Estate() {
  const [period, setPeriod] = useState<ReportPeriod>('D30')
  const org = useOrg()
  const activeUsers = useActiveUsers(period)
  const oneDrive = useOneDrive(period)
  const teams = useTeams(period)

  const error =
    org.error ?? activeUsers.error ?? oneDrive.error ?? teams.error
  const orgData = org.data
  const activeUsersData = activeUsers.data
  const oneDriveData = oneDrive.data
  const teamsData = teams.data

  return (
    <section className="page">
      <div className="page__header">
        <h1 className="page__title">Estate</h1>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {error ? (
        <ErrorState error={error} />
      ) : !orgData || !activeUsersData || !oneDriveData || !teamsData ? (
        <div className="card-grid">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <>
          <div className="card-grid">
            <KpiCard label="Organization" value={orgData.displayName} />
            <KpiCard label="Verified domain" value={orgData.verifiedDomain} />
            <KpiCard label="Country" value={orgData.country ?? '—'} />
          </div>

          <h2 className="section-heading">Active users</h2>
          <TrendChart
            data={activeUsersData.map((p) => ({ ...p }))}
            xKey="date"
            series={[{ key: 'value', name: 'Active users' }]}
          />

          <h2 className="section-heading">OneDrive usage</h2>
          <TrendChart
            data={oneDriveData.map((p) => ({ ...p }))}
            xKey="date"
            series={[{ key: 'value', name: 'Storage used (bytes)' }]}
          />

          <h2 className="section-heading">Teams activity</h2>
          <TrendChart
            data={teamsData.map((p) => ({ ...p }))}
            xKey="date"
            series={[{ key: 'value', name: 'Teams activity' }]}
          />
        </>
      )}
    </section>
  )
}
