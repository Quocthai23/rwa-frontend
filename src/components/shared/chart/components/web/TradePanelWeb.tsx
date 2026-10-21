'use client';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import type { DecimalValue } from '@/types/decimal';

export type { TradePanelSheetHandle } from './tradePanel/utils/tradePanelTypes';

import type { TradePanelSheetHandle } from './tradePanel/utils/tradePanelTypes';
import { ORDER_SIDES, OrderStatus } from '@/types/orders';
import { useCreateOrder } from '@/hook/orders/useCreateOrder';
import { useToast } from '@/hook/useToast';
import { useMarketSocketStore } from '@/store/marketSocketStore';
import { useAuthStore } from '@/store/authStore';
import { demoOrderContext } from '@/lib/trading/demo-order-context';
import { useAccountStore } from '@/store/useAccountStore';
import { useInfiniteOrders } from '@/hook/useOrder';
import { TradePanelActionBar } from './tradePanel/components/TradePanelActionBar';
import { TradePanelLimitPriceField } from './tradePanel/components/TradePanelLimitPriceField';
import { TradePanelOrderTypeTabs } from './tradePanel/components/TradePanelOrderTypeTabs';
import { TradePanelSymbolHeader } from './tradePanel/components/TradePanelSymbolHeader';
import { TradePanelVolumeControl } from './tradePanel/components/TradePanelVolumeControl';
import { computeTradePanelLimitStopFlags } from './tradePanel/utils/tradePanelLimitStopFlags';
import {
  normalizeDecimalInput,
  toFiniteNumberFromNumberish,
  toPositiveAssetNumber,
} from './tradePanel/utils/tradePanelInputHelpers';
import { submitTradePanelOrder } from './tradePanel/utils/tradePanelSubmitOrder';
import { TABS } from './tradePanel/utils/tradePanelUtils';
import { useGetData } from '@/context/GetdataContext';
import SplashLogo from '../../../SplashLogo';
import { Dialog, DialogContent, DialogTitle } from '@/components/shared/atoms/dialog';
import { useAccountSummaryMetrics } from '@/hook/useAccountSummaryMetrics';
import { usePortfolioItem } from '@/hook/usePortfolio';
import { formatBalance } from '@/utils/currency';

const MiniBidAskChart = dynamic(() => import('../MiniBidAskChart'), {
  ssr: false,
  loading: () => (
    <div className="border-border mt-4 h-44.5 border-t">
      <div className="text-body-small-regular text-muted-foreground flex h-full items-center justify-center">
        {i18n.t('trade.loadingChart')}
      </div>
    </div>
  ),
});

function TradePanel({
  descSymbol,
  symbol,
  tradePanelRef,
  limitPrice,
  setLimitPrice,
  digit,
}: {
  readonly limitPrice: string;
  readonly setLimitPrice: (value: string) => void;
  readonly descSymbol: string;
  readonly symbol: string;
  readonly tradePanelRef: React.MutableRefObject<TradePanelSheetHandle | null>;
  readonly digit: number;
}) {
  const { isConnected, isReconnecting } = useMarketSocketStore();
  const rt = useMarketSocketStore((s) => s.rtBySymbol?.[symbol]);
  const { assets: assetsData } = useGetData();
  const symbolAsset = assetsData?.find((a) => a.symbol === symbol);
  const displaySymbol = symbol;

  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { showError, showSuccess } = useToast();
  const { t } = useTranslation();
  const { isPending: isCreatingOrder, mutate: createOrder } = useCreateOrder();

  const getTabLabel = (tab: (typeof TABS)[number]) => {
    switch (tab) {
      case 'Market':
        return t('trade.tabs.market');
      case 'Limit':
        return t('trade.tabs.limit');
    }
  };
  const [isOpen, setIsOpen] = useState(false);
  const [variant, setVariant] = useState<'compact' | 'full'>('full');
  const [mainOpen, setMainOpen] = useState(false);
  const [showMiniChart, setShowMiniChart] = useState(false);
  const [transactionType, setTransactionType] = useState<'buy' | 'sell'>('buy');
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>(TABS[0]);
  const [quantity, setQuantity] = useState('1.00');
  const [isQuantityTouched, setIsQuantityTouched] = useState(false);

  const formatQuote = useMemo(() => {
    const safeDigit = Number.isFinite(digit) ? Math.min(12, Math.max(0, Math.trunc(digit))) : 2;
    return (value: DecimalValue) => {
      const parsed = toFiniteNumberFromNumberish(value);
      return parsed != null && Number.isFinite(parsed) ? parsed.toFixed(safeDigit) : '-';
    };
  }, [digit]);

  useEffect(() => {
    const handle: TradePanelSheetHandle = {
      open: (
        param?: 'orderLimit' | 'buySell' | 'buy' | 'sell',
        options?: {
          defaultTab?: 'Market' | 'Limit';
          quantity?: string;
        },
      ) => {
        setLimitPrice('');
        const openTab = options?.defaultTab;
        if (openTab) {
          setActiveTab(openTab);
        }
        if (typeof options?.quantity === 'string') {
          setQuantity('1.00');
          setIsQuantityTouched(false);
        }
        if (param === 'orderLimit') {
          setVariant('full');
          setActiveTab(openTab ?? TABS[1]);
          setMainOpen(true);
          setIsOpen(true);
        } else if (param === 'buySell') {
          setVariant('full');
          setActiveTab(openTab ?? TABS[0]);
          setMainOpen(true);
          setIsOpen(true);
        } else if (param === 'buy' || param === 'sell') {
          setTransactionType(param);
          setVariant('full');
          setActiveTab(openTab ?? TABS[0]);
          setMainOpen(true);
          setIsOpen(true);
        } else {
          setVariant('full');
          setActiveTab(openTab ?? TABS[0]);
          setMainOpen(true);
          setIsOpen(true);
        }
      },
      close: () => {
        setMainOpen(false);
        setIsOpen(false);
      },
      isOpen: () => isOpen,
    };

    tradePanelRef.current = handle;
  }, [tradePanelRef, isOpen, setLimitPrice]);
  const [isSubmitLocked, setIsSubmitLocked] = useState(false);
  const submitLockRef = useRef(false);
  const selectedAccount = useAccountStore((s) => s.selectedAccount);
  const demo = Boolean(selectedAccount?.accountTypeId.includes('demo'));
  const demoContext = demoOrderContext({
    demo,
    online: navigator.onLine,
    connected: isConnected,
    reconnecting: isReconnecting,
    limit: false,
    bid: Number(rt?.bid ?? 0),
    ask: Number(rt?.ask ?? 0),
    publicPrice: Number(symbolAsset?.tokenPrice ?? symbolAsset?.referencePrice ?? 0),
  });
  const canTrade = demoContext.canTrade;

  const { data: portfolioItem } = usePortfolioItem({
    accountId: selectedAccount?.id || '',
    assetId: symbolAsset?.id,
  });
  const baseAvailableQuantity = Number(
    portfolioItem?.availableQuantity ?? portfolioItem?.quantity ?? 0,
  );
  const sellPrice = demoContext.bid;
  const buyPrice = demoContext.ask;
  const { availableBalance } = useAccountSummaryMetrics();
  const limitPriceNumber = Number.parseFloat(normalizeDecimalInput(limitPrice)) || 0;
  const rtAsk = toFiniteNumberFromNumberish(rt?.ask ?? buyPrice) ?? 0;
  const rtBid = toFiniteNumberFromNumberish(rt?.bid ?? sellPrice) ?? 0;

  const referencePriceNumber = useMemo(() => {
    const referencePriceValue =
      (symbolAsset as { referencePrice?: string } | undefined)?.referencePrice ?? '';
    const parsed = Number(referencePriceValue);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [symbolAsset]);

  const currentPrice = useMemo(() => {
    const askPrice = Number(rt?.ask);
    const bidPrice = Number(rt?.bid);
    if (Number.isFinite(askPrice) && Number.isFinite(bidPrice) && askPrice > 0 && bidPrice > 0) {
      return (askPrice + bidPrice) / 2;
    }

    const parsedLimitPrice = Number.parseFloat(normalizeDecimalInput(limitPrice));
    return Number.isFinite(parsedLimitPrice) && parsedLimitPrice > 0 ? parsedLimitPrice : 0;
  }, [rt?.ask, rt?.bid, limitPrice]);

  const totalCost = useMemo(() => {
    const qty = Number(quantity);
    const priceForTotal =
      activeTab === 'Market' ? currentPrice || referencePriceNumber : limitPriceNumber;
    if (!Number.isFinite(qty) || qty <= 0 || priceForTotal <= 0) return 0;
    return qty * priceForTotal;
  }, [activeTab, quantity, referencePriceNumber, currentPrice, limitPriceNumber]);
  const { refetch: refetchOrders } = useInfiniteOrders({
    accountId: selectedAccount?.id || '',
    status: [OrderStatus.OPEN, OrderStatus.PARTIALLY_FILLED],
  });

  const { isBuyLimitInvalid, isSellLimitInvalid } = useMemo(() => {
    const limitFlags = computeTradePanelLimitStopFlags({
      activeTab,
      limitPriceNumber,
      rtAsk,
      rtBid,
      takeProfitNumber: null,
      stopLossNumber: null,
      triggerType: 'price',
    });

    return {
      isBuyLimitInvalid: limitFlags.isBuyLimitInvalid,
      isSellLimitInvalid: limitFlags.isSellLimitInvalid,
    };
  }, [activeTab, limitPriceNumber, rtAsk, rtBid]);

  const symbolDigit = symbolAsset?.digit ?? 2;

  const minTradeSize = Math.max(toPositiveAssetNumber(symbolAsset?.minTradeSize, 0.01), 0.01);
  const maxTradeSize = Math.max(
    toPositiveAssetNumber(symbolAsset?.maxTradeSize, 200),
    minTradeSize,
  );
  const volumeStepNum = useMemo(() => {
    return toPositiveAssetNumber(symbolAsset?.volumeStep, 0.01);
  }, [symbolAsset?.volumeStep]);

  const lastSymbolRef = useRef<string | null>(null);
  useEffect(() => {
    if (!Number.isFinite(minTradeSize) || minTradeSize <= 0) return;

    const resetId = window.setTimeout(() => {
      const symbolChanged = lastSymbolRef.current !== symbol;
      if (symbolChanged) {
        lastSymbolRef.current = symbol;
        setIsQuantityTouched(false);
        setQuantity('1.00');
        return;
      }

      if (!isQuantityTouched && !quantity) {
        setQuantity('1.00');
      }
    }, 0);
    return () => window.clearTimeout(resetId);
  }, [symbol, minTradeSize, isQuantityTouched, quantity]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hideId = window.setTimeout(() => setShowMiniChart(false), 0);
    if (mainOpen && variant === 'full') {
      const timeoutId = window.setTimeout(() => {
        setShowMiniChart(true);
      }, 300);

      return () => {
        window.clearTimeout(timeoutId);
        window.clearTimeout(hideId);
      };
    }

    return () => window.clearTimeout(hideId);
  }, [mainOpen, variant]);

  const handleSubmitOrder = useCallback(
    (sideOverride?: (typeof ORDER_SIDES)[keyof typeof ORDER_SIDES]) => {
      submitTradePanelOrder(sideOverride, {
        user,
        router,
        canTrade,
        showError,
        showSuccess,
        t,
        symbolAsset,
        isCreatingOrder,
        submitLockRef,
        quantity,
        volumeStepNum,
        minTradeSize,
        maxTradeSize,
        setQuantity,
        activeTab,
        transactionType,
        symbol,
        sellPrice,
        buyPrice,
        quoteAvailableBalance: availableBalance.toNumber(),
        baseAvailableQuantity,
        accountId: selectedAccount?.id,
        limitPrice,
        createOrder,
        refetchOrders,
        tradePanelRef,
        setIsSubmitLocked,
      });
    },
    [
      user,
      router,
      canTrade,
      showError,
      showSuccess,
      t,
      symbolAsset,
      isCreatingOrder,
      quantity,
      volumeStepNum,
      minTradeSize,
      maxTradeSize,
      setQuantity,
      activeTab,
      transactionType,
      symbol,
      sellPrice,
      buyPrice,
      availableBalance,
      baseAvailableQuantity,
      selectedAccount?.id,
      limitPrice,
      createOrder,
      refetchOrders,
      tradePanelRef,
    ],
  );

  const sheetHeightClass = variant === 'full' ? 'h-[90dvh]' : 'h-[20dvh]';
  const isModal = variant === 'full';
  const scrollTouchStartYRef = useRef<number | null>(null);

  const myChart = useMemo(() => <MiniBidAskChart symbol={symbol} />, [symbol]);

  return (
    <>
      <Dialog
        open={mainOpen}
        modal={isModal}
        onOpenChange={(open) => {
          setMainOpen(open);
          setIsOpen(open);
        }}
      >
        <DialogContent
          forceMount
          aria-describedby={undefined}
          showCloseButton={false}
          onInteractOutside={(e) => {
            if (!isModal) e.preventDefault();
          }}
          className={`text-foreground flex flex-col border-none bg-white p-0 dark:bg-neutral-900 ${sheetHeightClass} ${
            variant === 'full' ? 'rounded-t' : 'rounded-t'
          }`}
        >
          <DialogTitle className="sr-only">{t('trade.sheetTitle', { symbol })}</DialogTitle>
          <div className="border-border flex h-full flex-col overflow-hidden border-b shadow-[0_2px_10px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.35)]">
            <div
              className={`flex-1 py-4 ${variant === 'compact' ? 'overflow-hidden' : 'no-scrollbar overflow-y-auto'}`}
              onWheel={(e) => {
                if (variant !== 'compact') return;
                if (e.deltaY < -10) setVariant('full');
              }}
              onTouchStart={(e) => {
                if (variant !== 'compact') return;
                scrollTouchStartYRef.current = e.touches[0]?.clientY ?? null;
              }}
              onTouchMove={(e) => {
                if (variant !== 'compact') return;
                const startY = scrollTouchStartYRef.current;
                if (startY == null) return;
                const currentY = e.touches[0]?.clientY;
                if (currentY == null) return;
                const deltaY = currentY - startY;
                if (deltaY < -35) {
                  setVariant('full');
                  scrollTouchStartYRef.current = null;
                }
              }}
              onTouchEnd={() => {
                scrollTouchStartYRef.current = null;
              }}
            >
              <TradePanelSymbolHeader
                symbol={displaySymbol}
                descSymbol={descSymbol}
                sellPrice={sellPrice}
                buyPrice={buyPrice}
                formatQuote={formatQuote}
              />

              <TradePanelOrderTypeTabs
                activeTab={activeTab}
                onTabChange={setActiveTab}
                getTabLabel={getTabLabel}
              />

              <TradePanelVolumeControl
                quantity={quantity}
                setQuantity={setQuantity}
                setIsQuantityTouched={setIsQuantityTouched}
                minTradeSize={minTradeSize}
                maxTradeSize={maxTradeSize}
                volumeStep={volumeStepNum}
              />

              <div className="px-4">
                {activeTab !== 'Market' && (
                  <TradePanelLimitPriceField
                    priceLabel={t('trade.price')}
                    notSetLabel={t('trade.notSet')}
                    limitPrice={limitPrice}
                    setLimitPrice={setLimitPrice}
                    symbolDigit={symbolDigit}
                    transactionType={transactionType}
                    sellPrice={sellPrice}
                    buyPrice={buyPrice}
                  />
                )}
              </div>

              <div className="mt-3 flex items-center justify-between px-4">
                <p className="text-body-small-regular text-[#0158ff]">
                  {t('trade.totalCost', { defaultValue: 'Total Cost' })}:{' '}
                  <span className="text-foreground font-semibold">
                    â‰ˆ{formatBalance(totalCost)}
                  </span>
                </p>
                {activeTab === 'Market' && referencePriceNumber > 0 && (
                  <p className="text-body-small-regular text-muted-foreground">
                    {t('trade.referencePrice', { defaultValue: 'Reference' })}:{' '}
                    {formatBalance(referencePriceNumber)}
                  </p>
                )}
              </div>

              {showMiniChart ? (
                <div className="border-border mt-4 h-44.5 border-t">{myChart}</div>
              ) : (
                <div className="border-border mt-4 h-44.5 border-t">
                  <SplashLogo size={240} fullScreen={false} showBackground={false} />
                </div>
              )}
            </div>
            {variant === 'full' && (
              <TradePanelActionBar
                sellLabel={`${t('trade.sell')} ${displaySymbol}`}
                buyLabel={`${t('trade.buy')} ${displaySymbol}`}
                isCreatingOrder={isCreatingOrder}
                isSubmitLocked={isSubmitLocked}
                sellDisabled={activeTab === 'Limit' && isSellLimitInvalid}
                buyDisabled={activeTab === 'Limit' && isBuyLimitInvalid}
                availableBalanceLabel={t('trade.availableBalance', {
                  defaultValue: 'Available',
                })}
                availableBalanceValue={
                  transactionType === 'sell'
                    ? `${formatBalance(baseAvailableQuantity)} ${symbol}`
                    : `${formatBalance(availableBalance.toNumber())} VND`
                }
                onSell={() => {
                  setTransactionType('sell');
                  handleSubmitOrder(ORDER_SIDES.SELL);
                }}
                onBuy={() => {
                  setTransactionType('buy');
                  handleSubmitOrder(ORDER_SIDES.BUY);
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default TradePanel;
