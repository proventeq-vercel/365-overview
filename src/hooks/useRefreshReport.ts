import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { reportDateOf } from '../model/storageOverview'
import { STORAGE_INPUTS_KEY, type StorageInputs } from './useStorageOverview'
import { canReadGrowthAgain, isGrowth } from './useStorageGrowth'

export function useRefreshReport() {
  const queryClient = useQueryClient()
  const fetching = useIsFetching({ predicate: (query) => !isGrowth(query) })
  return {
    refresh: async () => {
      const loadedBefore = queryClient.getQueryState([STORAGE_INPUTS_KEY])?.dataUpdateCount
      await queryClient.invalidateQueries({ predicate: (query) => !isGrowth(query) })
      const inputs = queryClient.getQueryState<StorageInputs>([STORAGE_INPUTS_KEY])
      if (inputs?.data === undefined || inputs.dataUpdateCount === loadedBefore) return
      const { reportRefreshDate, sharePointTrend, oneDriveTrend } = inputs.data
      const reportDate = reportDateOf(reportRefreshDate, sharePointTrend, oneDriveTrend)
      await queryClient.invalidateQueries({
        predicate: (query) => canReadGrowthAgain(query) && query.queryKey[1] === reportDate,
      })
    },
    isRefreshing: fetching > 0,
  }
}
