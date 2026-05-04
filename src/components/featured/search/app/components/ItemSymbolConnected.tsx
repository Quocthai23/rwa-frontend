import { memo } from 'react';

import { useMarketSocketStore } from '@/store/marketSocketStore';
import type { DecimalValue } from '@/types/decimal';
import ItemSymbol from './ItemSymbol';
import { useSymbols } from '@/hook/useSymbols';

type ItemSymbolConnectedProps = {
  readonly isFavorite?: boolean;
  readonly accessId: string;
  readonly symbol: string;
  readonly marginCurrency?: string;
  readonly profitCurrency?: string;
  readonly desc?: string;
  readonly initialBid?: DecimalValue;
  readonly initialChange?: number;
  readonly initialChangePercent?: number;
  readonly onClick?: () => void;
  readonly isSearchMode?: boolean;
  readonly digit?: number;
};

function ItemSymbolConnected({
  accessId,
  symbol,
  marginCurrency,
  profitCurrency,
  desc,
  initialBid = 0,
  initialChange = 0,
  initialChangePercent = 0,
  onClick,
  isSearchMode = false,
  digit = 2,
}: ItemSymbolConnectedProps) {
  useSymbols(symbol ? [symbol] : [], Boolean(symbol));

  const rtBid = useMarketSocketStore((s) => s.rtBySymbol?.[symbol]?.bid);
  const rtChange = useMarketSocketStore((s) => s.rtBySymbol?.[symbol]?.change);
  const rtChangePercent = useMarketSocketStore((s) => s.rtBySymbol?.[symbol]?.changePercent);

  const bid = rtBid ?? initialBid;
  const change = rtChange ?? initialChange;
  const percentChange = rtChangePercent ?? initialChangePercent;

  return (
    <ItemSymbol
      accessId={accessId}
      bid={bid}
      change={change}
      desc={desc}
      percentChange={percentChange}
      symbol={symbol}
      marginCurrency={marginCurrency}
      profitCurrency={profitCurrency}
      onClick={onClick}
      isSearchMode={isSearchMode}
      digit={digit}
    />
  );
}

export default memo(ItemSymbolConnected, (prev, next) => {
  return (
    prev.symbol === next.symbol &&
    prev.isFavorite === next.isFavorite &&
    prev.accessId === next.accessId &&
    prev.isSearchMode === next.isSearchMode
  );
});
