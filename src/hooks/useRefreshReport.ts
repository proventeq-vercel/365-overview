import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import type { OverviewInputs } from '../model/storageOverview'
import { STORAGE_INPUTS_KEY } from './useStorageOverview'
import { isGrowth, isIncompleteGrowth } from './useStorageGrowth'

export function useRefreshReport() {
  const queryClient = useQueryClient()
  const fetching = useIsFetching({ predicate: (query) => !isGrowth(query) })
  return {
    refresh: async () => {
      const loadedBefore = queryClient.getQueryState([STORAGE_INPUTS_KEY])?.dataUpdateCount
      await queryClient.invalidateQueries({ predicate: (query) => !isGrowth(query) })
      const inputs = queryClient.getQueryState<Pick<OverviewInputs, 'reportRefreshDate'>>([STORAGE_INPUTS_KEY])
      if (inputs === undefined || inputs.dataUpdateCount === loadedBefore) return
      await queryClient.invalidateQueries({
        predicate: (query) =>
          isIncompleteGrowth(query) && query.queryKey[1] === inputs.data?.reportRefreshDate,
      })
    },
    isRefreshing: fetching > 0,
  }
}
