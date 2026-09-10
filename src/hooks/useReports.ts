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
