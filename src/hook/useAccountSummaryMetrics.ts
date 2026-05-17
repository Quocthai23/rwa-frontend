import { useMemo } from 'react';
import { Decimal } from 'decimal.js';

import { useAccountStore } from '@/store/useAccountStore';

const round2 = (val: Decimal.Value) => new Decimal(val).toDecimalPlaces(2);

/**
 * useAccountSummaryMetrics
 *
 * For Spot trading there are no open "positions" or margin requirements.
 * Balance metrics are read directly from the account object returned by the backend.
 *
 * - balance          = lockedBalance + availableBalance  (total deposited)
 * - availableBalance = account.availableBalance          (free to trade)
 * - equity           = balance  (no unrealised PnL in Spot; gains come from sold assets)
 * - marginPositions  = 0  (Spot has no margin/leverage)
 * - marginLevel      = 0
 * - currentUnrealizedPnl = 0 (handled via portfolio value change, not positions)
 * - totalFee         = 0 (fees are deducted from balance server-side)
 */
export const useAccountSummaryMetrics = () => {
  const selectedAccount = useAccountStore((state) => state.selectedAccount);

  const balance = useMemo(() => {
    const locked = Number(selectedAccount?.lockedBalance ?? 0);
    const available = Number(selectedAccount?.availableBalance ?? 0);
    return round2(locked + available);
  }, [selectedAccount?.lockedBalance, selectedAccount?.availableBalance]);

  const availableBalance = useMemo(() => {
    return round2(Number(selectedAccount?.availableBalance ?? 0));
  }, [selectedAccount?.availableBalance]);

  // In Spot trading, equity equals the account balance (no leveraged positions)
  const equity = balance;

  // No open margin positions in Spot
  const marginPositions = useMemo(() => new Decimal(0), []);

  // No unrealised PnL from open positions (portfolio P&L is in PortfolioTabContent)
  const currentUnrealizedPnl = useMemo(() => new Decimal(0), []);

  // No swap/fee outstanding
  const totalFee = useMemo(() => new Decimal(0), []);

  // Margin level not applicable for Spot
  const marginLevel = useMemo(() => new Decimal(0), []);

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
