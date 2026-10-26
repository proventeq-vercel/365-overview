import { useIsFetching, useQueryClient, type Query } from '@tanstack/react-query'
import { STORAGE_GROWTH_KEY } from './useStorageGrowth'

const isGrowth = (query: Query) => query.queryKey[0] === STORAGE_GROWTH_KEY

export function useRefreshReport() {
  const queryClient = useQueryClient()
  const fetching = useIsFetching({ predicate: (query) => !isGrowth(query) })
  return {
    refresh: () =>
      queryClient.invalidateQueries({
        predicate: (query) => !isGrowth(query) || query.state.status !== 'success',
      }),
    isRefreshing: fetching > 0,
  }
}
