export interface MarketTabVM {
  id: string;
  label: string;
}

export interface MarketRowVM {
  id: string;
  symbol: string;
  name: string;
  categoryCode: string;
  categoryName: string;
  propertyType?: string;
  location?: string;
  expectedApy?: number;
  buyoutPremiumPercent?: number;
  buyoutMonthlyWaitingRatePercent?: number;
  buyoutMonthsRemaining?: number;
  buyoutTotalMonths?: number;
  buyoutMonthsCompleted?: number;
  buyoutPrincipalUnitPrice?: number;
  buyoutRedemptionUnitPrice?: number;
  buyoutInitialMinorityTokens?: number;
  buyoutRemainingMinorityTokens?: number;
  buyoutTotalConsiderationVnd?: number;
  buyoutPrincipalPaidVnd?: number;
  buyoutPremiumPaidVnd?: number;
  buyoutNextPaymentVnd?: number;
  buyoutNextRecordAt?: string;
  buyoutBuyerGuestNumber?: number;
  rentalStatus?: 'LOCKED' | 'OPEN' | 'VOTING' | 'PENDING_FUNDING' | 'RENTED';
  monthlyRentVnd?: number;
  rentalDueDay?: number;
  latestRentalPeriod?: string;
  askText: string;
  bidText: string;
  spreadText: string;
  digit: number;
  askValue: number;
  bidValue: number;
  lastPriceValue: number;
  referencePriceValue: number;
  initialHigh: number;
  initialLow: number;
  spreadValue: number;
  isActive: boolean;
  tradingStatus: 'OPEN' | 'BUYOUT_ACTIVE' | 'PAUSED' | 'CLOSED';
  isFavorite: boolean;
  statusColor?: 'WHITE' | 'GREEN' | 'YELLOW';
}

export interface GetRowsOptions {
  marketOpenOnly?: boolean;
  search?: string;
}
