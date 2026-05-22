'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { TradePanelSheetHandle } from '@/components/shared/chart/components/tradePanel/utils/tradePanelTypes';
import { useMarketSocketStore } from '@/store/marketSocketStore';
import { useSymbols } from '@/hook/useSymbols';
import TradePanel from '@/components/shared/chart/components/TradePanel';
import { CATEGORY_CODE } from '@/constants/category';
import { useCreateOrder } from '@/hook/orders/useCreateOrder';
import { useToast } from '@/hook/useToast';
import { useAccountStore } from '@/store/useAccountStore';
import { useAuthStore } from '@/store/authStore';
import { useInfiniteOrders } from '@/hook/useOrder';
import {
  isAvailableBalanceSufficient,
} from '@/components/featured/position/utils/position.calculations';
import { useAssetById } from '@/hook/useAssets';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/theme';
import { normalizeLeverage } from '@/utils/leverage';
import { isForexMarketOpen } from '@/utils/forexMarketHours';
import { useTransactionStore } from '@/store/transactionStore';
import { useAccountSummaryMetrics } from '@/hook/useAccountSummaryMetrics';
import { ONE_CLICK_TRADING_ACCEPTED_KEY } from '../components/constants';
import { OneClickTradingSheet } from '../components/OneClickTradingSheet';
import { TradeBottomBar } from '../components/TradeBottomBar';
import { TradeStickyHeader } from '../components/TradeStickyHeader';
import { TradeSymbolSearchSheet } from '../components/TradeSymbolSearchSheet';
import {
  normalizeDecimalInput,
  snapQuantityToVolumeStep,
  toPositiveAssetNumber,
} from '@/components/shared/chart/components/tradePanel/utils/tradePanelInputHelpers';
import { ORDER_SIDES, ORDER_TYPES, OrderStatus } from '@/types/orders';

const ChartCommon = dynamic(() => import('@/components/chart/ChartCommon'), {
  ssr: false,
  loading: () => <div className="bg-background h-137.5 w-full animate-pulse" />,
});

const TRADE_VOLUME_BY_SYMBOL_KEY = 'tradeVolumeBySymbol';

function TradeAppScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const params = useParams<{ symbol: string | string[] }>();
  const symbolParam = Array.isArray(params?.symbol) ? params.symbol[0] : params?.symbol;
  const [currentSymbol, setCurrentSymbol] = useState(symbolParam);
  const { data } = useAssetById(currentSymbol ?? '');
  const minTradeSize = useMemo(
    () => Math.max(toPositiveAssetNumber(data?.minTradeSize, 0.01), 0.01),
    [data?.minTradeSize],
  );
  const maxTradeSize = useMemo(
    () => Math.max(toPositiveAssetNumber(data?.maxTradeSize, 200), minTradeSize),
    [data?.maxTradeSize, minTradeSize],
  );
  const volumeStep = useMemo(
    () => toPositiveAssetNumber(data?.volumeStep, 0.01),
    [data?.volumeStep],
  );

  useEffect(() => {
    if (symbolParam) {
      setCurrentSymbol(symbolParam);
      if (typeof window !== 'undefined') {
        localStorage.setItem('lastTradeSymbol', symbolParam);
      }
    }
  }, [symbolParam]);

  const searchParams = useSearchParams();
  const [showOneClickSheet, setShowOneClickSheet] = useState(false);
  const [isOneClickEnabled, setIsOneClickEnabled] = useState(false);
  const [isAcceptedTerms, setIsAcceptedTerms] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const accepted = localStorage.getItem(ONE_CLICK_TRADING_ACCEPTED_KEY);
    if (accepted === 'true') {
      setIsOneClickEnabled(true);
      setIsAcceptedTerms(true);
    } else if (searchParams.get('showOneClickSheet') === '1') {
      setShowOneClickSheet(true);
    }
  }, [searchParams]);
  const [showSearchSheet, setShowSearchSheet] = useState(false);
  const [hasOpenedSearchSheet, setHasOpenedSearchSheet] = useState(false);
  const [oneClickTermsAccepted, setOneClickTermsAccepted] = useState(false);
  const screenReference = useRef<HTMLDivElement | null>(null);
  const marketRef = useRef<HTMLDivElement | null>(null);
  const strategyRef = useRef<HTMLDivElement | null>(null);
  const dataRef = useRef<HTMLDivElement | null>(null);
  const infoRef = useRef<HTMLDivElement | null>(null);
  const [limitPrice, setLimitPrice] = useState('');
  const [volume, setVolume] = useState('1.00');
  const [volumeInput, setVolumeInput] = useState('1.00');
  const [volumeError, setVolumeError] = useState<string | null>(null);
  const [isVolumeTouched, setIsVolumeTouched] = useState(false);
  const [showSectionTabs, setShowSectionTabs] = useState(false);
  const setSymbolTrade = useTransactionStore((s) => s.setSymbolTrade);
  const tradePanelRef = useRef<TradePanelSheetHandle | null>(null);
  useSymbols(currentSymbol ? [currentSymbol] : [], Boolean(currentSymbol));
  const { isConnected, isReconnecting } = useMarketSocketStore();
  const canTrade = navigator.onLine && isConnected && !isReconnecting;

  const saveVolumeBySymbol = (symbol: string, nextVolumeInput: string) => {
    if (typeof window === 'undefined' || !symbol) return;
    try {
      const raw = localStorage.getItem(TRADE_VOLUME_BY_SYMBOL_KEY);
      const parsed = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      localStorage.setItem(
        TRADE_VOLUME_BY_SYMBOL_KEY,
        JSON.stringify({
          ...parsed,
          [symbol]: nextVolumeInput,
        }),
      );
    } catch {
      // Ignore storage errors to avoid blocking trading input UX.
    }
  };

  useEffect(() => {
    if (!currentSymbol || !Number.isFinite(minTradeSize) || minTradeSize <= 0) return;

    const defaultVolume = '1.00';
    setVolume(defaultVolume);
    setVolumeInput(defaultVolume);
    setIsVolumeTouched(false);
    setVolumeError(null);
    saveVolumeBySymbol(currentSymbol, defaultVolume);
  }, [currentSymbol, minTradeSize, maxTradeSize]);

  const setVolumeBoth = (next: number) => {
    const formatted = next.toFixed(2);
    setVolume(formatted);
    setVolumeInput(formatted);
    setVolumeError(null);
    if (currentSymbol) saveVolumeBySymbol(currentSymbol, formatted);
  };

  const handleVolumeChange = (value: string) => {
    const normalized = value.replace(',', '.');
    if (!/^\d*\.?\d*$/.test(normalized)) return;
    const digits = normalized.replace('.', '');
    if (digits.length > 5) return;

    if (!isVolumeTouched) setIsVolumeTouched(true);
    setVolumeInput(normalized);
    if (currentSymbol) saveVolumeBySymbol(currentSymbol, normalized);
  };

  const handleVolumeBlur = () => {
    if (!volumeInput) {
      const fallbackVolume = minTradeSize.toFixed(2);
      setVolume(fallbackVolume);
      setVolumeInput(fallbackVolume);
      setVolumeError(null);
      if (currentSymbol) saveVolumeBySymbol(currentSymbol, fallbackVolume);
      return;
    }

    let num = Number.parseFloat(normalizeDecimalInput(volumeInput));

    if (!Number.isFinite(num)) {
      setVolumeError(t('trade.validation.invalidVolume'));
      return;
    }

    if (num < minTradeSize) {
      setVolumeError(t('trade.validation.minimumIs', { value: minTradeSize }));
      return;
    }

    if (num > maxTradeSize) {
      setVolumeError(t('trade.validation.maximumIs', { value: maxTradeSize }));
      return;
    }

    setVolumeError(null);

    const step = volumeStep > 0 ? volumeStep : 0.01;
    num = snapQuantityToVolumeStep(num, step);

    setVolumeBoth(num);
  };

  useEffect(() => {
    const update = () => {
      const y = window.scrollY;
      setShowSectionTabs(y > 160);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  useEffect(() => {
    const stickyHeight = screenReference.current?.offsetHeight ?? 0;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (a.boundingClientRect.top ?? 0) - (b.boundingClientRect.top ?? 0));
        const topMost = visible[0];
        topMost?.target?.getAttribute('data-section') as
          | 'market'
          | 'strategy'
          | 'data'
          | 'info'
          | null;
      },
      {
        root: null,
        threshold: [0.15, 0.3, 0.5, 0.7],
        rootMargin: `-${stickyHeight + 8}px 0px -65% 0px`,
      },
    );

    const els = [marketRef.current, strategyRef.current, dataRef.current, infoRef.current].filter(
      Boolean,
    ) as HTMLDivElement[];
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [showSectionTabs]);

  const symbolDesc = data?.name ?? '';
  const displaySymbol =
    data?.marginCurrency && data?.profitCurrency
      ? `${data.marginCurrency}/${data.profitCurrency}`
      : currentSymbol;
  const initialAsk = Number.parseFloat(data?.ask || '0');
  const initialBid = Number.parseFloat(data?.bid || '0');
  const selectedAccount = useAccountStore((s) => s.selectedAccount);
  const leverage = normalizeLeverage(undefined, data?.maxLeverage, 100);
  const digit = data?.digit ?? 2;

  const ask = useMarketSocketStore((s) => s.rtBySymbol?.[currentSymbol]?.ask) ?? initialAsk;
  const bid = useMarketSocketStore((s) => s.rtBySymbol?.[currentSymbol]?.bid) ?? initialBid;
  const rtBySymbol = useMarketSocketStore((s) => s.rtBySymbol);

  const { showError, showSuccess } = useToast();
  const { isPending, mutateAsync: createOrder } = useCreateOrder();
  const user = useAuthStore((s) => s.user);

  const { availableBalance } = useAccountSummaryMetrics();
  const { refetch: refetchOrders } = useInfiniteOrders({
    accountId: selectedAccount?.id || '',
    status: [OrderStatus.OPEN, OrderStatus.PARTIALLY_FILLED],
  });

  const handleOrder = async (
    side: (typeof ORDER_SIDES)[keyof typeof ORDER_SIDES],
    orderType: (typeof ORDER_TYPES)[keyof typeof ORDER_TYPES],
  ) => {
    if (!canTrade) {
      showError(
        t('trade.errors.connectionErrorTitle', { defaultValue: 'Connection Error' }),
        t('trade.errors.connectionErrorMessage', {
          defaultValue:
            'Cannot place order while disconnected. Please check your connection and try again.',
        }),
      );
      return;
    }
    if (isPending) return;
    if (!currentSymbol) return;

    const categoryCode = data?.category?.code?.toUpperCase?.() ?? '';
    if (categoryCode !== CATEGORY_CODE.CRYPTO && !isForexMarketOpen()) {
      showError(t('trade.errors.marketClosedTitle'), t('trade.errors.marketClosedForexMessage'));
      return;
    }

    const contractSize = toPositiveAssetNumber(data?.contractSize, 100);

    if (!volumeInput) {
      setVolumeError(t('trade.validation.volumeRequired'));
      showError(t('trade.errors.tradeFailedTitle'), t('trade.validation.invalidVolume'));
      return;
    }

    const rawQty = Number.parseFloat(normalizeDecimalInput(volumeInput));
    if (!Number.isFinite(rawQty) || rawQty <= 0) {
      setVolumeError(t('trade.validation.invalidVolume'));
      showError(t('trade.errors.tradeFailedTitle'), t('trade.validation.invalidVolume'));
      return;
    }

    // Validate min/max on raw quantity before step snapping. Otherwise a value below min
    // (e.g. 0.1 with min 7) can round to 0 when step is large and we incorrectly show "invalid volume".
    if (rawQty < minTradeSize) {
      setVolumeError(t('trade.validation.minimumIs', { value: minTradeSize }));
      showError(
        t('trade.errors.tradeFailedTitle'),
        t('trade.validation.minimumVolumeIs', { value: minTradeSize }),
      );
      return;
    }

    if (rawQty > maxTradeSize) {
      setVolumeError(t('trade.validation.maximumIs', { value: maxTradeSize }));
      showError(
        t('trade.errors.tradeFailedTitle'),
        t('trade.validation.maximumVolumeIs', { value: maxTradeSize }),
      );
      return;
    }

    const step = volumeStep > 0 ? volumeStep : 0.01;
    const qty = snapQuantityToVolumeStep(rawQty, step);

    if (!Number.isFinite(qty) || qty <= 0) {
      setVolumeError(t('trade.validation.invalidVolume'));
      showError(t('trade.errors.tradeFailedTitle'), t('trade.validation.invalidVolume'));
      return;
    }

    if (qty < minTradeSize) {
      setVolumeError(t('trade.validation.minimumIs', { value: minTradeSize }));
      showError(
        t('trade.errors.tradeFailedTitle'),
        t('trade.validation.minimumVolumeIs', { value: minTradeSize }),
      );
      return;
    }

    if (qty > maxTradeSize) {
      setVolumeError(t('trade.validation.maximumIs', { value: maxTradeSize }));
      showError(
        t('trade.errors.tradeFailedTitle'),
        t('trade.validation.maximumVolumeIs', { value: maxTradeSize }),
      );
      return;
    }

    setVolumeBoth(qty);

    if (orderType === ORDER_TYPES.MARKET) {
      const price = side === ORDER_SIDES.BUY ? ask : bid;
      const totalCost = qty * price;
      if (side === ORDER_SIDES.BUY && !isAvailableBalanceSufficient(availableBalance.toNumber(), totalCost)) {
        showError(
          t('trade.errors.tradeFailedTitle'),
          t('trade.errors.insufficientAvailableBalance'),
        );
        return;
      }
    }
    if (!data?.id) {
      showError(t('trade.errors.tradeFailedTitle'), t('trade.errors.tradeFailedMessage'));
      return;
    }
    try {
      const response = await createOrder({
        assetId: data.id,
        symbol: currentSymbol || '',
        type: orderType === ORDER_TYPES.LIMIT ? 'LIMIT' : 'MARKET',
        quantity: String(qty),
        side: side === ORDER_SIDES.BUY ? 'BUY' : 'SELL',
        price: orderType === ORDER_TYPES.LIMIT ? limitPrice : undefined,
      });
      if (response) {
        showSuccess(
          t('trade.success.orderPlacedSuccessfullyTitle'),
          t('trade.success.orderPlacedSuccessfully'),
        );
      } else {
        showError(t('trade.errors.tradeFailedTitle'), t('trade.errors.failedCreateOrder'));
      }
      refetchOrders();
    } catch (error) {
      console.error(error);

      const err = error as { message?: unknown; code?: unknown } | null;
      const apiErrorMessage = typeof err?.message === 'string' ? err.message : undefined;
      const apiErrorCode = typeof err?.code === 'string' ? err.code : undefined;

      const isStalePriceError =
        apiErrorCode === 'bad-request' &&
        typeof apiErrorMessage === 'string' &&
        apiErrorMessage.toLowerCase().includes('is stale');
      if (typeof apiErrorCode === 'string' && apiErrorCode.includes('price-not-found')) {
        showError(t('trade.errors.marketClosedTitle'), t('trade.errors.marketClosedMessage'));
        return;
      }
      if (isStalePriceError) {
        showError(t('trade.errors.marketClosedTitle'), t('trade.errors.marketClosedForexMessage'));
        return;
      }

      const fallbackMessage =
        apiErrorMessage ||
        (error instanceof Error ? error.message : t('trade.errors.failedCreateOrder'));

      showError(t('trade.errors.tradeFailedTitle'), fallbackMessage);
    }
  };

  const onOrderPress = (side: (typeof ORDER_SIDES)[keyof typeof ORDER_SIDES]) => {
    if (!user) {
      router.push('/login');
      return;
    }
    handleOrder(side, ORDER_TYPES.MARKET);
  };

  const handleSymbolSelect = useCallback(
    (symbol: string) => {
      const nextSymbol = String(symbol ?? '').trim();
      if (!nextSymbol || nextSymbol === currentSymbol) return;
      setCurrentSymbol(nextSymbol);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('lastTradeSymbol', nextSymbol);
        window.history.replaceState(
          window.history.state,
          '',
          `/trade/${encodeURIComponent(nextSymbol)}`,
        );
      }
    },
    [currentSymbol],
  );

  const openMarketTradePanel = () => {
    setSymbolTrade(currentSymbol);
    setIsOneClickEnabled(false);
    if (!tradePanelRef.current?.isOpen?.()) {
      const lotFromTrade = volumeInput || volume;
      tradePanelRef.current?.open(undefined, {
        defaultTab: 'Market',
        quantity: lotFromTrade,
      });
    } else {
      tradePanelRef.current?.close();
    }
  };

  const openLimitPanel = () => {
    setSymbolTrade(currentSymbol);
    setIsOneClickEnabled(false);
    if (!tradePanelRef.current?.isOpen?.()) {
      const lotFromTrade = volumeInput || volume;
      tradePanelRef.current?.open('orderLimit', {
        defaultTab: 'Limit',
        quantity: lotFromTrade,
      });
    } else {
      tradePanelRef.current?.close();
    }
  };

  const isOneClickAccepted =
    typeof window !== 'undefined' &&
    localStorage.getItem(ONE_CLICK_TRADING_ACCEPTED_KEY) === 'true';

  const handleBottomSellPress = () => {
    if (isOneClickAccepted && isOneClickEnabled) {
      onOrderPress(ORDER_SIDES.SELL);
    } else {
      openMarketTradePanel();
    }
  };

  const handleBottomBuyPress = () => {
    if (isOneClickAccepted && isOneClickEnabled) {
      onOrderPress(ORDER_SIDES.BUY);
    } else {
      openMarketTradePanel();
    }
  };

  const tradeContent = (
    <div className="bg-background text-foreground flex-1">
      <div ref={screenReference}>
        <TradeStickyHeader
          currentSymbol={currentSymbol}
          displaySymbol={displaySymbol}
          isOneClickEnabled={isOneClickEnabled}
          isAcceptedTerms={isAcceptedTerms}
          isLimitOrderVisible={!isOneClickEnabled}
          onOpenSymbolSearch={() => {
            setHasOpenedSearchSheet(true);
            setShowSearchSheet(true);
          }}
          onLimitOrderClick={openLimitPanel}
          onOneClickClick={() => {
            const accepted =
              typeof window !== 'undefined' &&
              localStorage.getItem(ONE_CLICK_TRADING_ACCEPTED_KEY) === 'true';
            if (!accepted) {
              setShowOneClickSheet(true);
              return;
            }
            tradePanelRef.current?.close();
            setIsOneClickEnabled(true);
            setIsAcceptedTerms(true);
          }}
        />
      </div>
      <div className="h-auto">
        <ChartCommon isTradeScreen setSymbol={setCurrentSymbol} symbol={currentSymbol} />
      </div>
      <TradePanel
        descSymbol={symbolDesc ?? ''}
        symbol={currentSymbol}
        tradePanelRef={tradePanelRef}
        limitPrice={limitPrice}
        setLimitPrice={setLimitPrice}
        digit={digit}
      />

      <TradeBottomBar
        ask={ask}
        bid={bid}
        whiteColor={colors.white}
        minTradeSize={minTradeSize}
        maxTradeSize={maxTradeSize}
        volume={volume}
        volumeInput={volumeInput}
        volumeError={volumeError}
        onVolumeChange={handleVolumeChange}
        onVolumeBlur={handleVolumeBlur}
        setVolume={setVolume}
        setVolumeInput={setVolumeInput}
        setVolumeBoth={setVolumeBoth}
        onSell={handleBottomSellPress}
        onBuy={handleBottomBuyPress}
      />
    </div>
  );

  return (
    <>
      {tradeContent}

      <OneClickTradingSheet
        open={showOneClickSheet}
        onOpenChange={setShowOneClickSheet}
        termsAccepted={oneClickTermsAccepted}
        onTermsAcceptedChange={setOneClickTermsAccepted}
        onAccept={() => {
          if (oneClickTermsAccepted && typeof window !== 'undefined') {
            localStorage.setItem(ONE_CLICK_TRADING_ACCEPTED_KEY, 'true');
            setShowOneClickSheet(false);
            setIsOneClickEnabled(true);
            setIsAcceptedTerms(true);
          }
        }}
      />

      <TradeSymbolSearchSheet
        open={showSearchSheet}
        onOpenChange={setShowSearchSheet}
        hasOpened={hasOpenedSearchSheet}
        onOpened={() => setHasOpenedSearchSheet(true)}
        onCancel={() => setShowSearchSheet(false)}
        onSelectSymbol={(symbol) => {
          setShowSearchSheet(false);
          handleSymbolSelect(symbol);
        }}
      />
    </>
  );
}

export default TradeAppScreen;
