// types/payment.ts
// Aligned with rwa-backend payment.dto.ts — DO NOT add fields that don't exist in the BE DTO.

// ─── Deposit Demo ───────────────────────────────────────────────────────────
// BE: DepositDemoDto { amount: string; idempotencyKey?: string }
export type DepositDemoPayload = {
  /** Deposit amount as a decimal string, e.g. "500.00" */
  amount: string;
  /** Optional UUID v4 to prevent duplicate submissions */
  idempotencyKey?: string;
};

export type DepositDemoResponse = {
  transactionId: string;
  success: boolean;
};

// ─── Create Wallet ───────────────────────────────────────────────────────────
// BE: CreateWalletDto { address: string; type?: 'EVM'|'SOL'; chainId?: string }
export type CreateWalletPayload = {
  /** Blockchain wallet address, e.g. "0x..." */
  address: string;
  /** Optional chain type: 'EVM' or 'SOL' */
  type?: 'EVM' | 'SOL';
  /** Optional EVM chain ID: '1'|'56'|'97'|'11155111' */
  chainId?: string;
};

export type CreateWalletResponse = {
  wallet: {
    userId: string;
    address: string;
    chainId: string | null;
    type: string;
  };
};

// ─── Withdraw ────────────────────────────────────────────────────────────────
// BE: WithdrawV2Dto { amount, destinationAddress, chainId, idempotencyKey, challengeId }
export type WithdrawPayload = {
  /** Withdrawal amount as decimal string */
  amount: string;
  /** Destination blockchain wallet address */
  destinationAddress: string;
  /** Target EVM chain ID */
  chainId: string;
  /** UUID v4 idempotency key */
  idempotencyKey: string;
  /** Verified challengeId from POST /auth/challenge/verify */
  challengeId: string;
};

export type WithdrawResponse = {
  success: boolean;
  transactionId: string;
};

// ─── Transfer ────────────────────────────────────────────────────────────────
// BE: TransferV2Dto { amount, assetId?, toUserId?, toEmail?, idempotencyKey, challengeId }
export type TransferPayload = {
  /** Amount to transfer as decimal string */
  amount: string;
  /** Optional asset ID. Omit for USDT balance transfer */
  assetId?: string;
  /** Recipient user ID (either toUserId or toEmail required) */
  toUserId?: string;
  /** Recipient email address (either toUserId or toEmail required) */
  toEmail?: string;
  /** UUID v4 idempotency key */
  idempotencyKey: string;
  /** Verified challengeId from POST /auth/challenge/verify */
  challengeId: string;
};

// ─── Transaction History ─────────────────────────────────────────────────────
// BE: GetTransactionHistoryDto { take?, skip?, type?, status?, startDate?, endDate? }
export type GetPaymentHistoryParams = {
  take?: number;
  skip?: number;
  accountId?: string;
  /** Filter by type: DEPOSIT | WITHDRAW | TRANSFER | DIVIDEND_CLAIM */
  type?: 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | 'DIVIDEND_CLAIM';
  /** Filter by status: PENDING | COMPLETED | FAILED | CANCELLED */
  status?: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  /** ISO 8601 start date */
  startDate?: string;
  /** ISO 8601 end date */
  endDate?: string;
};

export type PaymentHistoryItem = {
  id: string;
  userId: string;
  type: string;
  status: string;
  /** Decimal string */
  amount: string;
  fee?: string;
  idempotencyKey?: string;
  txHash?: string;
  createdAt: string;
  updatedAt: string;
};

export type GetPaymentHistoryResponse = {
  data: PaymentHistoryItem[];
  total?: number;
  nextCursor?: string;
};
