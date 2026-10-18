'use client';

import { ArrowUp, Bell01, ChevronLeft, Minus, Plus, ArrowDown } from '@untitledui/icons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sheet, SheetContent } from '@/components/shared/atoms/sheet';
import ReusableTabsPager, { type TabItem } from '@/components/shared/Pager/ReusableTabsPager';
import { useTheme } from '@/theme';
import { useParams, useRouter } from 'next/navigation';
import { useMarketSocketStore } from '@/store/marketSocketStore';
import { useSymbols } from '@/hook/useSymbols';
import Image from 'next/image';
import { useAssetById } from '@/hook/useAssets';
import { Button } from '@/components/shared/atoms/button';
import { Input } from '@/components/shared/atoms/input';

function Alerts() {
  const { colors } = useTheme();
  const router = useRouter();
  const [isAlertListOpen, setIsAlertListOpen] = useState(false);

  const params = useParams<{ symbol?: string | string[] }>();
  const initialSymbol = Array.isArray(params?.symbol) ? params.symbol[0] : params?.symbol;
  const [currentSymbol] = useState(initialSymbol);

  const { data } = useAssetById(currentSymbol);

  useSymbols(currentSymbol ? [currentSymbol] : [], Boolean(currentSymbol));

  const asset = useMemo(() => {
    if (!currentSymbol) return undefined;
    return data;
  }, [currentSymbol, data]);

  const lastPrice = useMarketSocketStore((s) =>
    currentSymbol ? s.rtBySymbol?.[currentSymbol]?.lastPrice : undefined,
  );
  const changePercent = useMarketSocketStore((s) =>
    currentSymbol ? s.rtBySymbol?.[currentSymbol]?.changePercent : undefined,
  );

  const pair =
    asset?.marginCurrency && asset?.profitCurrency
      ? `${asset.marginCurrency}/${asset.profitCurrency}`
      : (currentSymbol ?? '');

  const changeValue =
    lastPrice != null && changePercent != null ? lastPrice * (changePercent / 100) : null;
  const isPositive = (changePercent ?? 0) >= 0;

  const { t } = useTranslation();

  const tabs: TabItem[] = [
    { key: 'ticker', label: t('alerts.tickerAlert'), render: <TickerAlertTab /> },
    {
      key: 'price',
      label: t('alerts.priceAlert'),
      render: <PriceAlertTab lastPrice={lastPrice} />,
    },
  ];

  return (
    <div className="bg-background min-h-100dvh flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={() => {
            router.back();
          }}
        >
          <ChevronLeft className="text-foreground" size={28} />
        </button>
        <p className="text-h3-semibold">{t('alerts.title')}</p>
        <button
          type="button"
          onClick={() => {
            setIsAlertListOpen(true);
          }}
        >
          <Image src="/icons/Alert.svg" alt="alert" width={24} height={24} />
        </button>
      </div>

      {/* Symbol Info */}
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex flex-col items-start">
          <p className="text-h3-semibold">{pair || '-'}</p>
          <p className="text-body-small-regular text-muted-foreground">
            {asset?.name ?? currentSymbol ?? ''}
          </p>
        </div>
        <div className="flex w-[35%] flex-col items-end">
          <p className="text-h2-semibold whitespace-nowrap">
            {lastPrice != null ? lastPrice.toFixed(2) : '-'}
          </p>
          {changePercent != null && (
            <div className="flex items-center">
              <p
                className={`text-body-small-regular mr-2 ${
                  isPositive ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {changeValue != null ? changeValue.toFixed(2) : '-'}
              </p>
              <p
                className={`text-body-small-regular ${
                  isPositive ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {isPositive && changePercent > 0 ? '+' : ''}({changePercent.toFixed(2)}%)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <ReusableTabsPager
        ohlc={{ close: 0, high: 0, low: 0, open: 0 }}
        currentSymbol={currentSymbol ?? ''}
        activeColor={colors.primary500}
        defaultIndex={0}
        headerBorderColor="transparent"
        inactiveColor={colors.neutral500}
        swipeEnabled={false}
        tabs={tabs}
        underlineColor={colors.primary500}
        equalWidth
      />

      <AlertList
        open={isAlertListOpen}
        onOpenChange={setIsAlertListOpen}
        symbol={pair || currentSymbol || ''}
        description={asset?.name ?? currentSymbol ?? ''}
      />
    </div>
  );
}

export default Alerts;

// Ticker Alert Tab Component
function TickerAlertTab() {
  const { t } = useTranslation();
  const [tickerAlert, setTickerAlert] = useState(false);
  const [priceSurge, setPriceSurge] = useState(false);
  const [volumeSurge, setVolumeSurge] = useState(false);
  const [move24h, setMove24h] = useState(false);
  const [quickSurgeDive, setQuickSurgeDive] = useState(false);
  const [recentHighLow, setRecentHighLow] = useState(false);

  return (
    <div className="max-h-[calc(100dvh-250px)] flex-1 overflow-y-auto px-4">
      <AlertItem
        description={t('alerts.tickerAlertDescription')}
        title={t('alerts.tickerAlert')}
        value={tickerAlert}
        onValueChange={setTickerAlert}
      />
      <AlertItem
        description={t('alerts.priceSurgeDescription')}
        title={t('alerts.priceSurge')}
        value={priceSurge}
        onValueChange={setPriceSurge}
      />
      <AlertItem
        description={t('alerts.volumeSurgeDescription')}
        title={t('alerts.volumeSurge')}
        value={volumeSurge}
        onValueChange={setVolumeSurge}
      />
      <AlertItem
        description={t('alerts.move24hDescription')}
        title={t('alerts.move24h')}
        value={move24h}
        onValueChange={setMove24h}
      />
      <AlertItem
        description={t('alerts.quickSurgeDiveDescription')}
        title={t('alerts.quickSurgeDive')}
        value={quickSurgeDive}
        onValueChange={setQuickSurgeDive}
      />
      <AlertItem
        description={t('alerts.recentHighLowDescription')}
        title={t('alerts.recentHighLow')}
        value={recentHighLow}
        onValueChange={setRecentHighLow}
      />
    </div>
  );
}

// Price Alert Tab Component
function PriceAlertTab({ lastPrice }: { readonly lastPrice?: number }) {
  const { t } = useTranslation();
  const [alertType, setAlertType] = useState<'buy' | 'sell'>('sell');
  const [price, setPrice] = useState(lastPrice ?? 0);
  const [priceText, setPriceText] = useState(
    lastPrice != null ? lastPrice.toFixed(2).replace('.', ',') : '0,00',
  );
  const [frequency, setFrequency] = useState<'once' | 'repeatedly'>('once');

  const sanitizePriceInput = (raw: string) => {
    // Keep only digits and at most one decimal separator (',' or '.').
    const cleaned = raw.replace(/[^\d.,]/g, '');
    let result = '';
    let hasSeparator = false;

    for (const ch of cleaned) {
      if (ch >= '0' && ch <= '9') {
        result += ch;
        continue;
      }

      if (ch === ',' || ch === '.') {
        if (hasSeparator) continue;
        hasSeparator = true;
        result += ',';
      }
    }

    // If user starts with separator (",", "."), treat it as "0,<decimals>".
    if (result.startsWith(',')) result = `0${result}`;

    // Limit decimals to 2 places.
    const commaIndex = result.indexOf(',');
    if (commaIndex !== -1) {
      const intPart = result.slice(0, commaIndex);
      const decPart = result.slice(commaIndex + 1, commaIndex + 1 + 2);
      result = `${intPart},${decPart}`;
    }

    return result;
  };

  const incrementPrice = () => {
    const newPrice = price + 0.01;
    setPrice(newPrice);
    setPriceText(newPrice.toFixed(2).replace('.', ','));
  };

  const decrementPrice = () => {
    const newPrice = Math.max(0, price - 0.01);
    setPrice(newPrice);
    setPriceText(newPrice.toFixed(2).replace('.', ','));
  };

  const handlePriceChange = (text: string) => {
    const sanitized = sanitizePriceInput(text);
    const trimmed = sanitized.trim();
    setPriceText(sanitized);

    if (trimmed === '') {
      setPrice(lastPrice ?? 0);
      return;
    }

    // Convert comma to dot for parsing
    const numericValue = Number.parseFloat(trimmed.replace(',', '.'));
    if (!Number.isNaN(numericValue)) {
      setPrice(numericValue);
    }
  };

  const handleBlur = () => {
    if (priceText.trim() === '') return;
    // Format on blur
    setPriceText(price.toFixed(2).replace('.', ','));
  };

  return (
    <div className="mt-4 flex-1 px-4 pb-8">
      <div className="max-h-[calc(100dvh-250px)] flex-1 overflow-y-auto">
        <div className="border-border bg-card rounded-md border p-4">
          {/* Alert me when */}
          <div className="mb-4">
            <p className="text-body-large-regular text-foreground mb-3">
              {t('alerts.alertMeWhen')}
            </p>
            <div className="flex gap-3">
              <Button
                className={`flex-1 items-center rounded py-2 ${
                  alertType === 'sell' ? 'bg-red-50' : 'bg-muted'
                }`}
                onClick={() => {
                  setAlertType('sell');
                }}
              >
                <span
                  className={`text-body-small-regular font-medium ${
                    alertType === 'sell' ? 'text-red-500' : 'text-muted-foreground'
                  }`}
                >
                  {t('alerts.sellPrice')}
                </span>
              </Button>
              <Button
                className={`flex-1 items-center rounded py-2 ${
                  alertType === 'buy' ? 'bg-green-50' : 'bg-muted'
                }`}
                onClick={() => {
                  setAlertType('buy');
                }}
              >
                <span
                  className={`text-body-small-regular font-medium ${
                    alertType === 'buy' ? 'text-green-500' : 'text-muted-foreground'
                  }`}
                >
                  {t('alerts.buyPrice')}
                </span>
              </Button>
            </div>
          </div>

          {/* Hits */}
          <div>
            <p className="text-body-large-regular text-foreground mb-3">{t('alerts.hits')}</p>
            <div className="flex items-center justify-between">
              <Button className="bg-muted flex items-end rounded p-2" onClick={decrementPrice}>
                <Minus className="text-foreground size-6" />
              </Button>
              <Input
                className="flex-1 border-none text-center text-[22px] leading-[32px] font-medium shadow-none outline-none focus-visible:border-transparent focus-visible:ring-0 focus-visible:ring-transparent"
                style={{ minWidth: 100 }}
                type="text"
                inputMode="decimal"
                value={priceText}
                onBlur={handleBlur}
                onKeyDown={(e) => {
                  const allowedKeys = [
                    'Backspace',
                    'Delete',
                    'Tab',
                    'ArrowLeft',
                    'ArrowRight',
                    'Home',
                    'End',
                  ];
                  if (allowedKeys.includes(e.key)) return;
                  if (e.ctrlKey || e.metaKey) return; // allow copy/paste shortcuts
                  if (/^[0-9]$/.test(e.key) || e.key === ',' || e.key === '.') return;
                  if (e.key === 'Enter') return;
                  e.preventDefault();
                }}
                onChange={(e) => {
                  handlePriceChange(e.target.value);
                }}
              />
              <Button
                className="bg-muted flex items-start justify-center rounded p-2"
                onClick={incrementPrice}
              >
                <Plus className="text-foreground size-6" />
              </Button>
            </div>
          </div>
        </div>

        {/* Frequency Setting */}
        <div className="border-border bg-card mt-4 mb-8 rounded-md border p-4">
          <p className="text-body-large-regular text-foreground mb-4">
            {t('alerts.frequencySetting')}
          </p>
          <Button
            variant="white-contained"
            className="mb-4 flex items-center"
            onClick={() => {
              setFrequency('once');
            }}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                frequency === 'once' ? 'border-primary-500' : 'border-border'
              }`}
            >
              {frequency === 'once' && <span className="bg-primary-500 h-3 w-3 rounded-full" />}
            </span>
            <span className="text-body-large-regular text-foreground">{t('alerts.oneTime')}</span>
          </Button>
          <Button
            variant="white-contained"
            className="flex items-center"
            onClick={() => {
              setFrequency('repeatedly');
            }}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                frequency === 'repeatedly' ? 'border-primary-500' : 'border-border'
              }`}
            >
              {frequency === 'repeatedly' && (
                <span className="bg-primary-500 h-3 w-3 rounded-full" />
              )}
            </span>
            <span className="text-body-large-regular text-foreground">
              {t('alerts.repeatedly')}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}

// Alert Item Component
function AlertItem({
  description,
  onValueChange,
  title,
  value,
}: {
  readonly description: string;
  readonly onValueChange: (value: boolean) => void;
  readonly title: string;
  readonly value: boolean;
}) {
  return (
    <div className="py-3">
      <div className="mb-2 flex flex-row items-start justify-between pr-2">
        <p className="text-body-large-medium text-foreground flex-1">{title}</p>
        <Button
          onClick={() => {
            onValueChange(!value);
          }}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            value ? 'bg-primary-500' : 'bg-muted'
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full shadow transition-transform ${
              value ? 'translate-x-3 bg-white' : 'bg-muted-foreground/30 -translate-x-2.5'
            }`}
          />
        </Button>
      </div>
      <p className="text-body-small-regular text-muted-foreground max-w-[80%]">{description}</p>
    </div>
  );
}

// Alert List
function AlertList({
  open,
  onOpenChange,
  symbol,
  description,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly symbol: string;
  readonly description?: string;
}) {
  const { t } = useTranslation();
  type AlertItem = {
    enabled: boolean;
    frequency: 'once' | 'repeatedly';
    id: string;
    price: number;
    type: 'sell' | 'buy';
  };

  const [alerts, setAlerts] = useState<AlertItem[]>([
    {
      enabled: true,
      frequency: 'once',
      id: '1',
      price: 0.85,
      type: 'sell',
    },
    {
      enabled: true,
      frequency: 'once',
      id: '2',
      price: 1.3203,
      type: 'buy',
    },
    {
      enabled: false,
      frequency: 'repeatedly',
      id: '3',
      price: 0.3,
      type: 'sell',
    },
  ]);

  const handleDelete = (id: string) => {
    setAlerts(alerts.filter((alert) => alert.id !== id));
  };

  const handleToggle = (id: string) => {
    setAlerts(
      alerts.map((alert) => (alert.id === id ? { ...alert, enabled: !alert.enabled } : alert)),
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="bg-background max-h-[70vh] overflow-y-auto rounded-t border-none pt-6"
        showCloseButton={false}
      >
        <div className="flex-1 pt-2">
          <p className="text-h3-semibold border-border border-b pb-3 text-center">
            {t('alerts.alertList')}
          </p>

          {/* Symbol */}
          <div className="border-border border-b px-4 py-4">
            <p className="text-h3-semibold text-foreground pb-1">{symbol || '-'}</p>
            <p className="text-body-small-regular text-muted-foreground">
              {description || symbol || '-'}
            </p>
          </div>

          {/* Alerts List */}
          <div>
            {alerts.map((item) => (
              <SwipeableAlertItem
                key={item.id}
                item={item}
                onDelete={() => {
                  handleDelete(item.id);
                }}
                onToggle={() => {
                  handleToggle(item.id);
                }}
              />
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Swipeable Alert Item Component
function SwipeableAlertItem({
  item,
  // onDelete,
  onToggle,
}: {
  readonly item: {
    enabled: boolean;
    frequency: 'once' | 'repeatedly';
    id: string;
    price: number;
    type: 'sell' | 'buy';
  };
  readonly onDelete: () => void;
  readonly onToggle: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center px-4 py-4">
      {/* Icon */}
      <div className="mr-3">
        {item.type === 'sell' ? (
          <div className="flex aspect-square w-10 items-center justify-center rounded-full bg-red-50">
            <ArrowDown className="text-red-500" size={24} />
          </div>
        ) : (
          <div className="flex aspect-square w-10 items-center justify-center rounded-full bg-green-50">
            <ArrowUp className="text-green-500" size={24} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1">
        <p className="text-body-regular text-foreground mb-1">
          {item.type === 'sell'
            ? t('alerts.priceBelow', { price: item.price })
            : t('alerts.priceIsUp', { price: item.price })}
        </p>
        <div className="flex flex-row items-center">
          <Bell01 className="text-primary-500" size={14} />
          <span className="text-body-small-regular text-primary-500 ml-1">
            {item.frequency === 'once' ? t('alerts.oneTime') : t('alerts.repeatedly')}
          </span>
        </div>
      </div>

      {/* Toggle */}
      <button
        type="button"
        onClick={onToggle}
        className={`relative ml-4 inline-flex h-7 w-11 items-center rounded-full transition-colors ${
          item.enabled ? 'bg-primary-500' : 'bg-muted-foreground/30'
        }`}
      >
        <span
          className={`inline-block h-5.5 w-5.5 transform rounded-full shadow transition-transform ${
            item.enabled ? 'translate-x-5.5 bg-white' : 'translate-x-0.5 bg-white'
          }`}
        />
      </button>
    </div>
  );
}

