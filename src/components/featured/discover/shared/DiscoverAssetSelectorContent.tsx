'use client';

import { Check, SearchLg } from '@untitledui/icons';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/shared/atoms/input';
import { toFiniteNumberFromNumberish } from '@/components/shared/chart/components/tradePanel/utils/tradePanelInputHelpers';

export type DiscoverAssetSelectorLinkedAsset = {
  id: string;
  symbol: string;
};

export type DiscoverAssetSelectorAsset = {
  ask?: number | string;
  bid?: number | string;
  digit?: number;
  id: string;
  logo?: string;
  name?: string;
  symbol: string;
};

type DiscoverAssetSelectorRtQuote = {
  ask?: number | string;
  bid?: number | string;
  changePercent?: number | string;
};

type DiscoverAssetSelectorContentProps = {
  assetSearchText: string;
  filteredAssets: DiscoverAssetSelectorAsset[];
  linkedAssetIdSet: Set<string>;
  onAssetSearchTextChange: (value: string) => void;
  onToggleLinkedAsset: (asset: DiscoverAssetSelectorLinkedAsset) => void;
  rtBySymbol?: Record<string, DiscoverAssetSelectorRtQuote | undefined>;
  disabled?: boolean;
};

export function DiscoverAssetSelectorContent({
  assetSearchText,
  filteredAssets,
  linkedAssetIdSet,
  onAssetSearchTextChange,
  onToggleLinkedAsset,
  rtBySymbol,
  disabled = false,
}: DiscoverAssetSelectorContentProps) {
  const { t } = useTranslation();

  return (
    <>
      <div className="px-4 pb-2">
        <div className="relative">
          <SearchLg
            size={14}
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 -translate-y-1/2"
          />
          <Input
            value={assetSearchText}
            onChange={(event) => onAssetSearchTextChange(event.target.value)}
            placeholder={t('search.placeholderSymbol', 'Search symbol')}
            className="h-9 pl-7 text-sm"
            disabled={disabled}
          />
        </div>
      </div>

      <div className="bg-border h-px w-full" />

      <div className="scrollbar-neutral-slim max-h-[30vh] overflow-y-auto px-4 py-2">
        {filteredAssets.length === 0 ? (
          <p className="text-muted-foreground py-3 text-sm">
            {t('discover.web.noAssetsFound', 'No assets found.')}
          </p>
        ) : (
          <>
            <div className="text-muted-foreground mb-1 grid grid-cols-[1.5fr_1fr_1fr_0.8fr] items-center gap-2 px-2 py-1 text-xs">
              <span>{t('discover.web.symbol', 'Symbol')}</span>
              <span className="text-right">{t('discover.web.sellPrice', 'Sell Price')}</span>
              <span className="text-right">{t('discover.web.buyPrice', 'Buy Price')}</span>
              <span className="text-right">{t('discover.web.changePercent', 'Chg %')}</span>
            </div>

            {filteredAssets.map((asset) => {
              const isSelected = linkedAssetIdSet.has(asset.id);
              const rt = rtBySymbol?.[asset.symbol];
              const bid =
                toFiniteNumberFromNumberish(rt?.bid) ?? toFiniteNumberFromNumberish(asset.bid) ?? 0;
              const ask =
                toFiniteNumberFromNumberish(rt?.ask) ??
                toFiniteNumberFromNumberish(asset.ask ?? asset.bid) ??
                0;
              const changePercent = toFiniteNumberFromNumberish(rt?.changePercent) ?? 0;
              const safeDigit = Number.isFinite(asset.digit)
                ? Math.min(12, Math.max(0, Math.trunc(asset.digit ?? 0)))
                : 2;
              const quoteClassName =
                changePercent > 0
                  ? 'text-green-500'
                  : changePercent < 0
                    ? 'text-red-500'
                    : 'text-muted-foreground';

              return (
                <button
                  key={asset.id}
                  type="button"
                  className={`hover:bg-muted grid w-full grid-cols-[1.5fr_1fr_1fr_0.8fr] items-center gap-2 rounded px-2 py-2 text-left transition-colors ${
                    isSelected ? 'bg-primary/10' : ''
                  }`}
                  onClick={() =>
                    onToggleLinkedAsset({
                      id: asset.id,
                      symbol: asset.symbol,
                    })
                  }
                  disabled={disabled}
                >
                  <div className="min-w-0">
                    <p className="text-foreground inline-flex items-center gap-1 truncate text-sm font-medium">
                      {asset.logo ? (
                        <Image
                          src={asset.logo}
                          alt={asset.symbol}
                          width={16}
                          height={16}
                          unoptimized
                          className="size-4 shrink-0 rounded-full"
                        />
                      ) : null}
                      {asset.symbol}
                      {isSelected ? (
                        <Check className="text-primary-500 ml-1 inline size-3.5" />
                      ) : null}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">{asset.name}</p>
                  </div>

                  <p className={`text-right text-xs tabular-nums ${quoteClassName}`}>
                    {Number.isFinite(bid) ? bid.toFixed(safeDigit) : '-'}
                  </p>
                  <p className={`text-right text-xs tabular-nums ${quoteClassName}`}>
                    {Number.isFinite(ask) ? ask.toFixed(safeDigit) : '-'}
                  </p>
                  <p className={`text-right text-xs tabular-nums ${quoteClassName}`}>
                    {changePercent > 0 ? '+' : ''}
                    {changePercent.toFixed(2)}%
                  </p>
                </button>
              );
            })}
          </>
        )}
      </div>
    </>
  );
}

