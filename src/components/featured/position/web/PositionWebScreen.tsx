'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { useClosePositions, useInfinitePositions, usePositionStats } from '@/hook/usePosition';
import { useCancelOrders, useInfiniteOrders } from '@/hook/useOrder';
import { useSymbols } from '@/hook/useSymbols';
import { cn } from '@/lib/utils';
import { useMarketSocketStore } from '@/store/marketSocketStore';
import { useAccountStore } from '@/store/useAccountStore';
import { useAuthStore } from '@/store/authStore';
import { useAuthHydrated } from '@/hook/useAuthHydrated';
import { useGetData } from '@/context/GetdataContext';
import { ORDER_TYPE_CODES } from '@/types/orders';
import { OrderItem, OrderStatus } from '@/types/orders';
import OpenPositionsTabContent from './components/tab/OpenPositionsTabContent';
import OpenOrdersTabContent from './components/tab/OpenOrdersTabContent';
import PositionHistoryTabContent from './components/tab/PositionHistoryTabContent';
import OrderHistoryTabContent from './components/tab/OrderHistoryTabContent';
import Image from 'next/image';
import { Button } from '@/components/shared/atoms/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/shared/atoms/dialog';
import AssetOverview from './components/AssetOverview';
import { Position } from '@/types';
import HistoryDateRangePicker, {
  getDefaultHistoryRange,
  type HistoryRangeValue,
} from './components/shared/HistoryDateRangePicker';
import { toISODateString } from '@/utils/dateUtils';
import {
  getEnrichedPositionsFromInfiniteData,
  splitPositionsByPnL,
} from '../utils/position.calculations';

const POSITION_HISTORY_RANGE_STORAGE_KEY = 'position:web:history-range:position';
const ORDER_HISTORY_RANGE_STORAGE_KEY = 'position:web:history-range:order';

function getDefaultDateRangeValue(): HistoryRangeValue {
  const { start, end } = getDefaultHistoryRange();
  return { fromDate: toISODateString(start), toDate: toISODateString(end) };
}

function readPersistedDateRange(storageKey: string): HistoryRangeValue | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<HistoryRangeValue>;
    if (typeof parsed.fromDate !== 'string' || typeof parsed.toDate !== 'string') return null;

    return { fromDate: parsed.fromDate, toDate: parsed.toDate };
  } catch {
    return null;
  }
}

function persistDateRange(storageKey: string, value: HistoryRangeValue) {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

type PositionWebTab = 'positions' | 'orders' | 'position-history' | 'order-history';

interface PositionWebScreenProps {
  setIsPositionPanelExpanded?: (expanded: boolean) => void;
  activeTab?: PositionWebTab;
  onTabChange?: (tab: PositionWebTab) => void;
}

export default function PositionWebScreen({
  setIsPositionPanelExpanded = () => {},
  activeTab: activeTabProp,
  onTabChange,
}: PositionWebScreenProps) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const checkPathname = pathname === '/position';
  const [isBulkCloseModalOpen, setIsBulkCloseModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PositionWebTab>(activeTabProp ?? 'positions');
  const selectedAccount = useAccountStore((state) => state.selectedAccount);
  const accountId = selectedAccount?.id || '';
  const positionRangeStorageKey = `${POSITION_HISTORY_RANGE_STORAGE_KEY}:${accountId}`;
  const orderRangeStorageKey = `${ORDER_HISTORY_RANGE_STORAGE_KEY}:${accountId}`;
  const [positionHistoryDateRange, setPositionHistoryDateRange] = useState<HistoryRangeValue>(
    () => readPersistedDateRange(positionRangeStorageKey) ?? getDefaultDateRangeValue(),
  );
  const [orderHistoryDateRange, setOrderHistoryDateRange] = useState<HistoryRangeValue>(
    () => readPersistedDateRange(orderRangeStorageKey) ?? getDefaultDateRangeValue(),
  );
  const { assets } = useGetData();

  const currentActiveTab = activeTabProp ?? activeTab;
  const handleTabChange = (tab: PositionWebTab) => {
    if (!activeTabProp) {
      setActiveTab(tab);
    }
    onTabChange?.(tab);
  };

  const POSITION_WEB_TABS: { id: PositionWebTab; label: string }[] = [
    { id: 'positions', label: t('position.tabs.positions', { defaultValue: 'Positions' }) },
    { id: 'orders', label: t('position.tabs.orders', { defaultValue: 'Orders' }) },
    {
      id: 'position-history',
      label: t('position.tabs.positionHistory', { defaultValue: 'Position History' }),
    },
    {
      id: 'order-history',
      label: t('position.tabs.orderHistory', { defaultValue: 'Order History' }),
    },
  ];

  useEffect(() => {
    setPositionHistoryDateRange(
      readPersistedDateRange(positionRangeStorageKey) ?? getDefaultDateRangeValue(),
    );
  }, [positionRangeStorageKey]);

  useEffect(() => {
    setOrderHistoryDateRange(
      readPersistedDateRange(orderRangeStorageKey) ?? getDefaultDateRangeValue(),
    );
  }, [orderRangeStorageKey]);

  useEffect(() => {
    persistDateRange(positionRangeStorageKey, positionHistoryDateRange);
  }, [positionHistoryDateRange, positionRangeStorageKey]);

  useEffect(() => {
    persistDateRange(orderRangeStorageKey, orderHistoryDateRange);
  }, [orderHistoryDateRange, orderRangeStorageKey]);

  const { data: openPositionsData } = useInfinitePositions(
    { accountId, status: [0, 1] },
    undefined,
    'active',
  );
  const { data: openOrdersData } = useInfiniteOrders(
    { accountId, status: [OrderStatus.NEW, OrderStatus.PARTIALLY_FILLED] },
    undefined,
    'active',
  );
  const closePositionsMutation = useClosePositions(accountId);
  const cancelOrdersMutation = useCancelOrders(accountId);

  const { data: stats } = usePositionStats({ accountId });
  const symbolsToSubscribe =
    stats?.fxRateSymbols?.length && stats.fxRateSymbols.length > 0
      ? stats.fxRateSymbols
      : (stats?.positionSymbols ?? []);
  useSymbols(symbolsToSubscribe, symbolsToSubscribe.length > 0);

  const rtBySymbol = useMarketSocketStore((state) => state.rtBySymbol);
  const hasHydratedAuth = useAuthHydrated();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const router = useRouter();
  const enrichedPositions = useMemo(
    () => getEnrichedPositionsFromInfiniteData(openPositionsData, assets),
    [openPositionsData, assets],
  );

  const { profitablePositions, losingPositions } = useMemo(
    () => splitPositionsByPnL(enrichedPositions, rtBySymbol),
    [enrichedPositions, rtBySymbol],
  );

  const allOpenOrders = useMemo(
    () => openOrdersData?.pages.flatMap((page: { data: OrderItem[] }) => page.data) ?? [],
    [openOrdersData],
  );
  const limitOrders = useMemo(
    () => allOpenOrders.filter((order) => order.orderType === ORDER_TYPE_CODES.LIMIT),
    [allOpenOrders],
  );
  const stopOrders = useMemo(
    () => allOpenOrders.filter((order) => order.orderType === ORDER_TYPE_CODES.STOP),
    [allOpenOrders],
  );

  if (hasHydratedAuth && !isAuthenticated) {
    return (
      <div
        className={cn(
          'bg-background border-border flex min-h-0 flex-col items-center justify-center gap-3 border-t',
          checkPathname ? 'h-[calc(100dvh-72px)]' : 'h-full',
          checkPathname ? 'p-8' : 'p-3',
        )}
      >
        <Button
          type="button"
          variant="primary-contained"
          className="text-body-large-semibold h-11 w-full max-w-sm text-white dark:text-black"
          onClick={() => router.push('/login')}
        >
          {t('auth.login.title', { defaultValue: 'Login' })}
        </Button>
        <Button
          type="button"
          variant="neutral-outline"
          className="text-body-large-semibold text-foreground h-11 w-full max-w-sm"
          onClick={() => router.push('/register')}
        >
          {t('auth.register.title', { defaultValue: 'Register' })}
        </Button>
      </div>
    );
  }

  const canShowBulkCloseButton = currentActiveTab === 'positions' || currentActiveTab === 'orders';
  const isHistoryTab =
    currentActiveTab === 'position-history' || currentActiveTab === 'order-history';

  const onBulkActionSuccess = () => {
    setIsBulkCloseModalOpen(false);
  };

  const handleBulkClosePositions = (positions: Position[]) => {
    if (positions.length === 0) {
      setIsBulkCloseModalOpen(false);
      return;
    }

    closePositionsMutation.mutate(positions, {
      onSuccess: onBulkActionSuccess,
    });
  };

  const handleBulkCancelOrders = (orders: OrderItem[]) => {
    if (orders.length === 0) {
      setIsBulkCloseModalOpen(false);
      return;
    }

    cancelOrdersMutation.mutate(orders, {
      onSuccess: onBulkActionSuccess,
    });
  };

  return (
    <div
      className={`flex ${checkPathname ? 'h-[calc(100dvh-72px)]' : 'h-[calc(100%)]'} ${checkPathname ? 'p-6' : 'p-1'} border-border bg-background flex-col gap-3 overflow-hidden border-t`}
    >
      {checkPathname && (
        <AssetOverview position={openPositionsData} activeAccount={selectedAccount!} />
      )}

      <div className="bg-background h-full min-h-0 flex-1 overflow-hidden">
        <div className="bg-background px-2">
          <div className="flex min-h-10 items-center justify-between gap-5">
            <div className="scrollbar-neutral-slim flex min-w-0 flex-1 gap-5 overflow-x-auto">
              {!checkPathname && (
                <Button
                  variant="white-contained"
                  onClick={() => setIsPositionPanelExpanded(false)}
                  aria-label="Collapse positions panel"
                  title="Collapse positions panel"
                  // className="text-muted-foreground hover:bg-muted hover:text-foreground shrink-0 rounded p-1 transition-colors"
                >
                  <Image
                    src="/web/svg/35962141.svg"
                    alt="Collapse positions panel"
                    width={20}
                    height={20}
                  />
                </Button>
              )}

              {POSITION_WEB_TABS.map((tab) => {
                const getTabLabel = () => {
                  switch (tab.id) {
                    case 'positions':
                      return `${tab.label}(${stats?.openPositions ?? 0})`;
                    case 'orders':
                      return `${tab.label}(${stats?.openOrders ?? 0})`;
                    default:
                      return tab.label;
                  }
                };

                return (
                  <Button
                    key={tab.id}
                    variant="white-contained"
                    onClick={() => handleTabChange(tab.id)}
                    className={cn(
                      'shrink-0 whitespace-nowrap transition-colors',
                      currentActiveTab === tab.id
                        ? 'text-primary-500 dark:text-primary-500 text-body-large-medium!'
                        : 'text-body-large-medium! text-muted-foreground hover:text-primary-500',
                    )}
                  >
                    {getTabLabel()}
                  </Button>
                );
              })}
            </div>

            {canShowBulkCloseButton && (
              <Button
                variant="white-contained"
                onClick={() => setIsBulkCloseModalOpen(true)}
                aria-label="Close positions panel"
                title="Close positions panel"
                className="text-primary-500 hover:text-primary-400 shrink-0 rounded px-3 py-1 transition-colors"
              >
                {t('position.modal.close')}
              </Button>
            )}

            {isHistoryTab && (
              <HistoryDateRangePicker
                value={
                  currentActiveTab === 'position-history'
                    ? positionHistoryDateRange
                    : orderHistoryDateRange
                }
                onRangeChange={(value) => {
                  if (currentActiveTab === 'position-history') {
                    setPositionHistoryDateRange(value);
                    return;
                  }

                  setOrderHistoryDateRange(value);
                }}
              />
            )}
          </div>
        </div>

        <div className="scrollbar-neutral-slim h-[calc(100%-35px)] overflow-auto py-1">
          {currentActiveTab === 'positions' ? (
            <OpenPositionsTabContent accountId={accountId} rtBySymbol={rtBySymbol} />
          ) : null}
          {currentActiveTab === 'orders' ? <OpenOrdersTabContent accountId={accountId} /> : null}
          {currentActiveTab === 'position-history' ? (
            <PositionHistoryTabContent accountId={accountId} dateRange={positionHistoryDateRange} />
          ) : null}
          {currentActiveTab === 'order-history' ? (
            <OrderHistoryTabContent accountId={accountId} dateRange={orderHistoryDateRange} />
          ) : null}
        </div>
      </div>

      <Dialog open={isBulkCloseModalOpen} onOpenChange={setIsBulkCloseModalOpen}>
        <DialogContent
          showCloseButton={false}
          aria-describedby={undefined}
          className="bg-background mx-auto w-full max-w-3xl rounded-lg border-none p-0"
        >
          <div className="border-border border-b px-4 pt-6 pb-4">
            <DialogTitle className="text-h3-semibold text-foreground">
              {t('position.modal.bulkOperations')}
            </DialogTitle>
          </div>

          {currentActiveTab === 'positions' ? (
            <>
              <div className="flex flex-col gap-3 px-4 pt-3">
                <Button
                  className="items-center px-4 py-3 disabled:opacity-50"
                  disabled={closePositionsMutation.isPending || enrichedPositions.length === 0}
                  onClick={() => handleBulkClosePositions(enrichedPositions)}
                  variant="neutral-contained"
                >
                  <p className="text-button-large-medium text-foreground">
                    {closePositionsMutation.isPending
                      ? t('position.modal.processing')
                      : t('position.modal.closeAllPositions')}
                  </p>
                </Button>
                <Button
                  className="items-center px-4 py-3 disabled:opacity-50"
                  disabled={closePositionsMutation.isPending || profitablePositions.length === 0}
                  onClick={() => handleBulkClosePositions(profitablePositions)}
                  variant="neutral-contained"
                >
                  <p className="text-button-large-medium text-foreground">
                    {closePositionsMutation.isPending
                      ? t('position.modal.processing')
                      : t('position.modal.closeProfitablePositions')}
                  </p>
                </Button>
                <Button
                  className="items-center px-4 py-3 disabled:opacity-50"
                  disabled={closePositionsMutation.isPending || losingPositions.length === 0}
                  onClick={() => handleBulkClosePositions(losingPositions)}
                  variant="neutral-contained"
                >
                  <p className="text-button-large-medium text-foreground">
                    {closePositionsMutation.isPending
                      ? t('position.modal.processing')
                      : t('position.modal.closeLosingPositions')}
                  </p>
                </Button>
              </div>
            </>
          ) : null}

          {currentActiveTab === 'orders' ? (
            <>
              <div className="flex flex-col gap-3 px-4 pt-3">
                <Button
                  className="items-center px-4 py-3 disabled:opacity-50"
                  disabled={cancelOrdersMutation.isPending || allOpenOrders.length === 0}
                  onClick={() => handleBulkCancelOrders(allOpenOrders)}
                  variant="neutral-contained"
                >
                  <p className="text-button-large-medium text-foreground">
                    {cancelOrdersMutation.isPending
                      ? t('position.modal.processing')
                      : t('position.modal.deleteAllOrders')}
                  </p>
                </Button>
                <Button
                  className="items-center px-4 py-3 disabled:opacity-50"
                  disabled={cancelOrdersMutation.isPending || limitOrders.length === 0}
                  onClick={() => handleBulkCancelOrders(limitOrders)}
                  variant="neutral-contained"
                >
                  <p className="text-button-large-medium text-foreground">
                    {cancelOrdersMutation.isPending
                      ? t('position.modal.processing')
                      : t('position.modal.deleteLimitOrders')}
                  </p>
                </Button>
                <Button
                  className="items-center px-4 py-3 disabled:opacity-50"
                  disabled={cancelOrdersMutation.isPending || stopOrders.length === 0}
                  onClick={() => handleBulkCancelOrders(stopOrders)}
                  variant="neutral-contained"
                >
                  <p className="text-button-large-medium text-foreground">
                    {cancelOrdersMutation.isPending
                      ? t('position.modal.processing')
                      : t('position.modal.deleteStopOrders')}
                  </p>
                </Button>
              </div>
            </>
          ) : null}

          <div className="mt-3 mb-6 px-4">
            <Button
              className="w-full py-3"
              onClick={() => setIsBulkCloseModalOpen(false)}
              variant="red-ghost"
            >
              <p className="text-button-large-medium text-red-500">{t('position.modal.cancel')}</p>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
