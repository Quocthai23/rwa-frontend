import { useQuery } from '@tanstack/react-query';

import { getPaymentHistoryAPI } from '@/services/paymentService';
import type { GetPaymentHistoryParams, GetPaymentHistoryResponse } from '@/types/payment';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useGetPaymentHistory = (parameters: GetPaymentHistoryParams) => {
  const enabled = !!parameters?.accountId;

  return useQuery<GetPaymentHistoryResponse>({
    enabled,
    placeholderData: (previous) => previous,
    queryFn: () => getPaymentHistoryAPI(parameters),
    queryKey: QUERY_KEYS.paymentHistory(parameters),
    staleTime: 60_000,
  });
};
