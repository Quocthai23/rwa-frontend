import { useTheme } from '@/theme';
import { InfoCircle } from '@untitledui/icons';
import { useMarketSocketStore } from '@/store/marketSocketStore';
import { useTranslation } from 'react-i18next';
import type { NullableDecimalValue } from '@/types/decimal';

type AnalysisDataSectionProps = {
  readonly symbol?: string | null;
};

export default function AnalysisDataSection({ symbol }: AnalysisDataSectionProps) {
  const { t } = useTranslation();
  const ticker = useMarketSocketStore((s) => (symbol ? s.rtBySymbol?.[symbol] : undefined));

  const toNumber = (value: NullableDecimalValue, fallback = 0) => {
    const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? ''));

    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const takerBuyVolume24h = toNumber(ticker?.takerBuyVolume24h);
  const takerSellVolume24h = toNumber(ticker?.takerSellVolume24h);
  const takerBuyRatio24h =
    ticker?.takerBuyRatio24h != null ? toNumber(ticker.takerBuyRatio24h, 0) : null;
  const todayLowest = toNumber(ticker?.sessionStats?.low);
  const todayHighest = toNumber(ticker?.sessionStats?.high);
  const currentPrice = toNumber(ticker?.lastPrice);

  const totalVolume = takerBuyVolume24h + takerSellVolume24h;

  const buyerPercent =
    takerBuyRatio24h != null
      ? Math.max(0, Math.min(100, takerBuyRatio24h))
      : totalVolume > 0
        ? (takerBuyVolume24h / totalVolume) * 100
        : 0;

  const sellerPercent = 100 - buyerPercent;

  const fiveMinChangePercent = toNumber(ticker?.changePercent);
  const openPrice = toNumber(ticker?.sessionStats?.open);

  const todayChangePercent =
    openPrice !== 0 ? ((currentPrice - openPrice) / openPrice) * 100 : fiveMinChangePercent;

  const open5m =
    1 + fiveMinChangePercent / 100 !== 0 ? currentPrice / (1 + fiveMinChangePercent / 100) : 0;
  const range5mLow = Math.min(open5m, currentPrice);
  const range5mHigh = Math.max(open5m, currentPrice);

  const open60m = openPrice;
  const range60mLow = Math.min(open60m, currentPrice);
  const range60mHigh = Math.max(open60m, currentPrice);

  const toCommaFixed1 = (value: number) => value.toFixed(1).replace('.', ',');

  return (
    <div className="pt-4 pb-4">
      <div className="text-h2-semibold mb-4">{t('symbolDetail.tabs.data')}</div>

      <div className="mb-6">
        <div className="text-body-regular mb-3">{t('symbolDetail.data.tradingSentiment')}</div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-muted-foreground">{t('symbolDetail.data.seller')}</span>
          <span className="text-muted-foreground">{t('symbolDetail.data.buyer')}</span>
        </div>
        <div className="mb-1 flex h-2 overflow-hidden rounded">
          <div className="bg-red-500" style={{ width: `${sellerPercent}%` }} />
          <div className="bg-green-500" style={{ width: `${buyerPercent}%` }} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-body-large-regular text-red-500">{sellerPercent.toFixed(0)}%</span>
          <span className="text-body-large-regular text-green-500">{buyerPercent.toFixed(0)}%</span>
        </div>
        <div className="mt-2 flex items-center">
          <span className="text-caption-regular text-muted-foreground mr-2">
            {t('symbolDetail.data.dataSource')}
          </span>
          <InfoCircle className="text-red-500" size={16} />
        </div>
      </div>

      {/* Price Range */}
      <div>
        <div className="text-body-large-regular mb-2">{t('symbolDetail.data.priceRange')}</div>

        {/* Time periods */}
        <div className="mb-3 flex justify-between">
          <PriceRangePeriod
            isNegative={fiveMinChangePercent < 0}
            label={t('symbolDetail.data.fiveMins')}
            value={`${fiveMinChangePercent.toFixed(2).replace('.', ',')}%`}
            isStart
          />
          <PriceRangePeriod
            isNegative={todayChangePercent < 0}
            label={t('symbolDetail.data.sixtyMins')}
            value={`${todayChangePercent.toFixed(2).replace('.', ',')}%`}
          />
          <PriceRangePeriod
            isNegative={todayChangePercent < 0}
            label="Today"
            value={`${todayChangePercent.toFixed(2).replace('.', ',')}%`}
          />
        </div>

        {/* Current Price */}
        <div className="mt-4 mb-2 flex items-baseline">
          <span className="text-body-large-regular mr-2">
            {t('symbolDetail.data.currentPrice')}
          </span>
          <span className="text-body-large-regular text-green-500">
            {ticker?.lastPrice != null ? toNumber(ticker.lastPrice).toFixed(2) : '-'}
          </span>
        </div>

        {/* Price Ranges */}
        <PriceRangeBar
          current={currentPrice}
          highest={range5mHigh.toFixed(1).replace('.', ',')}
          label={t('symbolDetail.data.fiveMins')}
          lowest={range5mLow.toFixed(1).replace('.', ',')}
        />
        <PriceRangeBar
          current={currentPrice}
          highest={range60mHigh.toFixed(1).replace('.', ',')}
          label={t('symbolDetail.data.sixtyMins')}
          lowest={range60mLow.toFixed(1).replace('.', ',')}
        />
        <PriceRangeBar
          current={currentPrice}
          highest={todayHighest.toFixed(1).replace('.', ',')}
          label={t('symbolDetail.data.today')}
          lowest={todayLowest.toFixed(1).replace('.', ',')}
        />
      </div>
    </div>
  );
}

function PriceRangePeriod({
  isNegative,
  label,
  value,
  isStart,
}: {
  readonly isNegative: boolean;
  readonly label: string;
  readonly value: string;
  readonly isStart?: boolean;
}) {
  return (
    <div
      className={`border-border flex-1 items-start pl-6 ${isStart ? 'border-0 pl-0' : 'border-l'}`}
    >
      <div className="text-body-small-regular mb-1">{label}</div>
      <div className={`text-body-small-regular ${isNegative ? 'text-red-500' : 'text-green-500'}`}>
        {value}
      </div>
    </div>
  );
}

function PriceRangeBar({
  current,
  highest,
  label,
  lowest,
}: {
  readonly current: number;
  readonly highest: string;
  readonly label: string;
  readonly lowest: string;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const lowestNumber = Number.parseFloat(lowest.replace(',', '.'));
  const highestNumber = Number.parseFloat(highest.replace(',', '.'));
  const range = highestNumber - lowestNumber;
  const rawPercentage = range === 0 ? 50 : ((current - lowestNumber) / range) * 100;
  const percentage = Math.max(0, Math.min(100, rawPercentage));

  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <div className="items-start">
          <div className="text-muted-foreground mb-1">{t('symbolDetail.data.lowestPrice')}</div>
        </div>

        <div className="items-end">
          <div className="text-muted-foreground mb-1">{t('symbolDetail.data.highestPrice')}</div>
        </div>
      </div>
      <div className="bg-muted relative mt-1 h-1.5 rounded-full">
        <div
          className="bg-primary-500 absolute h-1.5 rounded-full"
          style={{ width: `${percentage}%` }}
        />
        {/* Triangle indicator */}
        <div
          className="absolute"
          style={{
            left: `${percentage}%`,
            marginLeft: -4,
            top: -6,
          }}
        >
          <div
            style={{
              backgroundColor: 'transparent',
              borderTopColor: colors.primary500,
              borderTopWidth: 6,
              borderLeftColor: 'transparent',
              borderLeftWidth: 4,
              borderRightColor: 'transparent',
              borderRightWidth: 4,
              borderStyle: 'solid',
              height: 0,
              width: 0,
            }}
          />
        </div>
      </div>
      <div className="mt-2 flex max-w-full items-center justify-between">
        <span className="w-1/3 text-left">{lowest}</span>
        <span className="text-muted-foreground w-1/3 text-center">{label}</span>
        <span className="w-1/3 text-right">{highest}</span>
      </div>
    </div>
  );
}
