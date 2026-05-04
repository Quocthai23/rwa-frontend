import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetData } from '@/context/GetdataContext';
import { useMarketSocketStore } from '@/store/marketSocketStore';
import { formatPriceDecimal } from '@/utils/currency';

function HotTab() {
  const { t } = useTranslation();
  const { assets: data, isLoadingAssets: isLoading } = useGetData();

  const listPopular = useMemo(() => {
    return data ?? [];
  }, [data]);

  const enrichedList = useMemo(() => {
    return listPopular.map((item) => ({
      ...item,
      stats: {
        highDaily: 0,
        lowDaily: 0,
      },
    }));
  }, [listPopular]);

  if (isLoading) {
    return (
      <div className="flex-1 overflow-hidden p-4">
        <SkeletonList />
      </div>
    );
  }

  if (!enrichedList.length) {
    return (
      <div className="flex-1 overflow-hidden p-4">
        <div className="flex items-center justify-center py-20">
          <p className="text-secondary text-base">{t('search.noSymbolsFound')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden p-4">
      <div>
        {enrichedList.map((item) => (
          <ItemRender
            key={item.symbol}
            assetId={item.id}
            isFavorite={false}
            symbol={item.symbol}
            nameSymbol={item.name}
            marginCurrency={item.marginCurrency}
            profitCurrency={item.profitCurrency}
          />
        ))}
      </div>
    </div>
  );
}

export default HotTab;

type ItemRenderProps = {
  readonly assetId: string;
  readonly isFavorite: boolean;
  readonly symbol: string;
  readonly nameSymbol: string;
  readonly marginCurrency?: string;
  readonly profitCurrency?: string;
};

function ItemRender({ symbol, nameSymbol, marginCurrency, profitCurrency }: ItemRenderProps) {
  const changeValue = useMarketSocketStore((s) => s.rtBySymbol?.[symbol]?.change) ?? 0;
  const percentChangeValue =
    useMarketSocketStore((s) => s.rtBySymbol?.[symbol]?.changePercent) ?? 0;
  const isPositive = changeValue >= 0;
  const pair = marginCurrency && profitCurrency ? `${marginCurrency}/${profitCurrency}` : symbol;

  return (
    <div className="flex flex-row items-center justify-between gap-3 border-b border-gray-100 py-3 dark:border-gray-800">
      <div className="w-[40%]">
        <div className="flex flex-row gap-2">
          <p className="text-[16px] font-semibold text-black dark:text-white">{pair}</p>
        </div>

        <p className="text-secondary mt-1">{nameSymbol}</p>
      </div>

      <div className="flex flex-1 flex-row items-center justify-between">
        <p
          className={`flex-1 text-center text-[16px] font-semibold ${
            isPositive ? 'text-success-500' : 'text-error-500'
          }`}
        >
          {changeValue > 0 ? '+' : ''}
          {formatPriceDecimal(changeValue)}
        </p>
        <p
          className={`flex-1 text-center text-[16px] ${
            isPositive ? 'text-success-500' : 'text-error-500'
          }`}
        >
          {isPositive ? '+' : ''}
          {percentChangeValue.toFixed(2)}%
        </p>
      </div>
    </div>
  );
}

function SkeletonItem() {
  return (
    <div className="flex animate-pulse flex-row items-center justify-between border border-b py-3">
      {/* Left side */}
      <div className="flex-1">
        <div className="bg-muted mb-2 h-5 w-24 rounded" />
        <div className="bg-muted h-4 w-16 rounded" />
      </div>

      {/* Right side */}
      <div className="flex w-[60%] flex-row items-center justify-between">
        <div className="bg-muted mr-2 h-5 w-20 flex-1 rounded" />
        <div className="bg-muted h-5 w-16 flex-1 rounded" />
      </div>
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="px-4">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
        <SkeletonItem key={item} />
      ))}
    </div>
  );
}
