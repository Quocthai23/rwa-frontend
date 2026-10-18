export type DividendClaim = {
  id: string;
  distributionId: string;
  userId: string;
  amount: string;
  status: 'PENDING' | 'CLAIMED';
  claimedAt?: string;
  distribution: {
    assetId: string;
    totalAmount: string;
    snapshotDate: string;
    distributionType: 'DIVIDEND' | 'RENTAL_INCOME' | string;
    currency: string;
    periodStart?: string;
    periodEnd?: string;
    asset: { symbol: string; name: string };
  };
};

export type RentalIncomeDistribution = {
  id: string;
  totalAmount: string;
  allocatedAmount: string;
  currency: string;
  periodStart: string;
  periodEnd: string;
  snapshotDate: string;
  status: 'PENDING' | 'READY_FOR_CLAIM' | 'COMPLETED' | string;
  claims: Array<{
    id: string;
    amount: string;
    status: 'PENDING' | 'CLAIMED';
    claimedAt?: string | null;
  }>;
};
