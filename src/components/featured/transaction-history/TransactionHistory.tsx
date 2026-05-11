'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { ChevronLeft, HelpCircle, SearchLg, FilterFunnel01 } from '@untitledui/icons';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/shared/atoms/button';
import { Skeleton } from '@/components/shared/atoms/skeleton';
import { ACCOUNT_TYPES_ID } from '@/constants/account';
import { useGetPaymentHistory } from '@/hook/payment/useGetPaymentHistory';
import { useAccounts } from '@/hook/useAccount';
import { useAccountStore } from '@/store/useAccountStore';
import type { PaymentHistoryItem } from '@/types/payment';
import { toEndOfDayISO, toStartOfDayISO } from '@/utils/dateUtils';
import DateRangePicker from './components/DateRangePicker';
import FilterTransaction from './components/FilterTransaction';
import TransactionCardDetails from './components/TransactionCardDetails';
import TransactionHistoryCard from './components/TransactionHistoryCard';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';

const IconTransactionHistory = ({ alt }: { alt: string }) => (
  <Image src="/assets/icons/iconTransactionHistory.png" alt={alt} width={44} height={44} />
);

const TransactionHistoryCardSkeleton = () => (
  <div className="border-border bg-card mb-3 flex w-full flex-col rounded border px-4 py-3">
    <div className="flex w-full flex-row items-start justify-between">
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex flex-row items-center gap-2">
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
type PaymentHistoryApiResponse =
  | { data: PaymentHistoryItem[]; total: number }
  | { data: { data: PaymentHistoryItem[]; total: number }; total?: number };

export default function TransactionHistory() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedAccount = useAccountStore((state) => state.selectedAccount);
  const { data: accounts = [] } = useAccounts();
  const isDemoAccount = selectedAccount?.accountTypeId === ACCOUNT_TYPES_ID.DEMO;

  const [selectedTransaction, setSelectedTransaction] = useState<PaymentHistoryItem | undefined>(
    undefined,
  );
  const [allTransactions, setAllTransactions] = useState<PaymentHistoryItem[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [pagination, setPagination] = useState({ take: 15, skip: 0 });
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [dateRange, setDateRange] = useState<{
    startDate?: string;
    endDate?: string;
  }>(() => {
    const start = searchParams.get('startDate');
    const end = searchParams.get('endDate');
    if (start && end) {
      return { startDate: start, endDate: end };
    }
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);
    return { startDate: toStartOfDayISO(weekAgo), endDate: toEndOfDayISO(today) };
  });

  const [filters, setFilters] = useState<{
    type?: number[];
    status?: number[];
  }>({
    type: searchParams
      .getAll('type')
      .map(Number)
      .filter((n) => !Number.isNaN(n)),
    status: searchParams
      .getAll('status')
      .map(Number)
      .filter((n) => !Number.isNaN(n)),
  });

  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    () => searchParams.get('accountId') || selectedAccount?.id || '',
  );

  useEffect(() => {
    const newParams = new URLSearchParams();
    if (dateRange.startDate) newParams.set('startDate', dateRange.startDate);
    if (dateRange.endDate) newParams.set('endDate', dateRange.endDate);
    if (selectedAccountId) newParams.set('accountId', selectedAccountId);
    filters.type?.forEach((t) => newParams.append('type', String(t)));
    filters.status?.forEach((s) => newParams.append('status', String(s)));

    router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });
  }, [dateRange, filters, selectedAccountId, router, pathname]);

  const apiTypes = useMemo(() => {
    if (!filters.type || filters.type.length === 0) return [];
    if (filters.type.includes(2)) {
      return [];
    }
    return filters.type;
  }, [filters.type]);

  const { data, isFetching } = useGetPaymentHistory({
    accountId: selectedAccountId || '',
    take: pagination.take,
    skip: pagination.skip,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    type: apiTypes,
    status: filters.status,
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
      list = rawList.filter((tx) => {
        const isOutgoingTransfer = tx.type === 1 && !!tx?.withdrawalMetadata?.toAccountId;
        const isIncomingTransfer = tx.type === 0 && !!tx?.withdrawalMetadata?.toAccountId;
        const isTransfer = isOutgoingTransfer || isIncomingTransfer;
        const isDeposit = tx.type === 0 && !isIncomingTransfer;
        const isWithdrawal = tx.type === 1 && !isOutgoingTransfer;

        if (filters.type!.includes(2) && isTransfer) return true;
        if (filters.type!.includes(0) && isDeposit) return true;
        if (filters.type!.includes(1) && isWithdrawal) return true;
        return false;
      });
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
    setIsLoadingMore(false);
    if (pagination.skip === 0) {
      setAllTransactions(newTransactions);
    } else {
      setAllTransactions((prev) => [...prev, ...newTransactions]);
    }
  }, [newTransactions, isFetching, pagination.skip]);

  const hasTransactions = allTransactions.length > 0;
  const hasMore = allTransactions.length < totalTransactions;

  const activeFiltersCount = (filters.type?.length || 0) + (filters.status?.length || 0);
  const hasActiveFilters = activeFiltersCount > 0;

  useEffect(() => {
    if (selectedAccount?.id && !searchParams.get('accountId') && !selectedAccountId) {
      setSelectedAccountId(selectedAccount.id);
    }
  }, [selectedAccount, selectedAccountId, searchParams]);

  return (
    <div className="bg-background flex h-full min-h-screen flex-col md:mx-auto md:max-w-3xl">
      {/* Header */}
      <div className="flex flex-row items-center justify-between px-4 py-3">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center p-1 transition-opacity hover:opacity-70"
        >
          <ChevronLeft className="text-foreground size-6" />
        </button>
        <h1 className="text-h3-semibold text-foreground">{t('transactionHistory.title')}</h1>
        <button className="flex items-center justify-center p-1 transition-opacity hover:opacity-70">
          <HelpCircle className="text-muted-foreground size-6" />
        </button>
      </div>

      {isDemoAccount ? (
        <div className="flex flex-1 items-center justify-center px-4 text-center">
          <p className="text-body-large-medium text-muted-foreground">
            {t('home.transactionHistoryDemoError', {
              defaultValue: 'Demo accounts cannot view transaction history.',
            })}
          </p>
        </div>
      ) : (
        <>
          {/* Filter Buttons */}
          <div className="mb-4 flex flex-row gap-2 px-4 py-3">
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
              {!hasActiveFilters && (
                <span className="text-body-large-medium text-foreground">
                  {t('transactionHistory.filter')}
                </span>
              )}
              {hasActiveFilters && (
                <span className="text-primary-500 text-body-large-medium">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </div>

          {/* Filter Modal Component */}
          <FilterTransaction
            isOpen={isFilterOpen}
            onClose={() => setIsFilterOpen(false)}
            accounts={accounts}
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

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto">
            {isFetching && !isLoadingMore ? (
              <div className="px-4 py-2">
                {[...Array(5)].map((_, index) => (
                  <TransactionHistoryCardSkeleton key={index} />
                ))}
              </div>
            ) : !hasTransactions ? (
              // Empty State
              <div className="flex h-[60vh] flex-col items-center justify-center px-4">
                <div className="flex flex-col items-center gap-4 text-center">
                  <IconTransactionHistory alt={t('transactionHistory.iconAlt')} />
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
              // Transaction List
              <div className="flex flex-col px-4 py-2">
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

                {/* Loading More Skeleton */}
                {isLoadingMore && (
                  <div className="mt-2 flex flex-col gap-3">
                    {[...Array(3)].map((_, index) => (
                      <TransactionHistoryCardSkeleton key={`loading-${index}`} />
                    ))}
                  </div>
                )}

                {/* View More Button */}
                {hasMore && !isLoadingMore && (
                  <Button
                    variant="neutral-contained"
                    className="my-4 w-full py-2.5"
                    onClick={() => {
                      setIsLoadingMore(true);
                      setPagination((prev) => ({ ...prev, skip: prev.skip + prev.take }));
                    }}
                  >
                    {t('transactionHistory.loadMore')}
                  </Button>
                )}

                {/* All Loaded Message */}
              </div>
            )}
          </div>
        </>
      )}

      {/* Transaction Details Modal Component */}
      <TransactionCardDetails
        transaction={selectedTransaction}
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
      />
    </div>
  );
}
