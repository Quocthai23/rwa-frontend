'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { useCancelOrders, useInfiniteOrders } from '@/hook/useOrder';
import { cn } from '@/lib/utils';
import { useMarketSocketStore } from '@/store/marketSocketStore';
import { useAccountStore } from '@/store/useAccountStore';
import { useAuthStore } from '@/store/authStore';
import { useAuthHydrated } from '@/hook/useAuthHydrated';
import { OrderItem, OrderStatus } from '@/types/orders';
import PortfolioTabContent from './components/tab/PortfolioTabContent';
import OpenOrdersTabContent from './components/tab/OpenOrdersTabContent';
import OrderHistoryTabContent from './components/tab/OrderHistoryTabContent';
import Image from 'next/image';
import { Button } from '@/components/shared/atoms/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/shared/atoms/dialog';
import AssetOverview from './components/AssetOverview';
import HistoryDateRangePicker, {
  getDefaultHistoryRange,
  type HistoryRangeValue,
} from './components/shared/HistoryDateRangePicker';
import { toISODateString } from '@/utils/dateUtils';

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

type PositionWebTab = 'portfolio' | 'orders' | 'order-history';

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
  const [activeTab, setActiveTab] = useState<PositionWebTab>(activeTabProp ?? 'portfolio');
  const selectedAccount = useAccountStore((state) => state.selectedAccount);
  const accountId = selectedAccount?.id || '';
  const POSITION_WEB_TABS = [
    { id: 'portfolio', label: t('position.tabs.portfolio', { defaultValue: 'My Portfolio / Assets' }) },
    { id: 'orders', label: t('position.tabs.orders', { defaultValue: 'Open Orders' }) },
    {
      id: 'order-history',
      label: t('position.tabs.orderHistory', { defaultValue: 'Order History' }),
    },
  ] as const;

  const currentActiveTab = activeTabProp ?? activeTab;
  const handleTabChange = (tab: PositionWebTab) => {
    if (!activeTabProp) {
      setActiveTab(tab);
    }
    onTabChange?.(tab);
  };

  const [orderHistoryDateRange, setOrderHistoryDateRange] = useState<HistoryRangeValue>(
    () => readPersistedDateRange(ORDER_HISTORY_RANGE_STORAGE_KEY) ?? getDefaultDateRangeValue(),
  );

  useEffect(() => {
    setOrderHistoryDateRange(
      readPersistedDateRange(ORDER_HISTORY_RANGE_STORAGE_KEY) ?? getDefaultDateRangeValue(),
    );
  }, []);

  useEffect(() => {
    persistDateRange(ORDER_HISTORY_RANGE_STORAGE_KEY, orderHistoryDateRange);
  }, [orderHistoryDateRange]);

  const { data: openOrdersData } = useInfiniteOrders(
    { accountId, status: [OrderStatus.OPEN, OrderStatus.PARTIALLY_FILLED] },
    undefined,
    'active',
  );
  const cancelOrdersMutation = useCancelOrders(accountId);

  const rtBySymbol = useMarketSocketStore((state) => state.rtBySymbol);
  const hasHydratedAuth = useAuthHydrated();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const router = useRouter();

  const allOpenOrders = useMemo(
    () => openOrdersData?.pages.flatMap((page: { data: OrderItem[] }) => page.data) ?? [],
    [openOrdersData],
  );
  const limitOrders = useMemo(
    () =>
      allOpenOrders.filter((order) => order.orderType === 'LIMIT'),
    [allOpenOrders],
  );
  // Stop orders no longer supported in RWA backend

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

  const canShowBulkCloseButton = currentActiveTab === 'orders';
  const isHistoryTab = currentActiveTab === 'order-history';

  const handleBulkCancelOrders = (orders: OrderItem[]) => {
    if (orders.length === 0) {
      setIsBulkCloseModalOpen(false);
      return;
    }

    cancelOrdersMutation.mutate(orders, {
      onSuccess: () => {
        setIsBulkCloseModalOpen(false);
      },
    });
  };

  return (
    <div
      className={`flex ${checkPathname ? 'h-[calc(100dvh-72px)]' : 'h-[calc(100%)]'} ${checkPathname ? 'p-6' : 'p-1'} border-border bg-background flex-col gap-3 overflow-hidden border-t`}
    >
      {checkPathname && selectedAccount && (
        <AssetOverview activeAccount={selectedAccount} />
      )}

      <div className="bg-background h-full min-h-0 flex-1 overflow-hidden">
        <div className="bg-background px-2">
          <div className="flex min-h-10 items-center justify-between gap-5">
            <div className="scrollbar-neutral-slim flex min-w-0 flex-1 gap-5 overflow-x-auto">
              {!checkPathname && (
                <Button
                  variant="white-contained"
                  onClick={() => setIsPositionPanelExpanded(false)}
                  aria-label="Collapse portfolio panel"
                  title="Collapse portfolio panel"
                  // className="text-muted-foreground hover:bg-muted hover:text-foreground shrink-0 rounded p-1 transition-colors"
                >
                  <Image
                    src="/web/svg/35962141.svg"
                    alt="Collapse portfolio panel"
                    width={20}
                    height={20}
                  />
                </Button>
              )}

              {POSITION_WEB_TABS.map((tab) => {
                const getTabLabel = () => {
                  switch (tab.id) {
                    case 'orders':
                      return `${tab.label}(${allOpenOrders.length})`;
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
                aria-label="Cancel orders"
                title="Cancel orders"
                className="text-primary-500 hover:text-primary-400 shrink-0 rounded px-3 py-1 transition-colors"
              >
                {t('position.modal.cancelOrders', { defaultValue: 'Cancel Orders' })}
              </Button>
            )}

            {isHistoryTab && (
              <HistoryDateRangePicker
                value={orderHistoryDateRange}
                onRangeChange={(value) => {
                  setOrderHistoryDateRange(value);
                }}
              />
            )}
          </div>
        </div>

        <div className="scrollbar-neutral-slim h-[calc(100%-35px)] overflow-auto py-1">
          {currentActiveTab === 'portfolio' ? (
            <PortfolioTabContent accountId={accountId} rtBySymbol={rtBySymbol} />
          ) : null}
          {currentActiveTab === 'orders' ? <OpenOrdersTabContent accountId={accountId} /> : null}
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
