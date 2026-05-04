'use client';

import { useMemo, useState } from 'react';
import { CandlestickChart } from '@/components/examples/CandlestickChart';
import { TradingDashboard } from '@/components/examples/TradingDashboardNew';
import { useGetData } from '@/context/GetdataContext';
import { useAccountStore } from '@/store/useAccountStore';
import SplashLogo from '@/components/shared/SplashLogo';

const TIMEFRAMES = [
  { label: '1m', value: 60 },
  { label: '5m', value: 300 },
  { label: '15m', value: 900 },
  { label: '1h', value: 3600 },
  { label: '4h', value: 14400 },
  { label: '1d', value: 86400 },
];

export default function TradingDashboardPage() {
  const { assets, isLoadingAssets } = useGetData();
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState(3600);
  const selectedAccount = useAccountStore((s) => s.selectedAccount);

  const selectedAsset = useMemo(
    () => assets?.find((asset) => asset.id === selectedAssetId) ?? assets?.[0],
    [assets, selectedAssetId],
  );

  if (!selectedAccount || isLoadingAssets) {
    return <SplashLogo size={300} />;
  }

  if (!selectedAsset) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground">No assets available</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Real-Time Trading Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-1">
                2-namespace WebSocket: Candlesticks + Trading Events
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">
                {selectedAccount.name || 'Trading Account'}
              </p>
              <p className="text-xs text-muted-foreground">{selectedAccount.id}</p>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-4 flex flex-wrap gap-4">
            {/* Symbol Selector */}
            <div>
              <label className="block text-xs font-semibold mb-2">Asset</label>
              <select
                value={selectedAsset.id}
                onChange={(e) => setSelectedAssetId(e.target.value)}
                className="px-3 py-2 bg-muted border border-border rounded text-sm"
              >
                {assets?.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.symbol} - {asset.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Timeframe Selector */}
            <div>
              <label className="block text-xs font-semibold mb-2">Timeframe</label>
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(Number(e.target.value))}
                className="px-3 py-2 bg-muted border border-border rounded text-sm"
              >
                {TIMEFRAMES.map(({ label, value }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Info */}
            <div className="ml-auto flex items-end gap-2">
              <div className="text-xs">
                <p className="text-muted-foreground">
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  2 WebSocket Connections Active
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Candlestick Chart Section */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Candlestick Chart</h2>
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                Namespace: / (default)
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Real-time candlestick data via kline WebSocket events
            </p>
            <div className="border border-border rounded-lg overflow-hidden">
              <CandlestickChart
                assetId={selectedAsset.id}
                symbol={selectedAsset.symbol}
                timeframe={selectedTimeframe}
              />
            </div>
          </section>

          {/* Trading Dashboard Section */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Trading Events</h2>
              <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                Namespace: /trading
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Real-time trades, prices, and order matches from the trading gateway
            </p>
            <div className="border border-border rounded-lg overflow-hidden">
              <TradingDashboard
                symbol={selectedAsset.symbol}
                accountId={selectedAccount.id}
              />
            </div>
          </section>

          {/* Architecture Info */}
          <section className="bg-muted p-4 rounded-lg border border-border">
            <h3 className="font-semibold mb-3">Architecture Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold text-blue-600 mb-2">📊 Candlestick Flow</p>
                <ol className="space-y-1 text-xs text-muted-foreground">
                  <li>1. Backend: OrderMatching matches orders</li>
                  <li>2. Backend: MarketData emits kline → / namespace</li>
                  <li>3. FE: klineSocketStore receives kline event</li>
                  <li>4. FE: CandlestickChart updates in real-time</li>
                </ol>
              </div>
              <div>
                <p className="font-semibold text-purple-600 mb-2">🔄 Trading Flow</p>
                <ol className="space-y-1 text-xs text-muted-foreground">
                  <li>1. Backend: OrderMatching emits ORDER_MATCHED</li>
                  <li>2. Backend: TradingEventsListener catches event</li>
                  <li>3. Backend: RealtimeGateway emits → /trading namespace</li>
                  <li>4. FE: TradingDashboard updates with trades</li>
                </ol>
              </div>
            </div>
          </section>

          {/* Debug Info */}
          <section className="bg-muted p-4 rounded-lg border border-border">
            <h3 className="font-semibold mb-2">Debug Info</h3>
            <ul className="text-xs space-y-1 text-muted-foreground font-mono">
              <li>
                📍 Account: <span className="text-foreground">{selectedAccount.id}</span>
              </li>
              <li>
                💱 Symbol: <span className="text-foreground">{selectedAsset.symbol}</span>
              </li>
              <li>
                🆔 Asset ID: <span className="text-foreground break-all">{selectedAsset.id}</span>
              </li>
              <li>
                ⏱️ Timeframe: <span className="text-foreground">{selectedTimeframe}s</span>
              </li>
              <li>
                🔌 Backend: <span className="text-foreground">ws://localhost:3001</span>
              </li>
              <li>
                📊 Kline URL: <span className="text-foreground">ws://localhost:3001</span>
              </li>
              <li>
                🎯 Trading URL:
                <span className="text-foreground"> ws://localhost:3001/trading</span>
              </li>
            </ul>
          </section>

          {/* Instructions */}
          <section className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <h3 className="font-semibold mb-2 text-green-900 dark:text-green-100">
              ✅ How to Use
            </h3>
            <ol className="space-y-2 text-sm text-green-900 dark:text-green-100 list-decimal list-inside">
              <li>Select a symbol and timeframe from dropdowns above</li>
              <li>Chart will load historical candlesticks from API</li>
              <li>WebSocket connections will establish (check DevTools → Network → WS)</li>
              <li>As orders match on backend, you&apos;ll see:</li>
              <ul className="list-disc list-inside ml-4 mt-1 text-xs">
                <li>New candlesticks appearing on the chart</li>
                <li>New trades appearing in the dashboard</li>
              </ul>
              <li>
                Both components update in real-time as events arrive from WebSocket
              </li>
            </ol>
          </section>

          {/* Troubleshooting */}
          <section className="bg-amber-50 dark:bg-amber-950 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
            <h3 className="font-semibold mb-2 text-amber-900 dark:text-amber-100">
              ⚠️ Troubleshooting
            </h3>
            <div className="space-y-2 text-sm text-amber-900 dark:text-amber-100">
              <p>
                <strong>No candlesticks showing?</strong>
              </p>
              <ul className="list-disc list-inside ml-4 text-xs space-y-1">
                <li>Check backend is running: npm run start:dev in launch-be</li>
                <li>Check DevTools → Network → WS for WebSocket connections</li>
                <li>Check browser console for errors</li>
                <li>Backend needs 30+ seconds to generate candlesticks</li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
