import { memo, useMemo } from 'react';

import { ToggleFavouriteAsset } from '@/components/shared/components/ToggleFavouriteAsset/ToggleFavouriteAsset';
import { Button } from '@/components/shared/atoms/button';
import { toFiniteNumberFromNumberish } from '@/components/shared/chart/components/tradePanel/utils/tradePanelInputHelpers';
import type { DecimalValue } from '@/types/decimal';

type ItemSymbolProps = {
  readonly accessId: string;
  readonly bid?: DecimalValue;
  readonly change?: number;
  readonly desc?: string;
  readonly isFavorite?: boolean;
  readonly percentChange?: number;
  readonly symbol?: string;
  readonly marginCurrency?: string;
  readonly profitCurrency?: string;
  readonly onClick?: () => void;
  readonly isSearchMode?: boolean;
  readonly digit?: number;
};

function ItemSymbol({
  accessId,
  bid = 0,
  percentChange = -1.27,
  symbol = 'XAUUSD',
  marginCurrency,
  profitCurrency,
  onClick,
  isSearchMode = false,
  digit = 2,
}: ItemSymbolProps) {
  const pair =
    marginCurrency && profitCurrency ? `${marginCurrency}/${profitCurrency}` : (symbol ?? '');

  const safeBid = useMemo(() => toFiniteNumberFromNumberish(bid), [bid]);

  const formatQuote = useMemo(() => {
    const safeDigit = Number.isFinite(digit) ? Math.min(12, Math.max(0, Math.trunc(digit))) : 2;
    return (value?: number) =>
      value != null && Number.isFinite(value) ? value.toFixed(safeDigit) : '-';
  }, [digit]);

  if (isSearchMode) {
    return (
      <Button
        asChild
        variant="white-contained"
        className="border-border flex w-full cursor-pointer flex-row items-center justify-between border-b bg-transparent py-3"
        onClick={onClick}
      >
        <div className="flex w-full items-center justify-between">
          <div className="flex w-1/3 flex-col items-start">
            <p className="text-body-large-semibold">{pair}</p>
            <p className="text-body-small-regular text-muted-foreground">{symbol}</p>
          </div>

          <div className="w-1/3 text-center">
            <p
              className={`text-body-large-medium ${
                (percentChange ?? 0) > 0
                  ? 'text-green-500'
                  : (percentChange ?? 0) < 0
                    ? 'text-red-500'
                    : 'text-neutral-500'
              }`}
            >
              {formatQuote(safeBid)}
            </p>
          </div>

          <div className="flex w-1/3 justify-end">
            <ToggleFavouriteAsset assetId={accessId} size={24} />
          </div>
        </div>
      </Button>
    );
  }

  return (
    <Button
      asChild
      variant="white-contained"
      className="border-border flex w-full cursor-pointer flex-row items-center border-b bg-transparent py-3"
      onClick={onClick}
    >
      <div>
        <div className="flex w-1/3 flex-col items-start">
          <div className="flex flex-row items-center gap-2">
            <p className="text-body-large-semibold">{pair}</p>
            <ToggleFavouriteAsset assetId={accessId} size={24} />
          </div>
          <div>
            <p className="text-body-small-regular text-muted-foreground">{symbol}</p>
          </div>
        </div>

        <div className="w-1/3 text-center">
          <p
            className={`text-body-large-medium min-w-0 truncate tabular-nums ${
              (percentChange ?? 0) > 0
                ? 'text-green-500'
                : (percentChange ?? 0) < 0
                  ? 'text-red-500'
                  : 'text-muted-foreground'
            }`}
          >
            {formatQuote(safeBid)}
          </p>
        </div>

        <div className="w-1/3 text-center">
          <p
            className={`text-body-large-medium min-w-0 truncate tabular-nums ${
              (percentChange ?? 0) > 0
                ? 'text-green-500'
                : (percentChange ?? 0) < 0
                  ? 'text-red-500'
                  : 'text-muted-foreground'
            }`}
          >
            {percentChange && percentChange > 0 ? '+' : ''}
            {percentChange.toFixed(2)}%
          </p>
        </div>
      </div>
    </Button>
  );
}

export default memo(ItemSymbol);
