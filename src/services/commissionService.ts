import { apiClient } from './apiClient';
import type { CommissionStats, CommissionReward, ClaimCommissionResponse } from '@/types/commission';

export const commissionService = {
  /**
   * Láº¥y thá»‘ng kĂª tá»•ng quan vá» hoa há»“ng cá»§a ngÆ°á»i dĂ¹ng
   */
  getCommissionStats: async (authHeader?: string): Promise<CommissionStats> => {
    const headers = authHeader ? { Authorization: `Bearer ${authHeader}` } : undefined;
    return apiClient.get<CommissionStats>('/commissions/stats', undefined, { headers });
  },

  /**
   * Láº¥y danh sĂ¡ch lá»‹ch sá»­/pháº§n thÆ°á»Ÿng hoa há»“ng chi tiáº¿t
   */
  getCommissionRewards: async (
    params?: { skip?: number; take?: number },
    authHeader?: string,
  ): Promise<{ items: CommissionReward[]; total: number }> => {
    const headers = authHeader ? { Authorization: `Bearer ${authHeader}` } : undefined;
    return apiClient.get<{ items: CommissionReward[]; total: number }>(
      '/commissions/rewards',
      params,
      { headers },
    );
  },

  /**
   * RĂºt toĂ n bá»™ hoa há»“ng Ä‘ang chá» duyá»‡t (Pending) vĂ o sá»‘ dÆ° vĂ­
   */
  claimCommissions: async (
    rewardIds?: string[],
    authHeader?: string,
  ): Promise<ClaimCommissionResponse> => {
    const headers = authHeader ? { Authorization: `Bearer ${authHeader}` } : undefined;
    return apiClient.post<ClaimCommissionResponse>(
      '/commissions/claim',
      { rewardIds: rewardIds ?? [] },
      { headers },
    );
  },
};

