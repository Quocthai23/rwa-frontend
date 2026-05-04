'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const DEFAULT_SYMBOL = 'XAUUSD';

const TradePage = () => {
  const router = useRouter();

  useEffect(() => {
    const savedSymbol =
      typeof window !== 'undefined' ? window.localStorage.getItem('lastTradeSymbol') : null;

    const symbol = savedSymbol?.trim() || DEFAULT_SYMBOL;
    router.replace(`/trade/${encodeURIComponent(symbol)}`);
  }, [router]);

  return null;
};

export default TradePage;
