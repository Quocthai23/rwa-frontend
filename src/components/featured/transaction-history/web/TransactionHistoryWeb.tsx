'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { FilterFunnel01 } from '@untitledui/icons';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/shared/atoms/button';
import { Skeleton } from '@/components/shared/atoms/skeleton';
import { ACCOUNT_TYPES_ID } from '@/constants/account';
import { useGetPaymentHistory } from '@/hook/payment/useGetPaymentHistory';
import { useAccounts } from '@/hook/useAccount';
import { useAccountStore } from '@/store/useAccountStore';
import { isDemoAccount } from '@/lib/trading/environment';
import { DemoUnavailableState } from '@/components/shared/trading/LiveAccountOnly';
import type { PaymentHistoryItem, GetPaymentHistoryParams } from '@/types/payment';
import { toEndOfDayISO, toStartOfDayISO } from '@/utils/dateUtils';

import DateRangePicker from '../components/DateRangePicker';
import TransactionHistoryCard from '../components/TransactionHistoryCard';
import FilterTransactionWeb from './FilterTransactionWeb';
import TransactionCardDetailsWeb from './TransactionCardDetailsWeb';

type PaymentHistoryApiResponse =
  | { data: PaymentHistoryItem[]; total: number }
  | { data: { data: PaymentHistoryItem[]; total: number }; total?: number };

const TransactionHistoryCardSkeleton = () => (
  <div className="border-border bg-card mb-3 flex w-full flex-col rounded border px-4 py-3">
    <div className="flex w-full items-start justify-between">
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-center gap-2">
          <Skeleton className="size-6 rounded-full" />
          <Skeleton className="h-5 w-24 rounded" />
          <Skeleton className="h-6 w-16 rounded" />
        </div>
        <Skeleton className="h-4 w-32 rounded" />
      </div>
      <div className="flex flex-col items-end gap-2">
        <Skeleton className="h-5 w-20 rounded" />
        <Skeleton className="h-4 w-24 rounded" />
      </div>
    </div>
  </div>
);

export default function TransactionHistoryWeb() {
  const account = useAccountStore((s) => s.selectedAccount);
  if (isDemoAccount(account)) {
    return (
      <div className="flex h-full min-h-[620px] flex-col">
        <DemoUnavailableState className="min-h-60 flex-1" />
      </div>
    );
  }
  return <TransactionHistoryWebContent key={account?.id ?? 'no-account'} />;
}
function TransactionHistoryWebContent() {
  const { t } = useTranslation();
  const selectedAccount = useAccountStore((state) => state.selectedAccount);
  const { data: accounts = [] } = useAccounts();

  const [selectedTransaction, setSelectedTransaction] = useState<PaymentHistoryItem | undefined>(
    undefined,
  );
  const [allTransactions, setAllTransactions] = useState<PaymentHistoryItem[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [pagination, setPagination] = useState({ take: 15, skip: 0 });
  const [dateRange, setDateRange] = useState<{ startDate?: string; endDate?: string }>(() => {
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);
    return { startDate: toStartOfDayISO(weekAgo), endDate: toEndOfDayISO(today) };
  });
  const [filters, setFilters] = useState<{ type?: string[]; status?: string[] }>({
    type: [],
    status: [],
  });
  const [selectedAccountId, setSelectedAccountId] = useState<string>(selectedAccount?.id || '');

  useEffect(() => {
    if (selectedAccount?.id && !selectedAccountId) {
      setSelectedAccountId(selectedAccount.id);
      return;
    }

    if (!selectedAccount?.id && !selectedAccountId) {
      const firstLive = accounts.find((account) => account.accountTypeId !== ACCOUNT_TYPES_ID.DEMO);
      if (firstLive?.id) {
        setSelectedAccountId(firstLive.id);
      }
    }
  }, [accounts, selectedAccount?.id, selectedAccountId]);

  const apiType = useMemo(() => {
    if (!filters.type || filters.type.length === 0) return undefined;
    return filters.type[0] as GetPaymentHistoryParams['type'];
  }, [filters.type]);

  const apiStatus = useMemo(() => {
    if (!filters.status || filters.status.length === 0) return undefined;
    return filters.status[0] as GetPaymentHistoryParams['status'];
  }, [filters.status]);

  const { data, isFetching } = useGetPaymentHistory({
    accountId: selectedAccountId || '',
    take: pagination.take,
    skip: pagination.skip,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    type: apiType,
    status: apiStatus,
  });

  const { list: newTransactions, total: totalTransactions } = useMemo(() => {
    if (!data) return { list: [], total: 0 };
    const apiResponse = data as PaymentHistoryApiResponse;
    const responseData = apiResponse?.data;
    const rawList = Array.isArray(responseData)
      ? responseData
      : responseData && !Array.isArray(responseData) && Array.isArray(responseData.data)
        ? responseData.data
        : [];
    let list = rawList;
    if (filters.type && filters.type.length > 0) {
      list = rawList.filter((tx) => filters.type!.includes(tx.type));
    }

    const total =
      typeof apiResponse?.total === 'number'
        ? apiResponse.total
        : responseData && !Array.isArray(responseData) && typeof responseData.total === 'number'
          ? responseData.total
          : 0;
    return { list, total };
  }, [data, filters.type]);

  useEffect(() => {
    if (isFetching) return;
    setAllTransactions(newTransactions);
  }, [newTransactions, isFetching, pagination.skip]);

  const hasTransactions = allTransactions.length > 0;
  const page = Math.floor(pagination.skip / pagination.take) + 1;
  const pageCount = Math.max(1, Math.ceil(totalTransactions / pagination.take));
  const activeFiltersCount = (filters.type?.length || 0) + (filters.status?.length || 0);
  const hasActiveFilters = activeFiltersCount > 0;

  return (
    <div className="flex h-full min-h-[620px] flex-col">
      <div className="mb-3 flex items-center gap-2 py-1">
        <DateRangePicker
          onSelect={(dates) => {
            setDateRange({
              startDate: dates.startDate,
              endDate: dates.endDate,
            });
            setPagination({ take: 15, skip: 0 });
          }}
        />

        <Button
          variant={hasActiveFilters ? 'primary-ghost' : 'neutral-contained'}
          className="h-auto px-3 py-2"
          onClick={() => setIsFilterOpen(true)}
        >
          <FilterFunnel01
            size={16}
            className={hasActiveFilters ? 'text-primary-500' : 'text-foreground'}
          />
          {!hasActiveFilters ? (
            <span className="text-body-large-medium text-foreground">
              {t('transactionHistory.filter')}
            </span>
          ) : (
            <span className="text-primary-500 text-body-large-medium">{activeFiltersCount}</span>
          )}
        </Button>
      </div>

      <FilterTransactionWeb
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        accounts={accounts.filter(
          (a) =>
            a.accountTypeId.includes('demo') ===
            Boolean(selectedAccount?.accountTypeId.includes('demo')),
        )}
        selectedAccountId={selectedAccountId}
        onApply={(newFilters) => {
          setFilters({
            type: newFilters.type,
            status: newFilters.status,
          });
          setSelectedAccountId(newFilters.accountId);
          setPagination({ take: 15, skip: 0 });
        }}
      />

      <div className="scrollbar-neutral-slim flex-1 overflow-y-auto pr-1">
        {isFetching ? (
          <div className="py-2">
            {[...Array(5)].map((_, index) => (
              <TransactionHistoryCardSkeleton key={index} />
            ))}
          </div>
        ) : !hasTransactions ? (
          <div className="flex h-[50vh] flex-col items-center justify-center px-4">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex flex-col items-center gap-2">
                <h2 className="text-body-large-medium text-foreground">
                  {t('transactionHistory.empty.noMatch')}
                </h2>
                <p className="text-body-small-regular text-muted-foreground">
                  {t('transactionHistory.empty.trySearch')}
                </p>
              </div>
              <Button
                variant="primary-contained"
                className="px-6 py-2"
                onClick={() => {
                  const today = new Date();
                  const weekAgo = new Date();
                  weekAgo.setDate(today.getDate() - 7);
                  setDateRange({
                    startDate: toStartOfDayISO(weekAgo),
                    endDate: toEndOfDayISO(today),
                  });
                  setFilters({ type: [], status: [] });
                  setPagination({ take: 15, skip: 0 });
                }}
              >
                {t('transactionHistory.resetFilters')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col py-2">
            {allTransactions.map((transaction) => (
              <TransactionHistoryCard
                key={transaction.id}
                transaction={transaction}
                onPress={() => {
                  setSelectedTransaction(transaction);
                  setIsModalVisible(true);
                }}
              />
            ))}

            <nav
              aria-label={t('common.pagination', { defaultValue: 'Pagination' })}
              className="my-4 flex items-center justify-between gap-3"
            >
              <Button
                className="px-4 py-2"
                variant="neutral-contained"
                disabled={isFetching || page <= 1}
                onClick={() =>
                  setPagination((prev) => ({ ...prev, skip: Math.max(0, prev.skip - prev.take) }))
                }
              >
                {t('common.previous', { defaultValue: 'Previous' })}
              </Button>
              <span className="text-sm">
                {page} / {pageCount} · {totalTransactions}
              </span>
              <Button
                className="px-4 py-2"
                variant="neutral-contained"
                disabled={isFetching || page >= pageCount}
                onClick={() => setPagination((prev) => ({ ...prev, skip: prev.skip + prev.take }))}
              >
                {t('common.next', { defaultValue: 'Next' })}
              </Button>
            </nav>
          </div>
        )}
      </div>

      <TransactionCardDetailsWeb
        transaction={selectedTransaction}
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
      />
    </div>
  );
}
