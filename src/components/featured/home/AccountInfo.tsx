import { Eye, EyeOff } from '@untitledui/icons';
import { memo, useEffect, useMemo, useState } from 'react';
import { ACCOUNT_TYPES_ID } from '@/constants/account';
import { useAccountStore } from '@/store/useAccountStore';
import { useTheme } from '@/theme';
import { formatBalance } from '@/utils/currency';
import { useAccountBalance } from '@/hook/useAccountBalance';
import { Button } from '@/components/shared/atoms/button';
import DonutChart from './DonutChart';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hook/useToast';
import DepositFlowSheet from '@/components/featured/deposit/DepositFlowSheet';
import { useTranslation } from 'react-i18next';
import { useAccounts } from '@/hook/useAccount';
import { useGetData } from '@/context/GetdataContext';
type PortfolioItem = {
  color: string;
  name: string;
  value: number;
};

const CHART_COLORS = ['#F78A8F', '#F69E66', '#FCC573', '#C5E866', '#6BD096', '#6B7AD0'];

const AccountInfo = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [isDepositSheetOpen, setIsDepositSheetOpen] = useState(false);

  const selectedAccount = useAccountStore((state) => state.selectedAccount);
  const { assets } = useGetData();
  const { dataUpdatedAt } = useAccounts();
  const { data: balanceData, refetch: refetchBalance } = useAccountBalance(
    selectedAccount?.id || '',
  );
  useEffect(() => {
    if (selectedAccount?.id) {
      void refetchBalance();
    }
  }, [selectedAccount?.id, dataUpdatedAt, refetchBalance]);
  const router = useRouter();
  const { showError } = useToast();

  const notSymbol = balanceData?.currentBalance === '0' || !balanceData?.currentBalance;
  const currentBalanceNumber = parseFloat(balanceData?.currentBalance || '0');
  const pnlNumber = parseFloat(balanceData?.pnl || '0');
  const yesterdayBalanceNumber = currentBalanceNumber - pnlNumber;
  const pnlPercent = yesterdayBalanceNumber !== 0 ? (pnlNumber / yesterdayBalanceNumber) * 100 : 0;

  const handleTransfer = () => {
    if (selectedAccount?.accountTypeId === ACCOUNT_TYPES_ID.DEMO) {
      showError(t('home.transferFailedTitle'), t('home.transferDemoError'));
      return;
    }
    router.push('/transfer');
  };

  const portfolioData: PortfolioItem[] = useMemo(() => {
    // Use positionLots from balanceData instead of openPositions
    const positions = balanceData?.positionLots || [];
    if (positions.length === 0) return [];

    const symbolCurrencyMap = new Map(
      (assets || []).map((asset) => [asset.symbol, asset] as const),
    );

    const sortedPositions = positions
      .map((item) => ({
        symbol: item.symbol,
        quantity: Number(item.quantity),
      }))
      .sort((a, b) => b.quantity - a.quantity);

    if (sortedPositions.length <= 6) {
      return sortedPositions.map((item, index) => ({
        color: CHART_COLORS[index],
        name:
          symbolCurrencyMap.get(item.symbol)?.marginCurrency &&
          symbolCurrencyMap.get(item.symbol)?.profitCurrency
            ? `${symbolCurrencyMap.get(item.symbol)?.marginCurrency}/${symbolCurrencyMap.get(item.symbol)?.profitCurrency}`
            : item.symbol,
        value: item.quantity,
      }));
    }

    const top5 = sortedPositions.slice(0, 5).map((item, index) => ({
      color: CHART_COLORS[index],
      name:
        symbolCurrencyMap.get(item.symbol)?.marginCurrency &&
        symbolCurrencyMap.get(item.symbol)?.profitCurrency
          ? `${symbolCurrencyMap.get(item.symbol)?.marginCurrency}/${symbolCurrencyMap.get(item.symbol)?.profitCurrency}`
          : item.symbol,
      value: item.quantity,
    }));

    const othersTotal = sortedPositions.slice(5).reduce((sum, item) => sum + item.quantity, 0);

    return [...top5, { color: CHART_COLORS[5], name: 'Others', value: othersTotal }];
  }, [assets, balanceData]);

  const totalLots = useMemo(() => {
    return portfolioData.reduce((sum, item) => sum + item.value, 0);
  }, [portfolioData]);
  const handleShowDepositMethod = () => {
    if (selectedAccount?.accountTypeId == ACCOUNT_TYPES_ID.DEMO) {
      router.push('/top-up');
      return;
    }
    setIsDepositSheetOpen(true);
  };

  if (notSymbol) {
    return (
      <div className="p-4">
        <DepositFlowSheet isOpen={isDepositSheetOpen} onOpenChange={setIsDepositSheetOpen} />
        <div className="bg-card flex flex-col gap-1 rounded p-4">
          <div className="flex items-center gap-1">
            <span className="text-body-large-medium text-muted-foreground">
              {t('home.totalAsset')}
            </span>

            <button onClick={() => setIsBalanceVisible(!isBalanceVisible)}>
              {isBalanceVisible ? (
                <Eye size={24} color={colors.textNeutralSecondary} />
              ) : (
                <EyeOff size={24} color={colors.textNeutralSecondary} />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-h1-semibold text-foreground">
              {isBalanceVisible ? `$${formatBalance(balanceData?.currentBalance || '0')}` : '****'}
            </span>
          </div>
          <Button onClick={handleShowDepositMethod} className="text-button-large-medium mt-2 py-2">
            {t('home.deposit')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <DepositFlowSheet isOpen={isDepositSheetOpen} onOpenChange={setIsDepositSheetOpen} />
      <div className="border-border bg-card flex flex-col gap-3 rounded p-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1">
            <span className="text-body-large-medium text-muted-foreground">
              {t('home.totalAsset')}
            </span>
            <button onClick={() => setIsBalanceVisible(!isBalanceVisible)}>
              {isBalanceVisible ? (
                <Eye size={24} color={colors.textNeutralSecondary} />
              ) : (
                <EyeOff size={24} color={colors.textNeutralSecondary} />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-h1-semibold text-foreground">
              {isBalanceVisible ? `$${formatBalance(balanceData?.currentBalance || '0')}` : '****'}
            </span>

            {isBalanceVisible && (
              <span
                style={{
                  color: pnlNumber >= 0 ? colors.green500 : colors.red500,
                }}
              >
                ${formatBalance(balanceData?.pnl || '0')} ({formatBalance(pnlPercent)}%)
              </span>
            )}
          </div>
        </div>
        {balanceData.positionLots && balanceData.positionLots.length > 0 && (
          <div className="flex items-center justify-between gap-3">
            <DonutChart
              backgroundColor="var(--card)"
              gapDeg={4}
              segments={portfolioData.map((item) => ({
                value: item.value,
                color: item.color,
              }))}
              size={120}
              thickness={12}
              unitText="Lots"
              valueText={totalLots.toFixed(2)}
            />
            <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-2">
              {portfolioData.map((item, i) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="h-4 w-4 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-caption-medium text-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            className="text-button-large-medium text-primary-500 border-primary-500 flex-1 rounded border py-2"
            // variant='primary-ghost'
            onClick={handleTransfer}
          >
            {t('home.transfer')}
          </button>

          <Button className="text-button-large-medium flex-1" onClick={() => router.push('/trade')}>
            {t('home.trade')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default memo(AccountInfo);
