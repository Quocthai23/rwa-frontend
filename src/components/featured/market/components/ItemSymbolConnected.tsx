import { useMarketSocketStore } from '@/store/marketSocketStore';
import { useSymbols } from '@/hook/useSymbols';
import { memo } from 'react';
import Decimal from 'decimal.js';
import ItemSymbol from './ItemSymbol';
import { toFiniteNumberFromNumberish } from '@/components/shared/chart/components/tradePanel/utils/tradePanelInputHelpers';
import type { DecimalValue } from '@/types/decimal';

type ItemSymbolConnectedProps = {
  readonly accessId: string;
  readonly symbol: string;
  readonly marginCurrency?: string;
  readonly profitCurrency?: string;
  readonly desc?: string;
  readonly isFavorite?: boolean;
  readonly initialAsk?: DecimalValue;
  readonly initialBid?: DecimalValue;
  readonly digit?: number;
  readonly initialChange?: number;
  readonly initialChangePercent?: number;
  readonly initialHigh?: DecimalValue;
  readonly initialLow?: DecimalValue;
};

function calculateSpread(
  ask: DecimalValue | undefined,
  bid: DecimalValue | undefined,
  digit: number,
) {
  const safeAsk = toFiniteNumberFromNumberish(ask);
  const safeBid = toFiniteNumberFromNumberish(bid);
  if (safeAsk == null || safeBid == null) return 0;

  const factor = new Decimal(10).pow(digit);
  const askTicks = new Decimal(safeAsk).mul(factor).round();
  const bidTicks = new Decimal(safeBid).mul(factor).round();
  return askTicks.sub(bidTicks).abs().toNumber();
}

function ItemSymbolConnected({
  accessId,
  symbol,
  marginCurrency,
  profitCurrency,
  desc,
  digit = 2,
  isFavorite = false,
  initialAsk = 0,
  initialBid = 0,
  initialChange = 0,
  initialChangePercent = 0,
  initialHigh = 0,
  initialLow = 0,
}: ItemSymbolConnectedProps) {
  useSymbols(symbol ? [symbol] : [], Boolean(symbol));
  const ask = useMarketSocketStore((s) => s.rtBySymbol?.[symbol]?.ask) ?? initialAsk;
  const bid = useMarketSocketStore((s) => s.rtBySymbol?.[symbol]?.bid) ?? initialBid;
  const change = useMarketSocketStore((s) => s.rtBySymbol?.[symbol]?.change) ?? initialChange;
  const percentChange =
    useMarketSocketStore((s) => s.rtBySymbol?.[symbol]?.changePercent) ?? initialChangePercent;
  const high =
    useMarketSocketStore((s) => s.rtBySymbol?.[symbol]?.sessionStats?.high) ?? initialHigh;
  const low =
    useMarketSocketStore((s) => {
      return s.rtBySymbol?.[symbol]?.sessionStats?.low;
    }) ?? initialLow;

  const spread = calculateSpread(ask, bid, digit);

  return (
    <ItemSymbol
      accessId={accessId}
      ask={ask}
      bid={bid}
      change={change}
      desc={desc}
      high={high}
      isFavorite={isFavorite}
      low={low}
      digit={digit}
      percentChange={percentChange}
      spread={Number(spread)}
      symbol={symbol}
      marginCurrency={marginCurrency}
      profitCurrency={profitCurrency}
    />
  );
}

export default memo(ItemSymbolConnected, (prev, next) => {
  return (
    prev.symbol === next.symbol &&
    prev.isFavorite === next.isFavorite &&
    prev.accessId === next.accessId
  );
});
