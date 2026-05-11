import * as React from 'react';

import { useRealtimeStore } from '@/store/realtimeStore';

export function useSymbols(symbols: string[], enabled: boolean) {
  const connect = useRealtimeStore((s) => s.connect);
  const subscribeSymbol = useRealtimeStore((s) => s.subscribeSymbol);
  const unsubscribeSymbol = useRealtimeStore((s) => s.unsubscribeSymbol);

  // Stabilize based on symbol *content* (not the array identity).
  // This prevents effect thrashing when callers pass `[symbol]` as a new array each render.
  const symbolsKey = [...new Set(symbols)].filter(Boolean).sort().join('|');

  const stableSymbols = React.useMemo(
    () => (symbolsKey ? symbolsKey.split('|').filter(Boolean) : []),
    [symbolsKey],
  );

  React.useEffect(() => {
    if (!enabled) return;
    connect();
    stableSymbols.forEach((symbol) => subscribeSymbol(symbol));

    return () => {
      stableSymbols.forEach((symbol) => unsubscribeSymbol(symbol));
    };
  }, [connect, enabled, subscribeSymbol, unsubscribeSymbol, stableSymbols]);
}
