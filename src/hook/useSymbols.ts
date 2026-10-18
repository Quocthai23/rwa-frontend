import * as React from 'react';

import { useRealtimeStore } from '@/store/realtimeStore';

export type SymbolSubscription = string | { symbol: string; id: string };

export function useSymbols(symbols: SymbolSubscription[], enabled: boolean) {
  const connect = useRealtimeStore((s) => s.connect);
  const subscribeSymbol = useRealtimeStore((s) => s.subscribeSymbol);
  const unsubscribeSymbol = useRealtimeStore((s) => s.unsubscribeSymbol);

  // Callers commonly build this array inline. Canonicalize by value so an
  // equivalent array does not tear down and recreate subscriptions on every
  // render (the teardown itself updates Zustand and can otherwise loop).
  const itemsKey = JSON.stringify(
    symbols
      .map((item) => (typeof item === 'string' ? { symbol: item, id: '' } : item))
      .filter((item) => Boolean(item.symbol))
      .sort((a, b) => a.symbol.localeCompare(b.symbol) || a.id.localeCompare(b.id)),
  );

  const stableItems = React.useMemo(
    () => JSON.parse(itemsKey) as Array<{ symbol: string; id: string }>,
    [itemsKey],
  );

  React.useEffect(() => {
    if (!enabled || stableItems.length === 0) return;
    connect();
    stableItems.forEach((item) => subscribeSymbol(item.symbol, item.id || undefined));

    return () => {
      stableItems.forEach((item) => unsubscribeSymbol(item.symbol, item.id || undefined));
    };
  }, [connect, enabled, subscribeSymbol, unsubscribeSymbol, itemsKey, stableItems]);
}
