import * as React from 'react';

import { useRealtimeStore } from '@/store/realtimeStore';

export type SymbolSubscription = string | { symbol: string; id: string };

export function useSymbols(symbols: SymbolSubscription[], enabled: boolean) {
  const connect = useRealtimeStore((s) => s.connect);
  const subscribeSymbol = useRealtimeStore((s) => s.subscribeSymbol);
  const unsubscribeSymbol = useRealtimeStore((s) => s.unsubscribeSymbol);

  const stableItems = React.useMemo(() => {
    return symbols
      .map((item) => (typeof item === 'string' ? { symbol: item, id: '' } : item))
      .filter((item) => Boolean(item.symbol))
      .sort((a, b) => a.symbol.localeCompare(b.symbol));
  }, [symbols]);

  const itemsKey = React.useMemo(() => {
    return stableItems.map((i) => `${i.symbol}:${i.id}`).join('|');
  }, [stableItems]);

  React.useEffect(() => {
    if (!enabled || stableItems.length === 0) return;
    connect();
    stableItems.forEach((item) => subscribeSymbol(item.symbol, item.id || undefined));

    return () => {
      stableItems.forEach((item) => unsubscribeSymbol(item.symbol, item.id || undefined));
    };
  }, [connect, enabled, subscribeSymbol, unsubscribeSymbol, itemsKey, stableItems]);
}
