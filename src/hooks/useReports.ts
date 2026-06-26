import { useQuery } from '@tanstack/react-query'
import { useDataSource } from '../data/useDataSource'
import type { ReportPeriod } from '../types/reports'

export function useSharePoint(period: ReportPeriod) {
  const ds = useDataSource()
  return useQuery({
    queryKey: ['sharepoint', period],
    queryFn: () => ds.getSharePoint(period),
  })
}

export function useLicenses() {
  const ds = useDataSource()
  return useQuery({
    queryKey: ['licenses'],
    queryFn: () => ds.getLicenses(),
  })
}

export function useOrg() {
  const ds = useDataSource()
  return useQuery({
    queryKey: ['org'],
    queryFn: () => ds.getOrg(),
  })
}

export function useActiveUsers(period: ReportPeriod) {
  const ds = useDataSource()
  return useQuery({
    queryKey: ['activeUsers', period],
    queryFn: () => ds.getActiveUsers(period),
  })
}

export function useOneDrive(period: ReportPeriod) {
  const ds = useDataSource()
  return useQuery({
    queryKey: ['oneDrive', period],
    queryFn: () => ds.getOneDriveUsage(period),
  })
}

export function useTeams(period: ReportPeriod) {
  const ds = useDataSource()
  return useQuery({
    queryKey: ['teams', period],
    queryFn: () => ds.getTeamsActivity(period),
  })
}

export function useMailbox(period: ReportPeriod) {
  const ds = useDataSource()
  return useQuery({
    queryKey: ['mailbox', period],
    queryFn: () => ds.getMailbox(period),
  })
}

export function useEmailActivity(period: ReportPeriod) {
  const ds = useDataSource()
  return useQuery({
    queryKey: ['emailActivity', period],
    queryFn: () => ds.getEmailActivity(period),
  })
}

export function useAzureSubscriptions() {
  const ds = useDataSource()
  return useQuery({
    queryKey: ['azureSubscriptions'],
    queryFn: () => ds.getAzureSubscriptions(),
  })
}

export function useAzureResourceCounts(subId: string) {
  const ds = useDataSource()
  return useQuery({
    queryKey: ['azureResourceCounts', subId],
    queryFn: () => ds.getAzureResourceCounts(subId),
    enabled: !!subId,
  })
}

export function useAzureCost(subId: string) {
  const ds = useDataSource()
  return useQuery({
    queryKey: ['azureCost', subId],
    queryFn: () => ds.getAzureCost(subId),
    enabled: !!subId,
  })
}
