import { useQuery } from '@tanstack/react-query';

import { getStrategyPage } from '@/services/strategyService';
import type { GetStrategyPageRequest, StrategyPageResponse } from '@/types/strategy';

export const strategyQueryKeys = {
  all: ['strategy'] as const,
  page: (params?: GetStrategyPageRequest) => [...strategyQueryKeys.all, 'page', params] as const,
};

type UseStrategyPageOptions = {
  enabled?: boolean;
};

export function useStrategyPage(
  parameters?: GetStrategyPageRequest,
  options?: UseStrategyPageOptions,
) {
  const page = parameters?.page ?? 1;
  const size = parameters?.size ?? 20;
  const type = parameters?.type ?? 'ALL';
  const locale = parameters?.locale ?? 'en-US';
  const symbols = parameters?.symbols;
  const enabled = options?.enabled ?? true;

  return useQuery<StrategyPageResponse>({
    queryFn: () => getStrategyPage({ page, size, type, locale, symbols }),
    queryKey: [...strategyQueryKeys.all, 'page', { page, size, type, locale, symbols }],
    enabled,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });
}
