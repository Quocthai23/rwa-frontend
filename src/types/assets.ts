/**
 * Trading Asset Types
 */

export type Category = {
  code: string;
  description: string;
  id: string;
  marginMultiplier: string;
  name: string;
};

export type CategoriesResponse = {
  data: Category[];
};

export type SwapRates = {
  [day: number]: number;
};

export type Asset = {
  ask: string;
  bid: string;
  category: {
    // "code": "FOREX",
    // "name": "Forex",
    // "description": "Foreign exchange currency pairs",
    // "marginMultiplier": "1"
    code: string;
    description: string;
    marginMultiplier: string;
    name: string;
  };
  categoryId: string;
  chartMode: number;
  contractSize: string;
  createdAt: string;
  digit: number;
  id: string;
  isActive: boolean;
  isFavorite?: boolean;
  isHot?: boolean;
  marginCurrency: string;
  marginMultiplier: string;
  maxLeverage?: string | number;
  maxTradeSize: string;
  minTradeSize: string;
  name: string;
  profitCurrency: string;
  spread: string;
  symbol: string;
  updatedAt: string;
  volumeStep?: string;
  pipSize?: string;
  logo?: string;
  swapLong?: string;
  swapShort?: string;
  swapRates?: SwapRates;
  location?: string;
  totalArea?: number;
  zoning?: string;
  businessModel?: string;
  monthlyBenefits?: string;
  propertyType?: string;
  developer?: string;
  description?: string;
  tenantName?: string;
  yearBuilt?: number;
  legalStatus?: string;
  handoverCondition?: string;
  projectScale?: string;
  operatingCompany?: string;
  maintenanceFee?: number | string;
  contractDuration?: number;
  gallery?: string | string[];
  amenities?: string | string[];
  titleDeedImage?: string;
  images?: Array<{
    id?: string;
    isPrimary?: boolean;
    url: string;
  }>;
  statusColor?: 'WHITE' | 'GREEN' | 'YELLOW';
  tokenPrice?: number;
  expectedApy?: number;
  referencePrice?: string;
  priceBandPercentage?: string;
  priceTick?: string;
  minOrderValue?: string;
  maxOrderValue?: string;
  maxMarketSlippage?: string;
  buyoutMinHolding?: string;
  buyoutHoldingMonths?: number;
  buyoutOwnershipThreshold?: string;
  buyoutMinorityQuorum?: string;
  buyoutApprovalThreshold?: string;
  buyoutBasePremium?: string;
  buyoutAnnualPremium?: string;
  buyoutDepositPercentage?: string;
  buyoutMinDurationMonths?: number;
  buyoutMaxDurationMonths?: number;
  totalSupply?: string;
  tradingStatus?: 'OPEN' | 'BUYOUT_ACTIVE' | 'PAUSED' | 'CLOSED';
  buyoutSummary?: {
    status: string;
    totalMonths: number;
    monthsCompleted: number;
    premiumPercent: string | number;
    monthlyWaitingRatePercent?: string | number | null;
    nextRecordAt?: string | null;
    principalUnitPrice?: string | number | null;
    redemptionUnitPrice?: string | number | null;
    initialMinorityTokens?: string | number | null;
    remainingMinorityTokens?: string | number | null;
    totalConsiderationVnd?: string | number | null;
    principalPaidVnd?: string | number | null;
    premiumPaidVnd?: string | number | null;
    activatedAt?: string | null;
    buyerGuestNumber?: number;
    viewerIsBuyer?: boolean;
    nextInstallment?: {
      installmentNumber: number;
      paymentAmount: string | number;
      principalAmount: string | number;
      waitingPremiumAmount: string | number;
      recordAt: string;
      status: string;
    } | null;
  } | null;
  issuerId?: string;
  auditReportUrl?: string;
  legalDocsIpfs?: string;
  rentalSummary?: {
    status: 'RENTED' | 'AVAILABLE';
    monthlyRentVnd?: string | number | null;
    currency: 'VND' | string;
    dueDay?: number | null;
    startDate?: string | null;
    endDate?: string | null;
    lastPaidAt?: string | null;
    latestDistribution?: {
      id: string;
      periodStart?: string | null;
      periodEnd?: string | null;
      totalAmount: string | number;
      allocatedAmount: string | number;
      status: string;
    } | null;
  };
};

export type AssetMarketData = {
  sellPrice?: number;
  buyPrice?: number;
  spread?: number;
  volume?: number;
  sellPercent?: number;
  buyPercent?: number;
  chgPercent?: number;
  low?: number;
  lastUpdated?: string;
  source?: string;
};

export type ToggleFavoriteAssetRequest = {
  assetId: string;
};

export type ToggleFavoriteAssetResponse = {
  isFavorite: boolean;
};

export type AssetItem = Asset;

export type AssetsResponse = {
  data: Asset[];
  total: number;
};

export type GetAssetsParams = {
  categoryCode?: string;
  search?: string; // debounced search
  skip?: number; // default 0
  take?: number; // default 20
};

export type GetAssetsResponse = AssetsResponse;
