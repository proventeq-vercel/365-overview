import { QueryClient } from '@tanstack/react-query'

/**
 * Shared React Query client. Report data changes slowly (Graph usage reports are
 * daily), so we keep a generous staleTime and retry once on transient failures.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
