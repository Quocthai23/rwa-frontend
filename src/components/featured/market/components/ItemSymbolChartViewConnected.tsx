'use client';

import { useMarketSocketStore } from '@/store/marketSocketStore';
import { memo } from 'react';
import { useSymbols } from '@/hook/useSymbols';
import type { Candle } from '@/services/marketService';
import Decimal from 'decimal.js';
import ItemSymbolChartView from './ItemSymbolChartView';
import { toFiniteNumberFromNumberish } from '@/components/shared/chart/components/tradePanel/utils/tradePanelInputHelpers';
import type { DecimalValue } from '@/types/decimal';

type ItemSymbolChartViewConnectedProps = {
  readonly accessId: string;
  readonly symbol: string;
  readonly marginCurrency?: string;
  readonly profitCurrency?: string;
  readonly desc?: string;
  readonly isFavorite?: boolean;
  readonly initialAsk?: DecimalValue;
  readonly initialBid?: DecimalValue;
  readonly initialChange?: number;
  readonly initialChangePercent?: number;
  readonly digit?: number;
  readonly miniCandles?: Candle[];
  readonly isTinyPhone?: boolean;
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

function ItemSymbolChartViewConnected({
  accessId,
  symbol,
  marginCurrency,
  profitCurrency,
  desc,
  isFavorite = false,
  initialAsk = 0,
  initialBid = 0,
  digit = 2,
  miniCandles,
  isTinyPhone,
}: ItemSymbolChartViewConnectedProps) {
  useSymbols(symbol ? [symbol] : [], Boolean(symbol));
  const ask = useMarketSocketStore((s) => s.rtBySymbol[symbol]?.ask) ?? initialAsk;
  const bid = useMarketSocketStore((s) => s.rtBySymbol[symbol]?.bid) ?? initialBid;
  const change = useMarketSocketStore((s) => {
    return s.rtBySymbol[symbol]?.change;
  });
  const percentChange = useMarketSocketStore((s) => s.rtBySymbol[symbol]?.changePercent);
  const ticker = useMarketSocketStore((s) => s.rtBySymbol[symbol]);
  const takerBuyVolume24h = ticker?.takerBuyVolume24h ?? 0;
  const takerSellVolume24h = ticker?.takerSellVolume24h ?? 0;
  const takerBuyRatio24h = ticker?.takerBuyRatio24h;
  const totalVolume = takerBuyVolume24h + takerSellVolume24h;

  const buyPercent =
    takerBuyRatio24h != null
      ? Math.max(0, Math.min(100, takerBuyRatio24h))
      : totalVolume > 0
        ? (takerBuyVolume24h / totalVolume) * 100
        : 0;

  const sellPercent = 100 - buyPercent;

  const spread = calculateSpread(ask, bid, digit);

  return (
    <ItemSymbolChartView
      accessId={accessId}
      ask={ask}
      bid={bid}
      change={change}
      desc={desc}
      digit={digit}
      isFavorite={isFavorite}
      percentChange={percentChange}
      buyPercent={buyPercent}
      sellPercent={sellPercent}
      spread={Number(spread)}
      symbol={symbol}
      marginCurrency={marginCurrency}
      profitCurrency={profitCurrency}
      miniCandles={miniCandles}
      isTinyPhone={isTinyPhone}
    />
  );
}

export default memo(ItemSymbolChartViewConnected, (prev, next) => {
  return (
    prev.symbol === next.symbol &&
    prev.isFavorite === next.isFavorite &&
    prev.accessId === next.accessId &&
    prev.digit === next.digit &&
    prev.isTinyPhone === next.isTinyPhone &&
    prev.miniCandles === next.miniCandles
  );
});
