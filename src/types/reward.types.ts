export type RebateDetailItem = {
  date: string;
  symbol: string;
  logo: string;
  quantity: string;
  amount: string;
};

export type RebateStatsData = {
  availableAmount?: string;
  totalAmount: string;
  thisMonthAmount: string;
  todayAmount: string;
};

export enum CommissionPayoutDetailType {
  Commission = 0,
  Rebate = 1,
}

export type UnclaimedAmountData = {
  amount: string;
};

export type ClaimRewardsPayload = {
  type: CommissionPayoutDetailType;
  idempotencyKey: string;
};

export type ClaimRewardsResponse = {
  success: boolean;
  amount: string;
};
