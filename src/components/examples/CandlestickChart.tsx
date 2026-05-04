/**
 * Example: Candlestick Chart Component
 * 
 * Uses TradingView chart (ChartCommon) to match the main trading interface
 * - assetId: optional UUID (preferred)
 * - symbol: asset symbol (fallback if no assetId)
 * - timeframe: in seconds (default 3600 = 1h)
 * 
 * Integrates with:
 * 1. klineSocketStore - real-time candle updates
 * 2. marketSocketStore - bid/ask prices  
 * 3. GET /market-data/candles - historical data
 * 
 * @example
 * <CandlestickChart assetId="...uuid..." symbol="BTC/USD" timeframe={3600} />
 */

'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

const ChartCommon = dynamic(() => import('@/components/shared/chart/ChartCommon'), {
  loading: () => <div className="h-96 bg-muted flex items-center justify-center">Loading chart...</div>,
  ssr: false,
});

interface CandlestickChartProps {
  assetId?: string;
  symbol: string;
  timeframe?: number; // seconds (default: 3600 = 1h)
}

/**
 * Candlestick chart using TradingView charting library
 * Consistent with other trading pages in the application
 * 
 * @example
 * <CandlestickChart assetId="...uuid..." symbol="BTC/USD" timeframe={3600} />
 */
export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  assetId,
  symbol,
  timeframe = 3600,
}) => {
  const [currentSymbol, setCurrentSymbol] = useState(symbol);

  return (
    <div className="w-full h-full">
      <ChartCommon
        symbol={currentSymbol}
        setSymbol={setCurrentSymbol}
        isChartMini={false}
        isTradeScreen={false}
      />
    </div>
  );
};
