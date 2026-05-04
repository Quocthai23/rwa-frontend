// Query keys for React Query
export const QUERY_KEYS = {
  // Payment related
  paymentHistory: (params?: unknown) => ['paymentHistory', params] as const,

  // Add more query keys here as needed
  // accounts: () => ['accounts'] as const,
  // accountDetail: (id: string) => ['accounts', id] as const,
} as const;
