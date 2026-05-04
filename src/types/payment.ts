// types/payment.ts

export type CreateWalletPayload = {
  accountId: string;
  chainId: string;
  type: string;
};

export type CreateWalletResponse = {
  wallet: Wallet;
};

export type DepositDemoPayload = {
  accountId: string;
};

export type DepositDemoResponse = {
  accountId: string;
  amount: string;
  availableBalance: string;
  balance: string;
  blockedBalance: string;
};

export type Wallet = {
  accountId: string;
  address: string;
  chainId: string;
  createdAt: string;
  id: string;
  type: string;
};

export type WithdrawPayload = {
  accountId: string;
  address: string;
  amount: string;
  chainId: string;
  otpToken?: string;
  idempotencyKey: string;
};

export type WithdrawResponse = {
  accountId: string;
  address: string;
  amount: string;
  availableBalance: string;
  balance: string;
  chainId: string;
  createdAt: string;
  status: number;
  transactionId: string;
};

export type GetPaymentHistoryParams = {
  take: number;
  skip: number;
  accountId: string;
  startDate?: string;
  endDate?: string;
  type?: number[];
  status?: number[];
};

export type PaymentHistoryItem = {
  id: string;
  accountId: string;
  type: number;
  status: number;
  method: number;
  netAmount: string;
  feeAmount: string;
  grossAmount: string;
  createdAt: string;
  withdrawalMetadata: {
    address?: string;
    chainId?: string;
    toAccountId?: string;
  };
};

export type GetPaymentHistoryResponse = {
  data: PaymentHistoryItem[];
  total: number;
};

export type TransferPayload = {
  fromAccountId: string;
  toAccountId?: string;
  amount: string;
  chainId: string;
  otpToken?: string;
  idempotencyKey: string;
  reason: string;
  toUserEmail: string;
};
