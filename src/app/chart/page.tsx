'use client';

import { useMemo, useState } from 'react';
import { CandlestickChart } from '@/components/examples/CandlestickChart';
import { useGetData } from '@/context/GetdataContext';
import SplashLogo from '@/components/shared/SplashLogo';

const TIMEFRAMES = [
  { label: '1m', value: 60 },
  { label: '5m', value: 300 },
  { label: '15m', value: 900 },
  { label: '1h', value: 3600 },
  { label: '4h', value: 14400 },
  { label: '1d', value: 86400 },
];

export default function ChartPage() {
  const { assets, isLoadingAssets } = useGetData();
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState(3600);

  const selectedAsset = useMemo(
    () => assets?.find((asset) => asset.id === selectedAssetId) ?? assets?.[0],
    [assets, selectedAssetId],
  );

  if (isLoadingAssets) {
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
        <div className="max-w-6xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">Candlestick Chart</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Real-time candlestick data via kline WebSocket events (default namespace /)
              </p>
            </div>
            <span className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
              🟢 Live Connection
            </span>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-xs font-semibold mb-2">Asset</label>
              <select
                value={selectedAsset.id}
                onChange={(e) => setSelectedAssetId(e.target.value)}
                className="px-3 py-2 bg-muted border border-border rounded text-sm hover:bg-muted/80 transition"
              >
                {assets?.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.symbol} - {asset.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2">Timeframe</label>
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(Number(e.target.value))}
                className="px-3 py-2 bg-muted border border-border rounded text-sm hover:bg-muted/80 transition"
              >
                {TIMEFRAMES.map(({ label, value }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              <p>
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                WebSocket: ws://localhost:3001
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Chart Section */}
          <div className="border border-border rounded-lg overflow-hidden bg-card">
            <CandlestickChart
              assetId={selectedAsset.id}
              symbol={selectedAsset.symbol}
              timeframe={selectedTimeframe}
            />
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Data Flow */}
            <div className="bg-muted p-4 rounded-lg border border-border">
              <h3 className="font-semibold mb-3">📊 Data Flow</h3>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="font-semibold min-w-fit">1.</span>
                  <span>Backend: OrderMatchingService matches buy/sell orders</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold min-w-fit">2.</span>
                  <span>Backend: MarketDataService saves trade + emits kline event</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold min-w-fit">3.</span>
                  <span>Backend: KlineGateway broadcasts kline to / namespace</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold min-w-fit">4.</span>
                  <span>FE: klineSocketStore receives kline event</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold min-w-fit">5.</span>
                  <span>FE: Chart updates with new/updated candlestick</span>
                </li>
              </ol>
            </div>

            {/* Initial Load */}
            <div className="bg-muted p-4 rounded-lg border border-border">
              <h3 className="font-semibold mb-3">🚀 Initial Load Process</h3>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="font-semibold min-w-fit">1.</span>
                  <span>GET /market-data/candles?assetId={selectedAsset.id}&resolution=1h</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold min-w-fit">2.</span>
                  <span>Backend returns historical candlesticks (last 30 days)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold min-w-fit">3.</span>
                  <span>FE renders chart with historical data</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold min-w-fit">4.</span>
                  <span>Connect to klineSocketStore WebSocket</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold min-w-fit">5.</span>
                  <span>Subscribe to symbol + timeframe combination</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold min-w-fit">6.</span>
                  <span>Listen for real-time kline events</span>
                </li>
              </ol>
            </div>

            {/* Kline Event Structure */}
            <div className="bg-muted p-4 rounded-lg border border-border md:col-span-2">
              <h3 className="font-semibold mb-3">📋 Kline Event Structure</h3>
              <pre className="text-xs overflow-x-auto bg-background p-2 rounded border border-border">
                {`{
  "type": "kline",
  "data": {
    "symbol": "BTC/USD",
    "timeframe": 3600,
    "timestamp": 1234567890,
    "open": 45000.00,
    "high": 45200.50,
    "low": 44900.00,
    "close": 45150.25,
    "volume": 12.34
  }
}`}
              </pre>
            </div>
          </div>

          {/* Debug Info */}
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">
              🔍 Debug Information
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-blue-900 dark:text-blue-100">
              <div>
                <p className="text-blue-600 dark:text-blue-400 font-semibold">Symbol</p>
                <p className="font-mono">{selectedAsset.symbol}</p>
              </div>
              <div>
                <p className="text-blue-600 dark:text-blue-400 font-semibold">Asset ID</p>
                <p className="font-mono break-all">{selectedAsset.id}</p>
              </div>
              <div>
                <p className="text-blue-600 dark:text-blue-400 font-semibold">Timeframe</p>
                <p className="font-mono">{selectedTimeframe}s</p>
              </div>
              <div>
                <p className="text-blue-600 dark:text-blue-400 font-semibold">WebSocket</p>
                <p className="font-mono">ws://localhost:3001</p>
              </div>
              <div>
                <p className="text-blue-600 dark:text-blue-400 font-semibold">API</p>
                <p className="font-mono">http://localhost:3001</p>
              </div>
            </div>
          </div>

          {/* Troubleshooting */}
          <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-lg border border-amber-200 dark:border-amber-800">
            <h3 className="font-semibold mb-3 text-amber-900 dark:text-amber-100">
              ⚠️ Troubleshooting
            </h3>
            <div className="space-y-3 text-sm text-amber-900 dark:text-amber-100">
              <div>
                <p className="font-semibold">Chart shows &quot;Loading candlesticks...&quot;</p>
                <ul className="list-disc list-inside ml-2 text-xs mt-1 space-y-1">
                  <li>Backend may not have generated orders yet (wait 30 seconds)</li>
                  <li>Check backend is running: npm run start:dev in d:\launch-be</li>
                  <li>Check DevTools → Network → XHR for /market-data/candles request</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold">No real-time updates after loading</p>
                <ul className="list-disc list-inside ml-2 text-xs mt-1 space-y-1">
                  <li>Check DevTools → Network → WS (should see 2 WebSocket connections)</li>
                  <li>Check Messages tab: should see kline events arriving</li>
                  <li>Check backend logs for &quot;Trade matched!&quot; messages</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold">WebSocket connection fails</p>
                <ul className="list-disc list-inside ml-2 text-xs mt-1 space-y-1">
                  <li>Verify backend port 3001 is accessible</li>
                  <li>Check .env: NEXT_PUBLIC_SOCKET_CHART_URL=ws://localhost:3001</li>
                  <li>Try refreshing the page</li>
                </ul>
              </div>
            </div>
          </div>

          {/* DevTools Guide */}
          <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <h3 className="font-semibold mb-3 text-green-900 dark:text-green-100">
              ✅ How to Monitor
            </h3>
            <div className="space-y-2 text-sm text-green-900 dark:text-green-100">
              <p>
                <strong>1. WebSocket Connection:</strong>
              </p>
              <ul className="list-disc list-inside ml-4 text-xs space-y-1 mb-3">
                <li>DevTools → Network tab → Filter: &quot;WS&quot;</li>
                <li>Should see: ws://localhost:3001 (Status: 101)</li>
                <li>Click → Messages tab</li>
                <li>Should see incoming kline messages with candlestick data</li>
              </ul>

              <p>
                <strong>2. API Request:</strong>
              </p>
              <ul className="list-disc list-inside ml-4 text-xs space-y-1 mb-3">
                <li>DevTools → Network tab → Filter: &quot;XHR&quot;</li>
                <li>Should see GET: /market-data/candles</li>
                <li>Response should be JSON array with historical candles</li>
              </ul>

              <p>
                <strong>3. Browser Console:</strong>
              </p>
              <ul className="list-disc list-inside ml-4 text-xs space-y-1">
                <li>Should NOT see errors</li>
                <li>May see debug logs from klineSocketStore</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
