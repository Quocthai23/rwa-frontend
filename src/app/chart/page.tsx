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
              <h1 className="text-3xl font-bold">Biểu đồ nến (Chart)</h1>
            </div>
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

          {/* Removed testing and debug info */}
        </div>
      </div>
    </div>
  );
}
