'use client';
import { Bell01, ChevronLeft, LinkExternal01 } from '@untitledui/icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import ShareModal from './components/ShareModal';
import { useParams, usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/shared/atoms/button';
import { useTransactionStore } from '@/store/transactionStore';
import TradePanel, {
  type TradePanelSheetHandle,
} from '@/components/shared/chart/components/TradePanel';
import { useMarketSocketStore } from '@/store/marketSocketStore';
import { useSymbols } from '@/hook/useSymbols';
import MT5PriceText from '../market/components/MT5PriceText';
import InfoTab from './components/InfoTab';
import AnalysisDataSection from './components/AnalysisDataSection';
import { ToggleFavouriteAsset } from '@/components/shared/components/ToggleFavouriteAsset';
import { useAssetById } from '@/hook/useAssets';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from 'react-i18next';
import { toPng } from 'html-to-image';
import { Sheet, SheetContent } from '@/components/shared/atoms/sheet';
import Search from '../search/app/Search';
import { useIsTinyPhone } from '@/hook/useMediaQuery';
import { useToast } from '@/hook/useToast';
import { useAppStore } from '@/store/useAppStore';
import { useAppHydrated } from '@/hook/useAppHydrated';
import { resolveRouteExperience } from '@/lib/experience/resolveExperience';
import { useExperience } from '@/lib/experience/useExperience';

const ChartCommon = dynamic(() => import('@/components/chart/ChartCommon'), {
  ssr: false,
  loading: () => (
    <div className="h-137.5 w-full animate-pulse bg-neutral-100 dark:bg-neutral-900" />
  ),
});

function SymbolDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ symbol: string | string[] }>();
  const symbolParam = Array.isArray(params?.symbol) ? params.symbol[0] : params?.symbol;
  const [currentSymbol, setCurrentSymbol] = useState<string>(symbolParam ?? '');
  const isTinyPhone = useIsTinyPhone();
  const { showToast } = useToast();
  const appLanguage = useAppStore((s) => s.language);
  const hasHydratedApp = useAppHydrated();

  useEffect(() => {
    if (symbolParam) {
      setTimeout(() => setCurrentSymbol(symbolParam), 0);
    }
  }, [symbolParam]);

  const { data } = useAssetById(currentSymbol ?? '');
  const [showShareModal, setShowShareModal] = useState(false);
  const [capturedImageUri, setCapturedImageUri] = useState<null | string>(null);
  const screenReference = useRef<HTMLDivElement | null>(null);
  const contentScrollRef = useRef<HTMLDivElement | null>(null);
  const [showSearchSheet, setShowSearchSheet] = useState(false);
  const [hasOpenedSearchSheet, setHasOpenedSearchSheet] = useState(false);
  const marketRef = useRef<HTMLDivElement | null>(null);
  const dataRef = useRef<HTMLDivElement | null>(null);
  const infoRef = useRef<HTMLDivElement | null>(null);
  const [limitPrice, setLimitPrice] = useState('');
  const [showSectionTabs, setShowSectionTabs] = useState(false);
  const [activeSection, setActiveSection] = useState<'market' | 'data' | 'info'>(
    'market',
  );
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setSymbolTrade = useTransactionStore((s) => s.setSymbolTrade);
  const tradePanelRef = useRef<TradePanelSheetHandle | null>(null);
  useSymbols(currentSymbol ? [currentSymbol] : [], Boolean(currentSymbol));

  useEffect(() => {
    const el = contentScrollRef.current;
    if (!el) return;

    const update = () => {
      const y = el.scrollTop;
      setShowSectionTabs(y > 160);

      // When user scrolls to (near) bottom, force active tab to "info"
      const distanceToBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
      if (distanceToBottom < 24) setActiveSection('info');
    };

    update();
    el.addEventListener('scroll', update, { passive: true });
    return () => el.removeEventListener('scroll', update);
  }, []);

  useEffect(() => {
    const rootEl = contentScrollRef.current;
    if (!rootEl) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (a.boundingClientRect.top ?? 0) - (b.boundingClientRect.top ?? 0));
        const topMost = visible[0];
        const id = topMost?.target?.getAttribute('data-section') as
          | 'market'
          | 'data'
          | 'info'
          | null;
        if (id) setActiveSection(id);
      },
      {
        root: rootEl,
        threshold: [0.15, 0.3, 0.5, 0.7],
        rootMargin: `-8px 0px -65% 0px`,
      },
    );

    const els = [
      marketRef.current,
      dataRef.current,
      infoRef.current,
    ].filter(Boolean) as HTMLDivElement[];
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [showSectionTabs]);

  const scrollToSection = (section: 'market' | 'data' | 'info') => {
    const map: Record<typeof section, React.RefObject<HTMLDivElement | null>> = {
      market: marketRef,
      data: dataRef,
      info: infoRef,
    };
    const el = map[section].current;
    const rootEl = contentScrollRef.current;
    if (!el || !rootEl) return;

    const top = el.offsetTop - 8;
    rootEl.scrollTo({ top, behavior: 'smooth' });
  };

  const asset = useMemo(() => {
    if (!currentSymbol) return undefined;
    return data;
  }, [data, currentSymbol]);
  const symbolDesc = asset?.name ?? '';
  const initialAsk = Number.parseFloat(asset?.ask || '0');
  const initialBid = Number.parseFloat(asset?.bid || '0');
  const digit = asset?.digit ?? 2;
  const leverage = typeof asset?.maxLeverage === 'string' ? Number.parseFloat(asset.maxLeverage) : (asset?.maxLeverage ?? 100);

  const lastPrice = useMarketSocketStore((s) => s.rtBySymbol?.[currentSymbol]?.lastPrice);
  const ask = useMarketSocketStore((s) => s.rtBySymbol?.[currentSymbol]?.ask) ?? initialAsk;
  const bid =
    useMarketSocketStore((s) => {
      return s.rtBySymbol?.[currentSymbol]?.bid;
    }) ?? initialBid;
  const low = useMarketSocketStore((s) => s.rtBySymbol?.[currentSymbol]?.sessionStats?.low);
  const high = useMarketSocketStore((s) => s.rtBySymbol?.[currentSymbol]?.sessionStats?.high);

  const spreadPoints = bid && ask ? Math.round((ask - bid) * Math.pow(10, digit)) : 0;
  const changePercent = useMarketSocketStore((s) => s.rtBySymbol?.[currentSymbol]?.changePercent);

  const formatByDigit = (v: number | string) => {
    const parsed = typeof v === 'number' ? v : Number.parseFloat(String(v));
    if (!Number.isFinite(parsed)) return '-';
    return parsed.toFixed(digit);
  };

  const priceBaseFontSize = isTinyPhone ? 15 : 18;
  const priceBigFontSize = isTinyPhone ? 18 : 22;
  const priceSupFontSize = isTinyPhone ? 12 : 14;
  const lastPriceBaseFontSize = isTinyPhone ? 18 : 22;
  const lastPriceBigFontSize = isTinyPhone ? 22 : 28;
  const lastPriceSupFontSize = isTinyPhone ? 13 : 16;

  const handleCapture = async () => {
    try {
      setCapturedImageUri(null);
      setShowShareModal(true);
      const targetNode = contentScrollRef.current;
      if (!targetNode) return;

      const isDark =
        typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
      const backgroundColor = isDark ? '#0b1220' : '#ffffff';

      const captured = await toPng(targetNode, {
        backgroundColor,
        cacheBust: true,
        pixelRatio: 2,
      });
      setCapturedImageUri(captured);
    } catch (error) {
      console.error('Failed to capture share image:', error);
      setShowShareModal(false);
      showToast({
        title: t('symbolDetail.shareModal.captureFailedTitle', {
          defaultValue: 'Capture failed',
        }),
        message: t('symbolDetail.shareModal.captureFailed', {
          defaultValue: 'Failed to capture image. Please try again.',
        }),
        type: 'error',
      });
    }
  };

  const handleOpenPositionClick = () => {
    if (!currentSymbol) return;
    router.push(`/trade/${currentSymbol}`);
  };

  const handleSymbolSelect = useCallback(
    (symbol: string) => {
      const nextSymbol = String(symbol ?? '').trim();
      if (!nextSymbol || nextSymbol === currentSymbol) return;
      setCurrentSymbol(nextSymbol);
      if (typeof window !== 'undefined') {
        window.history.replaceState(
          window.history.state,
          '',
          `/market/${encodeURIComponent(nextSymbol)}`,
        );
      }
    },
    [currentSymbol],
  );

  const viewportExperience = useExperience();

  useEffect(() => {
    if (viewportExperience === 'web') {
      router.replace(`/trade/${currentSymbol}`);
    }
  }, [viewportExperience, router]);

  if (viewportExperience === 'web') {
    return null;
  }

  return (
    <>
      <div>
        <div ref={screenReference} className={`bg-background sticky top-0 z-50`}>
          <div className="flex justify-between px-4 py-3">
            <div className="flex items-center justify-between">
              <div
                className="flex items-center gap-2"
                onClick={() => {
                  setHasOpenedSearchSheet(true);
                  setShowSearchSheet(true);
                }}
              >
                <Button
                  variant="white-contained"
                  onClick={() => {
                    router.back();
                  }}
                  className="p-0"
                >
                  <ChevronLeft className="text-foreground size-6" />
                </Button>

                <div>
                  <div className="flex items-center gap-1">
                    <p className="text-h3-semibold font-semibold">{currentSymbol}</p>
                    <div>
                      <Image
                        src="/icons/arrow-down.svg"
                        alt={t('trade.a11y.selectSymbol')}
                        width={24}
                        height={24}
                      />
                    </div>
                  </div>
                  <p className={`text-sm`}>{symbolDesc}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => {
                  setSymbolTrade(currentSymbol);
                  if (tradePanelRef.current?.isOpen?.()) {
                    tradePanelRef.current?.close();
                  } else {
                    tradePanelRef.current?.open('orderLimit');
                  }
                }}
                variant="white-contained"
                className="p-0"
              >
                <Image
                  src="/assets/icons/chart/limitOrder.svg"
                  alt="IconLimit"
                  width={24}
                  height={24}
                />
              </Button>

              <Button
                variant="white-contained"
                className="p-0"
                onClick={() => {
                  router.push(`/trade/${currentSymbol}?showOneClickSheet=1`);
                }}
              >
                <Image
                  src="/assets/icons/chart/oneClick.svg"
                  alt="IconOneClick"
                  width={24}
                  height={24}
                />
              </Button>
            </div>
          </div>

          {showSectionTabs && (
            <div className="w-full border-b border-neutral-200 px-4">
              <div className="flex items-center justify-between gap-6">
                {(
                  [
                    { id: 'market', label: t('symbolDetail.tabs.market') },
                    { id: 'data', label: t('symbolDetail.tabs.data') },
                    { id: 'info', label: t('symbolDetail.tabs.info') },
                  ] as const
                ).map((t) => {
                  const isActive = activeSection === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => scrollToSection(t.id)}
                      className={`relative py-2 ${
                        isActive
                          ? 'text-primary-500 text-body-large-semibold'
                          : 'text-body-large-regular text-muted-foreground'
                      }`}
                    >
                      {t.label}
                      <span
                        className={`absolute bottom-0 left-0 h-0.5 w-full ${
                          isActive ? 'bg-primary-500' : 'bg-transparent'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div
          ref={contentScrollRef}
          className="bg-background max-h-[calc(100dvh-200px)] overflow-y-auto"
        >
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex w-2/5 flex-col items-start gap-1">
              {lastPrice != null ? (
                <MT5PriceText
                  baseFontSize={lastPriceBaseFontSize}
                  bigFontSize={lastPriceBigFontSize}
                  containerStyle={{ lineHeight: 1 }}
                  fixedDecimals={digit}
                  style={{
                    color: changePercent != null && changePercent >= 0 ? '#16a34a' : '#ef4444',
                  }}
                  supFontSize={lastPriceSupFontSize}
                  value={lastPrice}
                />
              ) : (
                <span
                  className={`${isTinyPhone ? 'text-[18px] font-semibold' : 'text-h2-semibold'} text-muted-foreground leading-none`}
                >
                  -
                </span>
              )}
              {changePercent != null && (
                <span
                  className={`${isTinyPhone ? 'text-[12px]' : 'text-body-small-regular'} leading-none ${
                    changePercent >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}
                >
                  {lastPrice != null ? `${(lastPrice * (changePercent / 100)).toFixed(2)} ` : ''}(
                  {changePercent >= 0 ? '+' : ''}
                  {changePercent.toFixed(2)}%)
                </span>
              )}
            </div>

            <div className="flex w-3/5 flex-1 items-end">
              <div className="flex flex-1 flex-col items-start gap-1">
                <MT5PriceText
                  baseFontSize={priceBaseFontSize}
                  bigFontSize={priceBigFontSize}
                  fixedDecimals={digit}
                  supFontSize={priceSupFontSize}
                  style={{ color: '#ef4444' }}
                  value={bid}
                />
                <span
                  className={`${isTinyPhone ? 'text-[12px]' : 'text-body-small-regular'} text-muted-foreground leading-none`}
                >
                  L: {low != null ? formatByDigit(low) : '-'}
                </span>
              </div>

              <p
                className={`${isTinyPhone ? 'text-[12px]' : 'text-body-small-regular'} text-muted-foreground leading-none`}
              >
                {spreadPoints}
              </p>

              <div className="flex flex-1 flex-col items-end gap-1 text-right">
                <MT5PriceText
                  baseFontSize={priceBaseFontSize}
                  bigFontSize={priceBigFontSize}
                  fixedDecimals={digit}
                  supFontSize={priceSupFontSize}
                  style={{ color: '#16a34a' }}
                  value={ask}
                />
                <span
                  className={`${isTinyPhone ? 'text-[12px]' : 'text-body-small-regular'} text-muted-foreground leading-none`}
                >
                  H: {high != null ? formatByDigit(high) : '-'}
                </span>
              </div>
            </div>
          </div>

          <div ref={marketRef} data-section="market">
            {currentSymbol ? (
              <ChartCommon setSymbol={setCurrentSymbol} symbol={currentSymbol} />
            ) : (
              <div className="text-body-medium text-muted-foreground px-4 py-6">
                Loading symbol…
              </div>
            )}
          </div>

          <div className="border-b border-neutral-200 py-3"></div>

          <div ref={dataRef} data-section="data">
            <AnalysisDataSection symbol={currentSymbol} />
          </div>

          <div className="border-b border-neutral-200 py-3"></div>

          <div ref={infoRef} data-section="info" className="pb-6">
            <InfoTab assetId={asset?.id} />
          </div>
        </div>
        <TradePanel
          descSymbol={symbolDesc ?? ''}
          symbol={currentSymbol}
          tradePanelRef={tradePanelRef}
          limitPrice={limitPrice}
          setLimitPrice={setLimitPrice}
          leverage={leverage}
          digit={digit}
        />
        <ShareModal
          imageUri={capturedImageUri}
          visible={showShareModal}
          onClose={() => {
            setShowShareModal(false);
          }}
        />

        <div className="bg-muted fixed bottom-15 left-1/2 z-40 w-full max-w-3xl -translate-x-1/2">
          <div className="bg-background mx-auto flex max-w-full items-center justify-between gap-4 px-4 py-3 shadow-[0_-2px_8px_rgba(15,23,42,0.08)]">
            <div className="text-muted-foreground flex items-center gap-4">
              <ToggleFavouriteAsset assetId={asset?.id ?? ''} size={24} />
              <Button
                variant="white-contained"
                onClick={handleCapture}
                aria-label={t('symbolDetail.share')}
              >
                <LinkExternal01 className="text-foreground size-6" />
              </Button>
            </div>
            <div className="flex flex-1 gap-3">
              <Button
                type="button"
                variant="red-contained"
                className="flex-1 py-3"
                onClick={handleOpenPositionClick}
              >
                <span className="text-button-large-medium text-white">
                  {t('symbolDetail.sell')}
                </span>
              </Button>
              <Button
                type="button"
                variant="green-contained"
                className="flex-1 py-3"
                onClick={handleOpenPositionClick}
              >
                <span className="text-button-large-medium text-white">{t('symbolDetail.buy')}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Sheet
        open={showSearchSheet}
        onOpenChange={(open) => {
          setShowSearchSheet(open);
          if (open) setHasOpenedSearchSheet(true);
        }}
      >
        <SheetContent
          side="bottom"
          className="h-[80dvh] max-h-[80dvh] gap-0 overflow-hidden p-0"
          showCloseButton={false}
          title=""
        >
          {hasOpenedSearchSheet && (
            <Search
              onCancel={() => setShowSearchSheet(false)}
              onSelectSymbol={(symbol) => {
                setShowSearchSheet(false);
                handleSymbolSelect(symbol);
              }}
              isTrade={true}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

export default SymbolDetailScreen;
