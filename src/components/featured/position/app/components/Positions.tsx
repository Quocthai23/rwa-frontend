'use client';
import { useAuthHydrated } from '@/hook/useAuthHydrated';
import { Check } from '@untitledui/icons';
import { useAuthStore } from '@/store/authStore';
import { useMarketSocketStore } from '@/store/marketSocketStore';
import { useAccountStore } from '@/store/useAccountStore';
import { usePositionSortStore, type HistoryFilter } from '@/store/positionSortStore';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { useCancelOrders } from '@/hook/useOrder';
import { useInfinitePositions, usePositionStats } from '@/hook/usePosition';
import { useSymbols } from '@/hook/useSymbols';
import SplashLogo from '@/components/shared/SplashLogo';
import type { Account } from '@/types/account';
import type { OrdersSortBy } from '@/types/orders';
import { Sheet, SheetContent } from '@/components/shared/atoms/sheet';
import HomeHeader from '../../../home/HomeHeader';
import { PositionHistoryTab, OrderHistoryTab, OrdersTab, PositionsTab } from '.';
import AccountSummary from './AccountSummary';
import { HistoryFilterModal } from '../shared/HistoryFilterModal';
import NoSignIn from './NoSignIn';
import SortModal from '../shared/SortModal';
import { Button } from '@/components/shared/atoms/button';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';

type DateRange = { startMs: number | null; endMs: number | null };
const EMPTY_RT_BY_SYMBOL: Record<string, { bid: number; ask: number }> = {};

function startOfDayMs(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfDayMs(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function parseYyyyMmDdToMs(yyyyMmDd: string, which: 'start' | 'end') {
  // Expect "YYYY-MM-DD"
  const [y, m, d] = yyyyMmDd.split('-').map((v) => Number(v));
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  return which === 'start' ? startOfDayMs(dt) : endOfDayMs(dt);
}

function getDateRangeFromFilter(filter: HistoryFilter): DateRange {
  const now = new Date();
  const endMs = endOfDayMs(now);
  const days =
    filter.period === '1 week'
      ? 7
      : filter.period === '1 month'
        ? 30
        : filter.period === '3 months'
          ? 90
          : filter.period === '6 months'
            ? 180
            : filter.period === '1 year'
              ? 365
              : null;

  if (filter.period === 'Custom') {
    const customStartMs = parseYyyyMmDdToMs(filter.customStartDate, 'start');
    const customEndMs = parseYyyyMmDdToMs(filter.customEndDate, 'end');
    return {
      startMs: customStartMs,
      endMs: customStartMs && !customEndMs ? endMs : customEndMs,
    };
  }

  if (days == null) return { startMs: null, endMs: null };

  const start = new Date(now);
  start.setDate(start.getDate() - days);
  return { startMs: startOfDayMs(start), endMs };
}
function PositionsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  type TabKey = 'Position History' | 'Order History' | 'Orders' | 'Positions';
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydratedAuth = useAuthHydrated();
  const [activeTab, setActiveTab] = useState<TabKey>('Positions');
  const [showTabsSheet, setShowTabsSheet] = useState(false);
  const tabButtonRefs = useRef<Record<TabKey, HTMLButtonElement | null>>({
    Positions: null,
    Orders: null,
    'Position History': null,
    'Order History': null,
  });
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const tabSorts = usePositionSortStore((state) => state.tabSorts);
  const setTabSort = usePositionSortStore((state) => state.setTabSort);
  const positionHistoryFilter = usePositionSortStore((state) => state.positionHistoryFilter);
  const orderHistoryFilter = usePositionSortStore((state) => state.orderHistoryFilter);
  const setPositionHistoryFilter = usePositionSortStore((state) => state.setPositionHistoryFilter);
  const setOrderHistoryFilter = usePositionSortStore((state) => state.setOrderHistoryFilter);

  const currentTabSort = tabSorts[activeTab];
  const selectedSort = currentTabSort.sort;
  const selectedDirection = currentTabSort.direction;
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [bulkOperationsModalVisible, setBulkOperationsModalVisible] = useState(false);
  const selectedAccount = useAccountStore((state) => state.selectedAccount);
  const { data: positionStats } = usePositionStats({
    accountId: selectedAccount?.id || '',
  });

  // Prepare symbols array for subscription
  const symbolsToSubscribe = !positionStats
    ? []
    : positionStats.fxRateSymbols && positionStats.fxRateSymbols.length > 0
      ? positionStats.fxRateSymbols
      : positionStats.positionSymbols && positionStats.positionSymbols.length > 0
        ? positionStats.positionSymbols
        : [];
  useSymbols(symbolsToSubscribe, symbolsToSubscribe.length > 0);
  const { data: apiData, isLoading: isLoadingPositions } = useInfinitePositions({
    accountId: selectedAccount?.id || '',
    status: [0, 1],
  });
  const activeAccount = selectedAccount;

  const ordersCount = positionStats?.openOrders ?? 0;
  const positionCount = positionStats?.openPositions ?? 0;

  const cancelOrdersMutation = useCancelOrders(activeAccount?.id || '');

  const rtBySymbol = useMarketSocketStore(
    useCallback(
      (s) => (activeTab === 'Positions' ? s.rtBySymbol : EMPTY_RT_BY_SYMBOL),
      [activeTab],
    ),
  );

  // Filter history data (status === 2 means closed)

  const tabs = ['Positions', 'Orders', 'Position History', 'Order History'] as const;
  const getTabLabel = (tab: TabKey) => {
    if (tab === 'Positions') return t('position.tabs.positions');
    if (tab === 'Orders') return t('position.tabs.orders');
    if (tab === 'Position History') return t('position.tabs.positionHistory');
    return t('position.tabs.orderHistory');
  };

  const centerTab = useCallback((tab: TabKey) => {
    const tabElement = tabButtonRefs.current[tab];
    if (!tabElement) return;

    tabElement.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, []);

  const handleChangeTab = (tab: TabKey) => {
    setShowTabsSheet(false);

    const tabParam =
      tab === 'Positions'
        ? null
        : tab === 'Orders'
          ? 'orders'
          : tab === 'Position History'
            ? 'position-history'
            : 'order-history';

    const params = new URLSearchParams(searchParams.toString());
    if (tabParam) {
      params.set('tab', tabParam);
    } else {
      params.delete('tab');
    }

    const nextQuery = params.toString();
    const currentQuery = searchParams.toString();
    if (nextQuery === currentQuery) return;

    router.push(nextQuery ? `?${nextQuery}` : '/position');
  };
  useEffect(() => {
    if (!hasHydratedAuth || !isAuthenticated) return;
    centerTab(activeTab);
  }, [activeTab, centerTab, hasHydratedAuth, isAuthenticated]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    const tabFromQuery: TabKey | null =
      tabParam === 'positionTab' || tabParam === 'positions'
        ? 'Positions'
        : tabParam === 'orderTab' || tabParam === 'orders'
          ? 'Orders'
          : tabParam === 'position-history'
            ? 'Position History'
            : tabParam === 'order-history'
              ? 'Order History'
              : null;

    const tabToUse = tabFromQuery || 'Positions';

    if (tabToUse !== activeTab) {
      setActiveTab(tabToUse);
      setShowTabsSheet(false);
      requestAnimationFrame(() => {
        centerTab(tabToUse);
      });
    }
  }, [searchParams, activeTab, centerTab]);

  // Sort options for Positions tab
  const positionsSortOptions = useMemo(
    () => [
      { label: t('position.sort.default'), value: null },
      // { label: t('position.sort.symbol'), value: 'symbol' },
      { label: t('position.sort.openTime'), value: 'openedAt' },
      { label: t('position.sort.volume'), value: 'quantity' },
    ],
    [t],
  );
  // Sort options for Orders tab
  const ordersSortOptions = useMemo(
    () => [
      { label: t('position.sort.default'), value: null },
      // { label: t('position.sort.symbol'), value: 'symbol' },
      { label: t('position.sort.openTime'), value: 'createdAt' },
      { label: t('position.sort.type'), value: 'orderType' },
      { label: t('position.sort.volume'), value: 'quantity' },
    ],
    [t],
  );
  const positionHistorySortOptions = useMemo(
    () => [
      { label: t('position.sort.default'), value: null },
      // { label: t('position.sort.symbol'), value: 'symbol' },
      { label: t('position.sort.openTime'), value: 'openedAt' },
      { label: t('position.sort.closeTime'), value: 'closedAt' },
      { label: t('position.sort.type'), value: 'side' },
      { label: t('position.sort.volume'), value: 'quantity' },
      { label: t('position.sort.profit'), value: 'realizedPnl' },
    ],
    [t],
  );
  const orderHistorySortOptions = useMemo(
    () => [
      { label: t('position.sort.default'), value: null },
      // { label: t('position.sort.symbol'), value: 'symbol' },
      { label: t('position.sort.openTime'), value: 'createdAt' },
      { label: t('position.sort.type'), value: 'orderType' },
      { label: t('position.sort.volume'), value: 'quantity' },
      { label: t('position.sort.status'), value: 'status' },
    ],
    [t],
  );
  // Get current sort options based on active tab
  const currentSortOptions =
    activeTab === 'Positions'
      ? positionsSortOptions
      : activeTab === 'Orders'
        ? ordersSortOptions
        : activeTab === 'Position History'
          ? positionHistorySortOptions
          : orderHistorySortOptions;

  const positionHistoryDateRange = useMemo(
    () => getDateRangeFromFilter(positionHistoryFilter),
    [positionHistoryFilter],
  );
  const orderHistoryDateRange = useMemo(
    () => getDateRangeFromFilter(orderHistoryFilter),
    [orderHistoryFilter],
  );

  const openFilterModal = useCallback(() => setFilterModalVisible(true), []);
  const openSortModal = useCallback(() => setSortModalVisible(true), []);

  const positionHistoryTabFilter = useMemo(
    () => ({
      direction: positionHistoryFilter.direction,
      dateRange: positionHistoryDateRange,
    }),
    [positionHistoryFilter.direction, positionHistoryDateRange],
  );

  const orderHistoryTabFilter = useMemo(
    () => ({
      direction: orderHistoryFilter.direction,
      dateRange: orderHistoryDateRange,
    }),
    [orderHistoryFilter.direction, orderHistoryDateRange],
  );

  const currentHistoryFilter =
    activeTab === 'Position History' ? positionHistoryFilter : orderHistoryFilter;

  const handleApplyHistoryFilter = (filter: HistoryFilter) => {
    if (activeTab === 'Position History') {
      setPositionHistoryFilter(filter);
      return;
    }

    if (activeTab === 'Order History') {
      setOrderHistoryFilter(filter);
    }
  };

  if (!hasHydratedAuth) {
    return <SplashLogo size={300} />;
  }

  if (!isAuthenticated) {
    return <NoSignIn />;
  }

  return (
    <>
      <div className="bg-background text-foreground flex h-[calc(100dvh-64px)] min-h-0 flex-col overflow-hidden">
        <div className="bg-background sticky top-0 z-50">
          <HomeHeader />
        </div>
        <div className="bg-background sticky top-14 z-19">
          <AccountSummary position={apiData} activeAccount={activeAccount as Account} />
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3 px-4">
          <div className="bg-background sticky top-0 z-10">
            <div className="relative">
              <div
                className="bg-background scrollbar-hide mr-10 flex flex-row overflow-x-auto"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {tabs.map((tab) => {
                  let count = 0;
                  if (tab === 'Positions') {
                    count = positionCount;
                  } else if (tab === 'Orders') {
                    count = ordersCount;
                  }

                  return (
                    <button
                      key={tab}
                      ref={(element) => {
                        tabButtonRefs.current[tab] = element;
                      }}
                      className="border-border bg-background relative flex-1 shrink-0 border-b border-neutral-200 px-4 py-1.5 text-left whitespace-nowrap dark:border-neutral-800"
                      onClick={() => {
                        handleChangeTab(tab);
                      }}
                    >
                      <div className="flex flex-row items-center justify-center gap-1">
                        <span
                          className={`text-center ${
                            activeTab === tab
                              ? 'text-body-large-semibold text-primary-500'
                              : 'text-body-large-regular text-muted-foreground'
                          }`}
                        >
                          {getTabLabel(tab)}
                        </span>
                        {(tab === 'Positions' || tab === 'Orders') && (
                          <div
                            className={`bg-primary-50 dark:bg-primary-900 h-5 w-8 rounded-full text-center`}
                          >
                            <p className="text-caption-medium text-primary-500 dark:text-primary-200 flex h-full items-center justify-center">
                              {count > 9 ? '9+' : count}
                            </p>
                          </div>
                        )}
                      </div>

                      {activeTab === tab && (
                        <div className="bg-primary-500 absolute right-0 bottom-0 left-0 h-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>
              <Button
                variant="white-contained"
                onClick={() => setShowTabsSheet(true)}
                className="bg-background absolute top-1/2 right-0 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-l-md"
              >
                <Image src="/icons/list.svg" alt="list" width={21.6} height={21.6} />
              </Button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1">
            {activeTab === 'Positions' ? (
              <PositionsTab
                selectedSort={selectedSort}
                sortOptions={positionsSortOptions}
                onSortPress={() => setSortModalVisible(true)}
                bulkOperationsModalVisible={bulkOperationsModalVisible}
                setBulkOperationsModalVisible={setBulkOperationsModalVisible}
                rtBySymbol={rtBySymbol}
                activeAccountId={activeAccount?.id || ''}
                data={apiData}
                isLoadingPositions={isLoadingPositions}
                selectedDirection={selectedDirection}
              />
            ) : activeTab === 'Orders' ? (
              <OrdersTab
                selectedSort={selectedSort as OrdersSortBy | null}
                sortOptions={ordersSortOptions as Array<{ label: string; value: OrdersSortBy }>}
                selectedDirection={selectedDirection}
                onSortPress={() => setSortModalVisible(true)}
                bulkOperationsModalVisible={bulkOperationsModalVisible}
                setBulkOperationsModalVisible={setBulkOperationsModalVisible}
                activeAccountId={activeAccount?.id || ''}
                cancelOrdersMutation={cancelOrdersMutation}
              />
            ) : activeTab === 'Position History' ? (
              <PositionHistoryTab
                selectedSort={selectedSort}
                sortOptions={positionHistorySortOptions}
                selectedDirection={selectedDirection}
                onFilterPress={openFilterModal}
                onSortPress={openSortModal}
                activeAccountId={activeAccount?.id || ''}
                filter={positionHistoryTabFilter}
              />
            ) : activeTab === 'Order History' ? (
              <OrderHistoryTab
                selectedSort={selectedSort}
                sortOptions={orderHistorySortOptions}
                selectedDirection={selectedDirection}
                onSortPress={openSortModal}
                activeAccountId={activeAccount?.id || ''}
                filter={orderHistoryTabFilter}
                onFilterPress={openFilterModal}
              />
            ) : null}
          </div>
        </div>

        {/* Sort Modal */}
        <Sheet open={showTabsSheet} onOpenChange={setShowTabsSheet}>
          <SheetContent
            side="bottom"
            showCloseButton={false}
            title={t('position.tabs.positions')}
            className="bg-background text-foreground mx-auto w-full max-w-192 rounded-t-lg dark:bg-neutral-800"
          >
            <div className="pb-4">
              <button className="border-border mb-2 w-full border-b border-neutral-200 px-4 pt-5 pb-3 text-left dark:border-neutral-800">
                <span className="text-h3-semibold text-foreground">
                  {t('position.modal.manageGroups')}
                </span>
              </button>

              {tabs.map((tab) => {
                const isActive = activeTab === tab;

                return (
                  <button
                    key={`sheet-${tab}`}
                    className="border-border flex w-full items-center justify-between px-4 py-3 dark:border-neutral-800"
                    onClick={() => handleChangeTab(tab)}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-body-large-medium ${isActive ? 'text-primary-500' : 'text-foreground'}`}
                      >
                        {getTabLabel(tab)}
                      </span>
                    </div>

                    {isActive && <Check size={18} className="text-primary-500" />}
                  </button>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>

        <SortModal
          visible={sortModalVisible}
          onClose={() => setSortModalVisible(false)}
          options={currentSortOptions}
          selectedSort={selectedSort}
          selectedDirection={selectedDirection}
          onSort={(field, direction) => {
            setTabSort(activeTab, field, direction);
            setSortModalVisible(false);
          }}
        />
        {filterModalVisible && (
          <HistoryFilterModal
            historyFilter={currentHistoryFilter}
            onClose={() => setFilterModalVisible(false)}
            onApply={handleApplyHistoryFilter}
          />
        )}
      </div>
    </>
  );
}

export default PositionsScreen;
