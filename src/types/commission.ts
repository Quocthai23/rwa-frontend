export interface CommissionReward {
  id: string;
  userId: string;
  sourceUserId: string;
  amount: string | number;
  currency: string;
  status: 'PENDING' | 'AVAILABLE' | 'CLAIMED' | 'REJECTED';
  eventType: string;
  createdAt: string;
  unlockAt?: string;
  sourceUser?: {
    id: string;
    displayName: string;
    email: string;
  };
}

export interface CommissionStats {
  rewardsByEvent: {
    eventType: string;
    currency: string;
    totalAmount: number;
  }[];
  totalByCurrency: Record<string, number>;
}

export interface ClaimCommissionResponse {
  userId: string;
  currency: string;
  totalAmount: number;
  totalAmountWei: string;
  nonce: number;
  signature: string;
  signerAddress: string;
  rewardIds?: string[];
}
