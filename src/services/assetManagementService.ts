import { ASSET_MANAGEMENT_ENDPOINTS } from '../constants/api';
import { apiClient } from './apiClient';
import { CLIENT_BASE_URL } from './baseUrl';

const isServer = typeof window === 'undefined';

export type AssetStatus = Record<string, unknown> & {
  /** @deprecated Treasury balances are unavailable until a dedicated asset treasury is configured. */
  contractBalanceVNDT?: number | null;
  rentalDepositVnd?: number;
  treasuryBalance?: number | null;
  treasuryCurrency?: string | null;
  treasuryStatus?: 'NOT_CONFIGURED' | 'ACTIVE';
  nextDeductionDays?: number;
  rentalContract?: {
    status?: string;
    startDate?: string;
    endDate?: string | null;
    monthlyRentVnd?: string;
    depositVnd?: string;
    currency?: 'VND';
    dueDate?: number;
    walletBalanceVnd?: string;
    walletReservedVnd?: string;
    depositFundedVnd?: string;
    nextDueAt?: string | null;
    fundingDeadlineAt?: string | null;
    walletEntries?: Array<{
      id: string;
      type: string;
      direction: 'CREDIT' | 'DEBIT';
      amountVnd: string;
      balanceAfterVnd: string;
      referenceId?: string | null;
      createdAt: string;
      metadata?: Record<string, unknown> | null;
    }>;
    tenant?: { id?: string; walletAddress?: string; displayName?: string; username?: string };
  } | null;
};

export type BuyoutProposal = {
  id: string;
  title: string;
  description?: string;
  status: 'ACTIVE' | 'PASSED' | 'REJECTED' | 'EXECUTED' | 'EXPIRED';
  endDate?: string;
  votes?: Array<{ isFor: boolean; votingPower: string }>;
  snapshots?: Array<{ userId: string; votingPower: string }>;
  metadata?: Record<string, unknown> | null;
  type?: 'GENERAL' | 'INCREASE_RELEASED_TOKEN_PERCENTAGE' | 'BUYOUT_PROPOSAL';
};

export type BuyoutQuote = {
  assetId: string;
  quoteCurrency: 'VND';
  settlementAsset: 'VND_LEDGER';
  votingWindowDays: number;
  premiumBands: Array<{
    durationMonths: number;
    minPercent: number;
    maxPercent: number;
    depositPercent: number;
  }>;
  eligibility: {
    eligible: boolean;
    reasonCode?: string;
    reason?: string;
    currentHolding?: string;
    continuouslyHeldBalance?: string;
    requiredCurrentHolding?: string;
    minContinuousHolding?: string;
    matureOwnershipThreshold?: string;
    holdingMonths?: number;
  };
  terms: {
    durationMonths: number;
    currentHolding: string;
    totalSupply: string;
    minorityTokenAmount: string;
    unitPrice: string;
    premiumPercent: string;
    premiumMinPercent: string;
    premiumMaxPercent: string;
    depositPercent: string;
    monthlyWaitingRatePercent: string;
    principalAmount: string;
    premiumAmount: string;
    totalConsideration: string;
    depositAmount: string;
    monthlyPrincipalTokens: string;
    firstPrincipalAmount: string;
    firstWaitingPremiumAmount: string;
    firstMonthlyPayment: string;
  };
};

export const getAssetStatus = async (assetId: string): Promise<AssetStatus> => {
  if (isServer) {
    return apiClient.get<AssetStatus>(ASSET_MANAGEMENT_ENDPOINTS.STATUS(assetId));
  }

  return apiClient.get<AssetStatus>(`/api/asset-management/${assetId}/status`, undefined, {
    baseUrl: CLIENT_BASE_URL,
  });
};

export type AssetActivityItem = {
  id: string;
  category: 'GOVERNANCE' | 'VALUATION' | 'CASH_FLOW' | 'LIQUIDITY';
  action: string;
  title: string;
  status: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type AssetTransactionItem = {
  id: string;
  type: 'TOKEN_TRADE';
  price: string;
  quantity: string;
  amount: string;
  currency: string;
  status: string;
  ledgerStatus: string;
  blockchainSettlementStatus: string;
  blockchainSettlementEnabled: boolean;
  txHash?: string | null;
  createdAt: string;
};

export type AssetLiquiditySnapshot = {
  assetId: string;
  symbol: string;
  currency: 'VND';
  settlementAsset: 'VND_LEDGER';
  tradingStatus: 'OPEN' | 'BUYOUT_ACTIVE' | 'PAUSED' | 'CLOSED';
  lastPrice: string;
  bestBid: string | null;
  bestAsk: string | null;
  bids: Array<{ price: string; quantity: string }>;
  asks: Array<{ price: string; quantity: string }>;
  recentTrades: Array<{
    id: string;
    price: string;
    quantity: string;
    side: 'BUY' | 'SELL' | null;
    createdAt: string;
  }>;
};

export type RentalApplicationState = {
  available: boolean;
  requiresTokenOwnership: false;
  eligibility: {
    tokenizedAt?: string | null;
    rentalEnabledUntil?: string | null;
    expectedMonthlyRentVnd?: string | null;
    expectedDepositVnd?: string | null;
    allowedPurposeSectors?: string[] | null;
  };
  application: {
    id: string;
    message?: string | null;
    desiredStartDate?: string | null;
    durationMonths?: number | null;
    proposedRentVnd?: string | null;
    proposedDepositVnd?: string | null;
    purposeSector?: string | null;
    purposeCode?: string | null;
    purposeDetails?: string | null;
    proposalId?: string | null;
    votingStartedAt?: string | null;
    votingEndsAt?: string | null;
    status:
      | 'DRAFT'
      | 'PENDING'
      | 'PENDING_VOTE'
      | 'APPROVED_PENDING_FUNDING'
      | 'APPROVED'
      | 'REJECTED'
      | 'CANCELLED';
    reviewedAt?: string | null;
    rejectionReason?: string | null;
    createdAt: string;
    updatedAt: string;
    applicant?: RentalApplicant;
    voteSummary?: {
      proposalId: string;
      status: string;
      endsAt: string;
      voterCount: number;
      yesPower: string;
      noPower: string;
      blankPower: string;
      eligiblePower: string;
    } | null;
  } | null;
};

export type RentalApplicant = {
  id: string;
  displayName?: string | null;
  username?: string | null;
  avatar?: string | null;
  kycStatus?: string;
  createdAt?: string;
};

export type RentalApplicationItem = NonNullable<RentalApplicationState['application']>;

export type ReviewRentalApplicationPayload =
  | {
      decision: 'APPROVE';
      monthlyRentVnd: string;
      depositVnd: string;
      dueDay: number;
      startDate?: string;
      contractDurationMonths?: number;
    }
  | {
      decision: 'REJECT';
      rejectionReason: string;
    };

export const getAssetTransactions = async (assetId: string): Promise<AssetTransactionItem[]> =>
  apiClient.get<AssetTransactionItem[]>(
    `/api/asset-management/${assetId}/transactions`,
    undefined,
    {
      baseUrl: CLIENT_BASE_URL,
    },
  );

export const getAssetActivity = async (assetId: string): Promise<AssetActivityItem[]> =>
  apiClient.get<AssetActivityItem[]>(`/api/asset-management/${assetId}/activity`, undefined, {
    baseUrl: CLIENT_BASE_URL,
  });

export const getBuyoutProposals = async (assetId: string): Promise<BuyoutProposal[]> => {
  if (isServer) {
    return apiClient.get<BuyoutProposal[]>(ASSET_MANAGEMENT_ENDPOINTS.BUYOUT_PROPOSALS(assetId));
  }

  return apiClient.get<BuyoutProposal[]>(
    `/api/asset-management/${assetId}/dao/buyout-proposals`,
    undefined,
    {
      baseUrl: CLIENT_BASE_URL,
    },
  );
};

export const getAssetLiquidity = async (assetId: string): Promise<AssetLiquiditySnapshot> =>
  apiClient.get<AssetLiquiditySnapshot>(`/api/asset-management/${assetId}/liquidity`, undefined, {
    baseUrl: CLIENT_BASE_URL,
  });

export const getMyRentalApplication = async (assetId: string): Promise<RentalApplicationState> =>
  apiClient.get<RentalApplicationState>(
    `/api/asset-management/${assetId}/rental-application`,
    undefined,
    { baseUrl: CLIENT_BASE_URL, skipAuth: false },
  );

export const submitRentalApplication = async (
  assetId: string,
  payload: {
    message?: string;
    desiredStartDate?: string;
    durationMonths: number;
    proposedRentVnd: string;
    proposedDepositVnd: string;
    purposeSector: string;
    purposeCode: string;
    purposeDetails?: string;
  },
) =>
  apiClient.post<{ success: boolean; application: RentalApplicationState['application'] }>(
    `/api/asset-management/${assetId}/rental-application`,
    payload,
    { baseUrl: CLIENT_BASE_URL, skipAuth: false },
  );

export const createRentalEnablementProposal = async (
  assetId: string,
  payload: {
    title?: string;
    expectedMonthlyRentVnd: string;
    expectedDepositVnd: string;
    allowedPurposeSectors: string[];
    description: string;
  },
) =>
  apiClient.post(
    `/api/asset-management/${assetId}/dao/rental-enablement-proposals`,
    payload,
    { baseUrl: CLIENT_BASE_URL, skipAuth: false },
  );

export const getRentalApplications = async (assetId: string): Promise<RentalApplicationItem[]> =>
  apiClient.get<RentalApplicationItem[]>(
    `/api/asset-management/${assetId}/rental-applications`,
    undefined,
    { baseUrl: CLIENT_BASE_URL, skipAuth: false },
  );

export const reviewRentalApplication = async (
  assetId: string,
  applicationId: string,
  payload: ReviewRentalApplicationPayload,
) =>
  apiClient.patch<{
    success: boolean;
    decision: 'APPROVED' | 'REJECTED';
    application: RentalApplicationItem;
  }>(`/api/asset-management/${assetId}/rental-applications/${applicationId}`, payload, {
    baseUrl: CLIENT_BASE_URL,
    skipAuth: false,
  });

export const getBuyoutQuote = async (
  assetId: string,
  durationMonths: number,
  premiumPercent?: number,
): Promise<BuyoutQuote> =>
  apiClient.get<BuyoutQuote>(
    `/api/asset-management/${assetId}/dao/buyout-quote?durationMonths=${durationMonths}${premiumPercent === undefined ? '' : `&premiumPercent=${premiumPercent}`}`,
    undefined,
    { baseUrl: CLIENT_BASE_URL, skipAuth: false },
  );

export const checkEligibility = async (
  assetId: string,
  accessToken?: string,
): Promise<{
  eligible: boolean;
  reasonCode?: string;
  reason?: string;
  currentHolding?: string;
  continuouslyHeldBalance?: string;
  requiredCurrentHolding?: string;
  minContinuousHolding?: string;
  holdingMonths?: number;
  ownershipPercentage?: string;
  message?: string;
}> => {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
  if (isServer) {
    return apiClient.get<{
      eligible: boolean;
      reasonCode?: string;
      reason?: string;
      currentHolding?: string;
      continuouslyHeldBalance?: string;
      requiredCurrentHolding?: string;
      minContinuousHolding?: string;
      holdingMonths?: number;
      ownershipPercentage?: string;
      message?: string;
    }>(`asset-management/${assetId}/eligibility`, undefined, { headers, skipAuth: !accessToken });
  }
  return apiClient.get<{
    eligible: boolean;
    reasonCode?: string;
    reason?: string;
    currentHolding?: string;
    continuouslyHeldBalance?: string;
    requiredCurrentHolding?: string;
    minContinuousHolding?: string;
    holdingMonths?: number;
    ownershipPercentage?: string;
    message?: string;
  }>(`/api/asset-management/${assetId}/eligibility`, undefined, {
    baseUrl: CLIENT_BASE_URL,
    skipAuth: false,
  });
};

export const createProposal = async (
  assetId: string,
  payload: {
    title: string;
    description: string;
    durationMonths: number;
    premiumPercent: number;
    revisionOfId?: string;
  },
): Promise<{ success?: boolean; proposalId?: string }> => {
  return apiClient.post<{ success?: boolean; proposalId?: string }>(
    `/api/asset-management/${assetId}/dao/buyout-proposals`,
    payload,
    {
      baseUrl: CLIENT_BASE_URL,
      skipAuth: false,
    },
  );
};

export const getContractTemplate = async (
  type: string,
): Promise<{ title: string; content: string }> => {
  return apiClient.get<{ title: string; content: string }>(
    `/api/asset-management/templates?type=${type}`,
    undefined,
    {
      baseUrl: CLIENT_BASE_URL,
      skipAuth: false,
    },
  );
};
