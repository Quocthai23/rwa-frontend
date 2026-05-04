import * as React from 'react';

import { useMarketSocketStore } from '../store/marketSocketStore';

export function useSymbols(symbols: string[], enabled: boolean) {
  const connect = useMarketSocketStore((s) => s.connect);
  const subscribeSymbols = useMarketSocketStore((s) => s.subscribeSymbols);
  const unsubscribeSymbols = useMarketSocketStore((s) => s.unsubscribeSymbols);

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
    subscribeSymbols(stableSymbols);

    return () => {
      unsubscribeSymbols(stableSymbols);
    };
  }, [connect, enabled, subscribeSymbols, unsubscribeSymbols, stableSymbols]);
}
