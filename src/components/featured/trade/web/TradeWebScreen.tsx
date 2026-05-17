'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAssetById, useAssetCategories } from '@/hook/useAssets';
import { useSymbols } from '@/hook/useSymbols';
import { useMarketViewModel } from '@/features/market/shared/hooks/useMarketViewModel';
import { cn } from '@/lib/utils';
import { useAccountStore } from '@/store/useAccountStore';
import { useMarketSocketStore } from '@/store/marketSocketStore';
import { useAppHydrated } from '@/hook/useAppHydrated';
import { useAppStore } from '@/store/useAppStore';
import { ONE_CLICK_TRADING_ACCEPTED_KEY } from '../components/constants';
import { OneClickTrading } from './components/OneClickTrading';
import { TradeOrderPanelAside } from './components/TradeOrderPanelAside';
import { TradeFloatingOneClickBar } from './components/TradeFloatingOneClickBar';
import {
  TradeWebMarketAside,
  hashToPercent,
  normalizeDigits,
} from './components/TradeWebMarketAside';
import { toPositiveAssetNumber } from '@/components/shared/chart/components/web/tradePanel/utils/tradePanelInputHelpers';
import type { TradeWebAsideOrderFormHandle } from './components/TradeWebAsideOrderForm';
import { TradeWebMainContent } from './components/TradeWebMainContent';
import type { TradePanelSheetHandle } from '@/components/shared/chart/components/web/TradePanelWeb';

const TRADE_WEB_LAYOUT_STORAGE_KEY = 'trade-web-layout-v1';
const TRADE_SYMBOL_SELECTED_EVENT = 'trade:web:select-symbol';

type TradeWebLayoutState = {
  isMarketPanelExpanded: boolean;
  isOrderPanelExpanded: boolean;
  isPositionPanelExpanded: boolean;
};

function getDefaultTradeWebLayoutState(): TradeWebLayoutState {
  return {
    isMarketPanelExpanded: true,
    isOrderPanelExpanded: true,
    isPositionPanelExpanded: true,
  };
}

function readPersistedTradeWebLayoutState(): TradeWebLayoutState {
  if (typeof window === 'undefined') return getDefaultTradeWebLayoutState();
  try {
    const raw = window.localStorage.getItem(TRADE_WEB_LAYOUT_STORAGE_KEY);
    if (!raw) return getDefaultTradeWebLayoutState();
    const parsed = JSON.parse(raw) as Partial<TradeWebLayoutState>;
    return {
      isMarketPanelExpanded: parsed.isMarketPanelExpanded !== false,
      isOrderPanelExpanded: parsed.isOrderPanelExpanded !== false,
      isPositionPanelExpanded: parsed.isPositionPanelExpanded !== false,
    };
  } catch {
    return getDefaultTradeWebLayoutState();
  }
}

function normalizeTradeSymbol(value: string | null | undefined): string {
  const normalized = String(value ?? '').trim();
  return normalized || 'XAUUSD';
}

function getTradeSymbolFromPathname(pathname: string): string | null {
  const match = pathname.match(/^\/trade\/([^/?#]+)/i);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export default function TradeWebScreen() {
  const { t } = useTranslation();
  const pathname = usePathname() || '/trade';
  const searchParams = useSearchParams();
  const initialPathSymbol = useMemo(
    () => normalizeTradeSymbol(getTradeSymbolFromPathname(pathname)),
    [pathname],
  );
  const [symbolParam, setSymbolParam] = useState<string>(initialPathSymbol);
  const isOneClickAcceptedOnInit =
    typeof window !== 'undefined' &&
    localStorage.getItem(ONE_CLICK_TRADING_ACCEPTED_KEY) === 'true';
  const [currentSymbol, setCurrentSymbol] = useState<string>(symbolParam);
  const [showOneClickSheet, setShowOneClickSheet] = useState(
    !isOneClickAcceptedOnInit && searchParams.get('showOneClickSheet') === '1',
  );
  const [isOneClickEnabled, setIsOneClickEnabled] = useState(isOneClickAcceptedOnInit);
  const [isAcceptedTerms, setIsAcceptedTerms] = useState(isOneClickAcceptedOnInit);
  const [oneClickTermsAccepted, setOneClickTermsAccepted] = useState(false);
  useEffect(() => {
    const nextFromPathname = normalizeTradeSymbol(getTradeSymbolFromPathname(pathname));
    setSymbolParam(nextFromPathname);
  }, [pathname]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncSymbolFromLocation = () => {
      const nextFromPathname = normalizeTradeSymbol(
        getTradeSymbolFromPathname(window.location.pathname),
      );
      setSymbolParam(nextFromPathname);
    };

    syncSymbolFromLocation();

    const handlePopState = () => {
      syncSymbolFromLocation();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  useEffect(() => {
    setCurrentSymbol(symbolParam);
  }, [symbolParam]);

  useEffect(() => {
    if (!currentSymbol || typeof window === 'undefined') return;
    window.localStorage.setItem('lastTradeSymbol', currentSymbol);
  }, [currentSymbol]);

  const vm = useMarketViewModel();
  const { data: assetCategories } = useAssetCategories();
  const [leftTab, setLeftTab] = useState('all');

  const marketAsideCategoryTabs = useMemo(() => {
    const list = Array.isArray(assetCategories) ? assetCategories : [];
    const fromApi = list
      .filter((category) => (category.name ?? '').trim().length > 0)
      .map((category) => {
        const key = (category.code ?? category.name ?? '').toString().toLowerCase();
        return {
          id: String(category.name),
          label: t(`market.categoryOptions.${key}`, { defaultValue: category.name }),
        };
      });
    return [
      {
        id: 'all',
        label: t('market.categoryOptions.all', { defaultValue: 'All' }),
      },
      ...fromApi,
    ];
  }, [assetCategories, t]);

  const validCategoryTabIds = useMemo(
    () => new Set(marketAsideCategoryTabs.map((tab) => tab.id)),
    [marketAsideCategoryTabs],
  );
  const effectiveLeftTab = leftTab === 'all' || validCategoryTabIds.has(leftTab) ? leftTab : 'all';

  const [isCompactTradeLayout, setIsCompactTradeLayout] = useState(false);
  const initialLayoutState = readPersistedTradeWebLayoutState();
  const [isMarketPanelExpanded, setIsMarketPanelExpanded] = useState(
    initialLayoutState.isMarketPanelExpanded,
  );
  const [isOrderPanelExpanded, setIsOrderPanelExpanded] = useState(
    initialLayoutState.isOrderPanelExpanded,
  );
  const [isPositionPanelExpanded, setIsPositionPanelExpanded] = useState(
    initialLayoutState.isPositionPanelExpanded,
  );
  const [asideQuantityLabel, setAsideQuantityLabel] = useState('');
  const [asideOrderSide, setAsideOrderSide] = useState<'buy' | 'sell'>('buy');
  const [isAsideLimitMode, setIsAsideLimitMode] = useState(false);
  const [limitPrice, setLimitPrice] = useState('');
  const tradePanelRef = useRef<TradePanelSheetHandle | null>(null);
  const asideOrderFormRef = useRef<TradeWebAsideOrderFormHandle | null>(null);
  const tradeShareCaptureRef = useRef<HTMLElement | null>(null);
  const hasHydratedApp = useAppHydrated();
  const appLanguage = useAppStore((s) => s.language);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(
      TRADE_WEB_LAYOUT_STORAGE_KEY,
      JSON.stringify({
        isMarketPanelExpanded,
        isOrderPanelExpanded,
        isPositionPanelExpanded,
      }),
    );
  }, [isMarketPanelExpanded, isOrderPanelExpanded, isPositionPanelExpanded]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(max-width: 1224px)');
    const closeAsidesOnSmallScreen = (event: MediaQueryList | MediaQueryListEvent) => {
      setIsCompactTradeLayout(event.matches);
      if (event.matches) {
        setIsMarketPanelExpanded(false);
      }
    };

    closeAsidesOnSmallScreen(mediaQuery);
    mediaQuery.addEventListener('change', closeAsidesOnSmallScreen);

    return () => {
      mediaQuery.removeEventListener('change', closeAsidesOnSmallScreen);
    };
  }, []);

  const { data: symbolAsset } = useAssetById(currentSymbol ?? '');

  useSymbols(
    currentSymbol ? [{ symbol: currentSymbol, id: symbolAsset?.id ?? '' }] : [],
    Boolean(currentSymbol),
  );
  const minTradeSize = useMemo(
    () => Math.max(toPositiveAssetNumber(symbolAsset?.minTradeSize, 0.01), 0.01),
    [symbolAsset?.minTradeSize],
  );
  const maxTradeSize = useMemo(
    () => Math.max(toPositiveAssetNumber(symbolAsset?.maxTradeSize, 200), minTradeSize),
    [symbolAsset?.maxTradeSize, minTradeSize],
  );
  const rtBySymbol = useMarketSocketStore((s) => {
    return s.rtBySymbol;
  });

  const ask = Number(
    useMarketSocketStore((s) => s.rtBySymbol?.[currentSymbol]?.ask) ?? symbolAsset?.ask ?? 0,
  );
  const bid = Number(
    useMarketSocketStore((s) => s.rtBySymbol?.[currentSymbol]?.bid) ?? symbolAsset?.bid ?? 0,
  );
  const lastPrice = Number(
    useMarketSocketStore((s) => s.rtBySymbol?.[currentSymbol]?.lastPrice) ?? 0,
  );

  const rows = useMemo(() => {
    if (effectiveLeftTab === 'all') {
      return vm.getRowsByTab('popular');
    }
    return vm.getRowsByTab(effectiveLeftTab);
  }, [effectiveLeftTab, vm]);

  const displayRows = useMemo(() => rows, [rows]);
  const leftPanelSymbols = useMemo(
    () => displayRows.map((row) => ({ symbol: row.symbol, id: row.id })),
    [displayRows],
  );
  useSymbols(leftPanelSymbols, leftPanelSymbols.length > 0);

  const handleSymbolSelect = useCallback(
    (symbol: string) => {
      if (!symbol || symbol === currentSymbol) return;
      const normalizedSymbol = normalizeTradeSymbol(symbol);
      setCurrentSymbol(normalizedSymbol);
      setSymbolParam(normalizedSymbol);
      if (typeof window !== 'undefined') {
        window.history.replaceState(
          window.history.state,
          '',
          `/trade/${encodeURIComponent(normalizedSymbol)}`,
        );
      }
    },
    [currentSymbol],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleHeaderSymbolSelect = (event: Event) => {
      const customEvent = event as CustomEvent<{ symbol?: string }>;
      const nextSymbol = String(customEvent.detail?.symbol ?? '').trim();
      if (!nextSymbol) return;
      handleSymbolSelect(nextSymbol);
    };

    window.addEventListener(TRADE_SYMBOL_SELECTED_EVENT, handleHeaderSymbolSelect as EventListener);
    return () => {
      window.removeEventListener(
        TRADE_SYMBOL_SELECTED_EVENT,
        handleHeaderSymbolSelect as EventListener,
      );
    };
  }, [handleSymbolSelect]);

  const toggleAsideLimitMode = () => {
    setIsAsideLimitMode((prev) => {
      if (!prev) {
        setIsOneClickEnabled(false);
        return true;
      }
      return false;
    });
  };

  const handleOneClickHeaderPress = () => {
    const accepted =
      typeof window !== 'undefined' &&
      localStorage.getItem(ONE_CLICK_TRADING_ACCEPTED_KEY) === 'true';
    if (!accepted) {
      setShowOneClickSheet(true);
      return;
    }
    tradePanelRef.current?.close();
    setIsAsideLimitMode(false);
    setIsOneClickEnabled(true);
    setIsAcceptedTerms(true);
  };

  const selectedAssetName = symbolAsset?.name || currentSymbol;
  const digit = normalizeDigits(symbolAsset?.digit ?? 2);
  const chg = hashToPercent(currentSymbol || '');
  const chgClass = chg >= 0 ? 'text-green-500' : 'text-red-500';
  return (
    <>
      <div
        className={cn(
          'bg-muted/30 border-border relative grid h-[calc(100dvh-72px)] gap-0 transition-[grid-template-columns] duration-300 ease-in-out dark:bg-neutral-950',
          isCompactTradeLayout
            ? isOrderPanelExpanded
              ? 'grid-cols-[minmax(0,1fr)_264px]'
              : 'grid-cols-[minmax(0,1fr)_0px]'
            : isMarketPanelExpanded && isOrderPanelExpanded
              ? 'grid-cols-[264px_minmax(0,1fr)_264px]'
              : isMarketPanelExpanded && !isOrderPanelExpanded
                ? 'grid-cols-[264px_minmax(0,1fr)_0px]'
                : !isMarketPanelExpanded && isOrderPanelExpanded
                  ? 'grid-cols-[0px_minmax(0,1fr)_264px]'
                  : 'grid-cols-[0px_minmax(0,1fr)_0px]',
        )}
      >
        {isCompactTradeLayout ? (
          <>
            {isMarketPanelExpanded ? (
              <button
                type="button"
                className="absolute inset-0 z-10 bg-black/20"
                aria-label={t('trade.web.mainContent.collapseMarketPanel')}
                onClick={() => setIsMarketPanelExpanded(false)}
              />
            ) : null}
            <div
              className={cn(
                'absolute inset-y-0 left-0 z-20 w-[280px] transition-transform duration-300 ease-in-out',
                isMarketPanelExpanded ? 'translate-x-0' : 'pointer-events-none -translate-x-full',
              )}
            >
              <TradeWebMarketAside
                expanded
                categoryTabs={marketAsideCategoryTabs}
                leftTab={effectiveLeftTab}
                onLeftTabChange={setLeftTab}
                displayRows={displayRows}
                rtBySymbol={rtBySymbol}
                initialSymbol={currentSymbol}
                onSymbolSelect={handleSymbolSelect}
              />
            </div>
          </>
        ) : (
          <TradeWebMarketAside
            expanded={isMarketPanelExpanded}
            categoryTabs={marketAsideCategoryTabs}
            leftTab={effectiveLeftTab}
            onLeftTabChange={setLeftTab}
            displayRows={displayRows}
            rtBySymbol={rtBySymbol}
            initialSymbol={currentSymbol}
            onSymbolSelect={handleSymbolSelect}
          />
        )}

        <TradeWebMainContent
          tradeShareCaptureRef={tradeShareCaptureRef}
          isMarketPanelExpanded={isMarketPanelExpanded}
          setIsMarketPanelExpanded={setIsMarketPanelExpanded}
          isOrderPanelExpanded={isOrderPanelExpanded}
          setIsOrderPanelExpanded={setIsOrderPanelExpanded}
          isPositionPanelExpanded={isPositionPanelExpanded}
          setIsPositionPanelExpanded={setIsPositionPanelExpanded}
          toggleAsideLimitMode={toggleAsideLimitMode}
          isAsideLimitMode={isAsideLimitMode}
          isOneClickEnabled={isOneClickEnabled}
          isAcceptedTerms={isAcceptedTerms}
          onOneClickHeaderPress={handleOneClickHeaderPress}
          currentSymbol={currentSymbol}
          onSymbolSelect={handleSymbolSelect}
          symbolAssetId={symbolAsset?.id}
        />

        <TradeOrderPanelAside
          assetId={symbolAsset?.id ?? ''}
          isFavorite={symbolAsset?.isFavorite}
          expanded={isOrderPanelExpanded}
          selectedAssetName={selectedAssetName}
          currentSymbol={currentSymbol}
          ask={ask}
          bid={bid}
          lastPrice={lastPrice}
          digit={digit}
          chg={chg}
          chgClass={chgClass}
          limitPrice={limitPrice}
          setLimitPrice={setLimitPrice}
          leverage={1}
          tradePanelRef={tradePanelRef}
          asideOrderFormRef={asideOrderFormRef}
          isOneClickEnabled={isOneClickEnabled}
          isAsideLimitMode={isAsideLimitMode}
          orderSide={asideOrderSide}
          onOrderSideChange={setAsideOrderSide}
          onAsideQuantityLabelChange={setAsideQuantityLabel}
          shareCaptureRef={tradeShareCaptureRef}
        />

        {!isOrderPanelExpanded ? (
          <TradeFloatingOneClickBar
            bid={bid}
            ask={ask}
            digit={digit}
            minTradeSize={minTradeSize}
            maxTradeSize={maxTradeSize}
            volume={asideQuantityLabel}
            volumeInput={asideQuantityLabel}
            isOneClickEnabled={isOneClickEnabled}
            isAsideLimitMode={isAsideLimitMode}
            asideOrderFormRef={asideOrderFormRef}
            onOpenAsideForLimitOrder={(side) => {
              setAsideOrderSide(side);
              setIsAsideLimitMode(true);
              setIsOrderPanelExpanded(true);
            }}
          />
        ) : null}
      </div>

      <OneClickTrading
        open={showOneClickSheet}
        onOpenChange={setShowOneClickSheet}
        termsAccepted={oneClickTermsAccepted}
        onTermsAcceptedChange={setOneClickTermsAccepted}
        onAccept={() => {
          if (oneClickTermsAccepted && typeof window !== 'undefined') {
            localStorage.setItem(ONE_CLICK_TRADING_ACCEPTED_KEY, 'true');
            setShowOneClickSheet(false);
            setIsAsideLimitMode(false);
            setIsOneClickEnabled(true);
            setIsAcceptedTerms(true);
          }
        }}
      />
    </>
  );
}
