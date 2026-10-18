'use client';

import { memo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import MT5PriceText from '@/components/featured/market/components/MT5PriceText';
import { ToggleFavouriteAsset } from '@/components/shared/components/ToggleFavouriteAsset';
import { useTheme } from '@/theme';
import { toFiniteNumberFromNumberish } from '@/components/shared/chart/components/tradePanel/utils/tradePanelInputHelpers';
import type { DecimalValue } from '@/types/decimal';

type ItemSymbolProps = {
  readonly accessId: string;
  readonly ask?: DecimalValue;
  readonly bid?: DecimalValue;
  readonly change?: number;
  readonly desc?: string;
  readonly high?: DecimalValue;
  readonly isFavorite?: boolean;
  readonly low?: DecimalValue;
  readonly percentChange?: number;
  readonly spread: number;
  readonly symbol?: string;
  readonly marginCurrency?: string;
  readonly profitCurrency?: string;
  readonly digit?: number;
};

function ItemSymbol({
  accessId,
  ask = 0,
  bid = 0,
  change = -0.06,
  high = 0,
  low = 0,
  percentChange = -1.27,
  spread,
  symbol = 'XAUUSD',
  marginCurrency,
  profitCurrency,
  digit = 2,
}: ItemSymbolProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const isPositive = change >= 0;
  const lowValue = toFiniteNumberFromNumberish(low) ?? 0;
  const highValue = toFiniteNumberFromNumberish(high) ?? 0;
  const pair =
    marginCurrency && profitCurrency ? `${marginCurrency}/${profitCurrency}` : (symbol ?? '');

  return (
    <div
      role="button"
      tabIndex={0}
      className="flex items-center gap-2 border-t border-neutral-200 py-1 dark:border-neutral-800"
      onClick={() => {
        router.push(`/market/${encodeURIComponent(symbol)}`);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          router.push(`/market/${encodeURIComponent(symbol)}`);
        }
      }}
    >
      <div className="flex w-[48%] flex-col text-left">
        <div className="flex items-center gap-1">
          <span className="text-body-large-semibold">{pair}</span>
          <ToggleFavouriteAsset assetId={accessId} size={20} />
        </div>
        <span className="text-body-small-regular text-muted-foreground">
          {t('market.spread')}: {spread}
        </span>
        <span
          className={`text-body-small-regular ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}
        >
          {change > 0 ? '+' : ''}
          {change}( {percentChange > 0 ? '+' : ''}
          {percentChange}%)
        </span>
      </div>

      <div className="flex flex-1 gap-2">
        <div className="flex w-1/2 flex-col items-end gap-2 text-right">
          <MT5PriceText
            fixedDecimals={digit}
            style={{ color: isPositive ? colors.textSuccessDefault : colors.textErrorDefault }}
            value={bid}
          />
          <span className="text-body-small-regular text-muted-foreground">L: {lowValue}</span>
        </div>
        <div className="flex w-1/2 flex-col items-end gap-2 text-right">
          <MT5PriceText
            fixedDecimals={digit}
            style={{ color: isPositive ? colors.textSuccessDefault : colors.textErrorDefault }}
            value={ask}
          />
          <span className="text-body-small-regular text-muted-foreground">H: {highValue}</span>
        </div>
      </div>
    </div>
  );
}

export default memo(ItemSymbol);

