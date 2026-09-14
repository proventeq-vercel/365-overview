import { useIsFetching, useQueryClient } from '@tanstack/react-query'

export function useRefreshReport() {
  const queryClient = useQueryClient()
  const fetching = useIsFetching()
  return {
    refresh: () => queryClient.invalidateQueries(),
    isRefreshing: fetching > 0,
  }
}
