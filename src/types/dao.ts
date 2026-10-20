export type BuyoutPaymentPeriod = {
  id: string;
  installmentNumber: number;
  recordAt: string;
  status: string;
  claims: { amount: string; status: string; claimedAt?: string | null }[];
};
