import { useQuery } from '@tanstack/react-query';
import { getReferralStats, type ReferralStatsParams } from '@/services/referralService';

interface UseReferralStatsOptions {
  enabled?: boolean;
}

export const useReferralStats = (
  params: ReferralStatsParams,
  options?: UseReferralStatsOptions,
) => {
  return useQuery({
    queryKey: ['commision-stats', params.fromDate ?? '', params.toDate ?? ''],
    queryFn: () => getReferralStats(params),
    staleTime: 60 * 1000,
    enabled: options?.enabled ?? true,
  });
};
