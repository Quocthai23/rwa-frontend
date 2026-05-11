import { useMemo } from 'react';
import { Decimal } from 'decimal.js';

import type { Position } from '@/types';
import type { Account } from '@/types/account';
import {
  calculateAccountBalance,
  calculateAvailableBalance,
  calculateTotalFee,
  calculateTotalMargin,
  calculateTotalUnrealizedPnL,
  getEnrichedPositionsFromInfiniteData,
} from '@/components/featured/position/utils/position.calculations';
import { useGetData } from '@/context/GetdataContext';
import { useAccountStore } from '@/store/useAccountStore';
import { useInfinitePositions } from './usePosition';
import { useRealtimeStore } from '@/store/realtimeStore';

const round2 = (val: Decimal.Value) => new Decimal(val).toDecimalPlaces(2);

export const useAccountSummaryMetrics = () => {
  const selectedAccount = useAccountStore((state) => state.selectedAccount);
  const activeAccount = selectedAccount;
  const { assets } = useGetData();
  const rtBySymbol = useRealtimeStore((s) => s.rtBySymbol);
  const { data: apiData, isLoading: isLoadingPositions } = useInfinitePositions({
    accountId: selectedAccount?.id || '',
    status: [0, 1],
  });

  const positions = useMemo(() => {
    return getEnrichedPositionsFromInfiniteData(apiData, assets);
  }, [apiData, assets]);

  const marginPositions = useMemo(() => {
    return round2(calculateTotalMargin(positions));
  }, [positions]);

  const balance = useMemo(() => {
    return round2(
      calculateAccountBalance(activeAccount?.lockedBalance, activeAccount?.availableBalance),
    );
  }, [activeAccount]);

  const currentUnrealizedPnl = useMemo(() => {
    return round2(calculateTotalUnrealizedPnL(positions, rtBySymbol));
  }, [positions, rtBySymbol]);

  const totalFee = useMemo(() => {
    return round2(calculateTotalFee(positions));
  }, [positions]);

  const equity = useMemo(() => {
    return round2(balance.plus(currentUnrealizedPnl).minus(totalFee));
  }, [balance, currentUnrealizedPnl, totalFee]);

  const marginLevel = useMemo(() => {
    return marginPositions.gt(0) ? round2(equity.div(marginPositions).times(100)) : new Decimal(0);
  }, [equity, marginPositions]);

  const availableBalance = useMemo(() => {
    return round2(calculateAvailableBalance(equity.toNumber(), marginPositions.toNumber()));
  }, [equity, marginPositions]);

  return {
    availableBalance,
    balance,
    currentUnrealizedPnl,
    equity,
    marginLevel,
    marginPositions,
    totalFee,
  };
};
