'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { commissionService } from '@/services/commissionService';
import { useToast } from './useToast';
import { localizeApiError } from '@/i18n/apiErrors';
import i18n from '@/i18n';

/**
 * Hook to retrieve referral commission statistics adapted to the UI
 */
export const useCommissionStats = () => {
  return useQuery({
    queryKey: ['commission-stats'],
    queryFn: async () => {
      const stats = await commissionService.getCommissionStats();
      const rewardsRes = await commissionService.getCommissionRewards({ take: 100 });
      const rewards = rewardsRes?.items || [];
      
      // Calculate unclaimed (AVAILABLE) and claimed commissions
      const unclaimed = rewards
        .filter((r) => r.status === 'AVAILABLE')
        .reduce((sum, r) => sum + Number(r.amount), 0);
        
      const claimed = rewards
        .filter((r) => r.status === 'CLAIMED')
        .reduce((sum, r) => sum + Number(r.amount), 0);

      const totalVND = stats.totalByCurrency?.['VND'] || (unclaimed + claimed);
      
      // Find unique referrers/invitees
      const uniqueSourceUsers = new Set(rewards.map((r) => r.sourceUserId));

      return {
        totalReferees: uniqueSourceUsers.size,
        activeReferees: uniqueSourceUsers.size,
        totalCommissions: String(totalVND),
        claimedCommissions: String(claimed),
        unclaimedCommissions: String(unclaimed),
      };
    },
    staleTime: 30 * 1000,
  });
};

/**
 * Hook to retrieve individual commission reward history
 */
export const useCommissionRewards = (params?: { skip?: number; take?: number }) => {
  return useQuery({
    queryKey: ['commission-rewards', params],
    queryFn: async () => {
      const res = await commissionService.getCommissionRewards(params);
      
      // Adapt CommissionReward to the format expected by the UI (e.g. mapping refereeName)
      return (res.items || []).map((reward) => ({
        id: reward.id,
        refereeId: reward.sourceUserId,
        refereeName: reward.sourceUser?.displayName || reward.sourceUser?.email || 'Invited Friend',
        amount: String(reward.amount),
        createdAt: reward.createdAt,
        status: reward.status === 'CLAIMED' ? 'CLAIMED' as const : 'PENDING' as const,
      }));
    },
    staleTime: 30 * 1000,
  });
};

/**
 * Hook to claim all unclaimed commission rewards
 */
export const useClaimCommissions = () => {
  const queryClient = useQueryClient();
  const { showError, showSuccess } = useToast();
  const t = i18n.t.bind(i18n);

  return useMutation({
    mutationFn: () => commissionService.claimCommissions(),
    onSuccess: (data) => {
      showSuccess(
        t('commissions.claimSuccessTitle', { defaultValue: 'Rewards Claimed' }),
        t('commissions.claimSuccessMessage', {
          defaultValue: `Successfully generated claim signature for VNĐ${data.totalAmount} in commission rewards!`,
        }),
      );
      // Invalidate stats, rewards, and balances
      queryClient.invalidateQueries({ queryKey: ['commission-stats'] });
      queryClient.invalidateQueries({ queryKey: ['commission-rewards'] });
      queryClient.invalidateQueries({ queryKey: ['account-summary'] });
      queryClient.invalidateQueries({ queryKey: ['account-balance'] });
    },
    onError: (error: any) => {
      showError(
        t('commissions.claimErrorTitle', { defaultValue: 'Claim Failed' }),
        localizeApiError(error, t) || t('commissions.claimErrorMessage', { defaultValue: 'Unable to claim commissions.' }),
      );
    },
  });
};

