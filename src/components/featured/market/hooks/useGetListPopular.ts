import { API_CHART_URL } from '@/constants/env';
import { useEffect, useState } from 'react';

type IDataPopular = {
  // "symbol": "USDJPY",
  // "symbolTradingView": "FX:USDJPY",
  // "lastPrice": 154.248,
  // "change": 1.17,
  // "changePercent": 0.76,
  // "timestamp": 1769789115,
  // "bid": 154.248,
  // "ask": 154.248,
  // "bidSize": 0,
  // "askSize": 0,
  // "updatedAt": "2026-01-30T16:05:15.996Z"
  //   "stats": {
  //       "symbol": "EURUSD",
  //       "symbolTradingView": "FX:EURUSD",
  //       "high24h": 1.19545,
  //       "low24h": 1.18462,
  //       "volume24h": 155378,
  //       "turnover24h": 184814.20076000007,
  //       "priceChange24h": -0.01227,
  //       "priceChangePercent24h": -1.03,
  //       "updatedAt": "2026-01-30T22:01:00.104Z",
  //       "highDaily": 1.19545,
  //       "lowDaily": 1.18462,
  //       "volumeDaily": 155378,
  //       "turnoverDaily": 184814.20076000007,
  //       "tradingDayStart": 1769724000,
  //       "isWeekend": false
  //     }
  ask: number;
  askSize: number;
  bid: number;
  bidSize: number;
  change: number;
  changePercent: number;
  lastPrice: number;
  stats: {
    high24h: number;
    highDaily: number;
    isWeekend: boolean;
    low24h: number;
    lowDaily: number;
    priceChange24h: number;
    priceChangePercent24h: number;
    symbol: string;
    symbolTradingView: string;
    tradingDayStart: number;
    turnover24h: number;
    turnoverDaily: number;
    updatedAt: string;
    volume24h: number;
    volumeDaily: number;
  };
  symbol: string;
  symbolTradingView: string;
  timestamp: number;
  updatedAt: string;
};

const popularListCache = new Map<string, IDataPopular[]>();
const popularListInFlight = new Map<string, Promise<IDataPopular[]>>();

const DEFAULT_KEYWORD = 'XAUUSD';

export const useGetListPopular = (keywordOverride?: string) => {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<IDataPopular[]>([]);
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [keywordDebounce, setKeywordDebounce] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setKeywordDebounce(keyword);
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [keyword]);

  useEffect(() => {
    let isMounted = true;

    const keywordUsed = keywordOverride || keywordDebounce || DEFAULT_KEYWORD;

    const cacheKey = JSON.stringify({ limit, page, keyword: keywordUsed });

    const cached = popularListCache.get(cacheKey);
    if (cached) {
      setData(cached);
      setIsLoading(false);
      return;
    }

    const inFlight = popularListInFlight.get(cacheKey);
    if (inFlight) {
      setIsLoading(true);
      inFlight
        .then((results) => {
          if (!isMounted) return;
          setData(results);
        })
        .finally(() => {
          if (!isMounted) return;
          setIsLoading(false);
        });
      return;
    }

    setIsLoading(true);
    const promise = (async () => {
      const res = await fetch(
        `${API_CHART_URL}/api/v1/market/tickers?limit=${limit}&page=${page}&keyword=${keywordUsed}`,
      );
      const json = await res?.json();
      return (json?.data || []) as IDataPopular[];
    })();

    popularListInFlight.set(cacheKey, promise);

    promise
      .then((results) => {
        if (!isMounted) return;
        popularListCache.set(cacheKey, results);
        setData(results);
      })
      .catch((error) => {
        console.error('Error fetching popular symbols:', error);
      })
      .finally(() => {
        popularListInFlight.delete(cacheKey);
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [limit, page, keywordOverride, keywordDebounce]);

  return {
    isLoading,
    keyword,
    listPopular: data,
    page,
    setKeyword,
    setLimit,
    setPage,
  };
};
