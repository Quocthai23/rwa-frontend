import { apiClient } from './apiClient';
import type { CommissionStats, CommissionReward, ClaimCommissionResponse } from '@/types/commission';

export const commissionService = {
  /**
   * Lấy thống kê tổng quan về hoa hồng của người dùng
   */
  getCommissionStats: async (authHeader?: string): Promise<CommissionStats> => {
    const headers = authHeader ? { Authorization: `Bearer ${authHeader}` } : undefined;
    return apiClient.get<CommissionStats>('/commissions/stats', undefined, { headers });
  },

  /**
   * Lấy danh sách lịch sử/phần thưởng hoa hồng chi tiết
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
   * Rút toàn bộ hoa hồng đang chờ duyệt (Pending) vào số dư ví
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
