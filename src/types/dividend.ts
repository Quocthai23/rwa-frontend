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
    asset: { symbol: string; name: string };
  };
};
