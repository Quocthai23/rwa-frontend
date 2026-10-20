// types/payment.ts
// Aligned with rwa-backend payment.dto.ts. Do not add fields absent from the backend DTO.

// PayOS deposit checkout
export type PayosCheckoutPayload = {
  accountId: string;
  amount: number;
};

export type PayosCheckoutResponse = {
  checkoutUrl: string;
  qrCode: string;
  orderCode: number;
  amount: number;
};

// â”€â”€â”€ Create Wallet â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// BE provisions an encrypted platform-managed EVM wallet.
export type CreateWalletPayload = {
  /** Deprecated compatibility field; the backend ignores external addresses. */
  address?: string;
  type?: 'EVM';
  /** Optional EVM chain ID: '1'|'56'|'97'|'11155111' */
  chainId?: string;
};

export type CreateWalletResponse = {
  wallet: {
    userId: string;
    address: string;
    chainId: string | null;
    type: string;
    custody: 'PLATFORM_MANAGED';
  };
};

// â”€â”€â”€ Withdraw â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// BE: WithdrawV2Dto { amount, destinationAddress, chainId, idempotencyKey, challengeId }
export type WithdrawPayload = {
  /** Source live account UUID */
  accountId: string;
  /** Withdrawal amount as decimal string */
  amount: string;
  /** Destination blockchain wallet address */
  destinationAddress?: string;
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

// â”€â”€â”€ Transfer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// BE: TransferV2Dto { amount, assetId?, toUserId?, toEmail?, idempotencyKey, challengeId }
export type TransferPayload = {
  /** Source live account UUID */
  accountId: string;
  /** Amount to transfer as decimal string */
  amount: string;
  /** Optional asset ID. Omit for VND balance transfer */
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

// â”€â”€â”€ Transaction History â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// BE: GetTransactionHistoryDto { take?, skip?, type?, status?, startDate?, endDate? }
export type GetPaymentHistoryParams = {
  transactionId?: string;
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
  accountId: string;
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
