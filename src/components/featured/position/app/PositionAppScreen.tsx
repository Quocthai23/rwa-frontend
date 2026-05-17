'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAccountStore } from '@/store/useAccountStore';
import { useMarketSocketStore } from '@/store/marketSocketStore';
import AccountInfo from '@/components/featured/home/AccountInfo';
import PortfolioTabContent from '../web/components/tab/PortfolioTabContent';
import OpenOrdersTabContent from '../web/components/tab/OpenOrdersTabContent';
import OrderHistoryTabContent from '../web/components/tab/OrderHistoryTabContent';
import { cn } from '@/lib/utils';
import { Button } from '@/components/shared/atoms/button';
import { toISODateString } from '@/utils/dateUtils';
import { getDefaultHistoryRange } from '../web/components/shared/HistoryDateRangePicker';

export default function PositionAppScreen() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'portfolio' | 'orders' | 'history'>('portfolio');
  const selectedAccount = useAccountStore((state) => state.selectedAccount);
  const rtBySymbol = useMarketSocketStore((state) => state.rtBySymbol);
  const accountId = selectedAccount?.id || '';

  const { start, end } = getDefaultHistoryRange();
  const dateRange = { fromDate: toISODateString(start), toDate: toISODateString(end) };

  return (
    <div className="flex flex-col h-full bg-background">
      <AccountInfo />

      <div className="flex border-b border-border px-4 overflow-x-auto no-scrollbar">
        <Button
          variant="white-contained"
          onClick={() => setActiveTab('portfolio')}
          className={cn(
            'flex-1 rounded-none border-b-2 py-3 transition-colors !bg-transparent',
            activeTab === 'portfolio' ? 'border-primary-500 text-primary-500' : 'border-transparent text-muted-foreground'
          )}
        >
          {t('position.tabs.portfolio', { defaultValue: 'Portfolio' })}
        </Button>
        <Button
          variant="white-contained"
          onClick={() => setActiveTab('orders')}
          className={cn(
            'flex-1 rounded-none border-b-2 py-3 transition-colors !bg-transparent',
            activeTab === 'orders' ? 'border-primary-500 text-primary-500' : 'border-transparent text-muted-foreground'
          )}
        >
          {t('position.tabs.orders', { defaultValue: 'Orders' })}
        </Button>
        <Button
          variant="white-contained"
          onClick={() => setActiveTab('history')}
          className={cn(
            'flex-1 rounded-none border-b-2 py-3 transition-colors !bg-transparent',
            activeTab === 'history' ? 'border-primary-500 text-primary-500' : 'border-transparent text-muted-foreground'
          )}
        >
          {t('position.tabs.orderHistory', { defaultValue: 'History' })}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'portfolio' && (
          <PortfolioTabContent accountId={accountId} rtBySymbol={rtBySymbol} />
        )}
        {activeTab === 'orders' && <OpenOrdersTabContent accountId={accountId} />}
        {activeTab === 'history' && (
          <OrderHistoryTabContent accountId={accountId} dateRange={dateRange} />
        )}
      </div>
    </div>
  );
}
