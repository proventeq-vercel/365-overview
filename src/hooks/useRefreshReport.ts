import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { STORAGE_GROWTH_KEY } from './useStorageGrowth'

export function useRefreshReport() {
  const queryClient = useQueryClient()
  const fetching = useIsFetching()
  return {
    refresh: () =>
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] !== STORAGE_GROWTH_KEY }),
    isRefreshing: fetching > 0,
  }
}
