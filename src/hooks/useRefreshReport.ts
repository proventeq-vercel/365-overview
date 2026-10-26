import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { STORAGE_INPUTS_KEY } from './useStorageOverview'
import { isGrowth } from './useStorageGrowth'

export function useRefreshReport() {
  const queryClient = useQueryClient()
  const fetching = useIsFetching({ predicate: (query) => !isGrowth(query) })
  return {
    refresh: async () => {
      await queryClient.invalidateQueries({ predicate: (query) => !isGrowth(query) })
      const reportDate = queryClient.getQueryData<{ reportRefreshDate: string }>([STORAGE_INPUTS_KEY])?.reportRefreshDate
      await queryClient.invalidateQueries({
        predicate: (query) => isGrowth(query) && query.state.status === 'error' && query.queryKey[1] === reportDate,
      })
    },
    isRefreshing: fetching > 0,
  }
}
