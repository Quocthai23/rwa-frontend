'use client';

import { Eye, EyeOff, Moon01, ChevronDown, ChevronRight, Sun, Check } from '@untitledui/icons';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/shared/atoms/button';
import { useAccountStore } from '@/store/useAccountStore';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from 'react-i18next';
import { ACCOUNT_TYPES_ID } from '@/constants/account';
import { formatBalance } from '@/utils/currency';
import type { SharedHeaderProps } from './AppHeader';
import { useTheme } from '@/theme';
import DepositFlowSheet from '@/components/featured/deposit/web/DepositFlowSheet';
import TopUpFlowSheet from '@/components/featured/top-up/web/TopUpFlowSheet';
import Search from '@/components/featured/search/web/Search';
import { cn } from '@/lib/utils';
import { useAccountSummaryMetrics } from '@/hook/useAccountSummaryMetrics';

export type WebHeaderProps = Omit<SharedHeaderProps, 'label'> & {
  label?: string;
};

type HeaderMetricId = 'equity' | 'available' | 'totalPnl' | 'balance';

type HeaderMetricOption = {
  id: HeaderMetricId;
  label: string;
  value: string;
  valueClassName?: string;
};

const HEADER_METRIC_STORAGE_KEY = 'web-header-selected-metrics';
const HEADER_METRIC_MAX = 3;
const FIXED_HEADER_METRIC_ID: HeaderMetricId = 'equity';
const MAX_OPTIONAL_HEADER_METRICS = HEADER_METRIC_MAX - 1;
const DEFAULT_HEADER_METRIC_IDS: HeaderMetricId[] = [FIXED_HEADER_METRIC_ID, 'available', 'balance'];

function isHeaderMetricId(value: string): value is HeaderMetricId {
  return (
    value === 'equity' ||
    value === 'available' ||
    value === 'totalPnl' ||
    value === 'balance'
  );
}

function normalizeHeaderMetricIds(ids: HeaderMetricId[]): HeaderMetricId[] {
  const optionalIds = ids
    .filter((id) => id !== FIXED_HEADER_METRIC_ID)
    .slice(0, MAX_OPTIONAL_HEADER_METRICS);
  return [FIXED_HEADER_METRIC_ID, ...optionalIds];
}

function getInitialHeaderMetricIds(): HeaderMetricId[] {
  if (typeof window === 'undefined') return DEFAULT_HEADER_METRIC_IDS;
  const raw = window.localStorage.getItem(HEADER_METRIC_STORAGE_KEY);
  if (!raw) return DEFAULT_HEADER_METRIC_IDS;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_HEADER_METRIC_IDS;
    const next = parsed
      .filter((item): item is string => typeof item === 'string')
      .filter(isHeaderMetricId)
      .slice(0, HEADER_METRIC_MAX + 1);
    return next.length > 0 ? normalizeHeaderMetricIds(next) : DEFAULT_HEADER_METRIC_IDS;
  } catch {
    return DEFAULT_HEADER_METRIC_IDS;
  }
}

export default function WebHeader({ label, rightItem }: WebHeaderProps) {
  const { t } = useTranslation();
  const { mode, setMode } = useTheme();
  const router = useRouter();
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [showDepositSheet, setShowDepositSheet] = useState(false);
  const [showTopUpSheet, setShowTopUpSheet] = useState(false);
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);
  const [isThemeSwitching, setThemeSwitching] = useState(false);
  const [selectedMetricIds, setSelectedMetricIds] =
    useState<HeaderMetricId[]>(getInitialHeaderMetricIds);
  const themeSwitchTimeoutRef = useRef<number | null>(null);
  const selectedAccount = useAccountStore((state) => state.selectedAccount);
  const selectAccount = useAccountStore((state) => state.selectAccount);
  const accounts = useAccountStore((state) => state.accounts);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const currentMode: 'demo' | 'live' = selectedAccount?.accountTypeId?.includes('demo')
    ? 'demo'
    : 'live';

  const { availableBalance, balance, currentUnrealizedPnl, equity } =
    useAccountSummaryMetrics();

  const handleSwitchMode = (mode: 'demo' | 'live') => {
    const nextAccount = accounts.find((account) =>
      mode === 'demo'
        ? account.accountTypeId === ACCOUNT_TYPES_ID.DEMO
        : account.accountTypeId !== ACCOUNT_TYPES_ID.DEMO,
    );
    if (nextAccount && nextAccount.id !== selectedAccount?.id) {
      selectAccount(nextAccount);
    }
  };
  const handleDepositClick = useCallback(() => {
    if (selectedAccount?.accountTypeId === ACCOUNT_TYPES_ID.DEMO) {
      setShowTopUpSheet(true);
      return;
    }

    setShowDepositSheet(true);
  }, [selectedAccount]);

  useEffect(() => {
    return () => {
      if (themeSwitchTimeoutRef.current !== null) {
        window.clearTimeout(themeSwitchTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(HEADER_METRIC_STORAGE_KEY, JSON.stringify(selectedMetricIds));
  }, [selectedMetricIds]);

  const accountValue = useCallback(
    (value: string) => (isBalanceHidden ? '***' : value),
    [isBalanceHidden],
  );

  const metricOptions = useMemo<HeaderMetricOption[]>(
    () => [
      {
        id: 'equity',
        label: t('market.accountDropdown.equity', { defaultValue: 'Equity' }),
        value: accountValue(`$${formatBalance(equity.toNumber())}`),
      },
      {
        id: 'available',
        label: t('account.available', { defaultValue: 'Available' }),
        value: accountValue(`$${formatBalance(availableBalance.toNumber())}`),
      },
      {
        id: 'totalPnl',
        label: t('market.accountDropdown.profitLoss', { defaultValue: 'Total PnL' }),
        value: accountValue(`${formatBalance(currentUnrealizedPnl.toNumber())}`),
        valueClassName: currentUnrealizedPnl.gte(0) ? 'text-green-500' : 'text-red-500',
      },
      {
        id: 'balance',
        label: t('account.balance', { defaultValue: 'Balance' }),
        value: accountValue(`$${formatBalance(balance.toNumber())}`),
      },
    ],
    [
      t,
      accountValue,
      equity,
      availableBalance,
      currentUnrealizedPnl,
      balance,
    ],
  );

  const selectedMetrics = useMemo(() => {
    const list = selectedMetricIds
      .map((id) => metricOptions.find((item) => item.id === id))
      .filter((item): item is HeaderMetricOption => Boolean(item));
    const fixedIndex = list.findIndex((i) => i.id === FIXED_HEADER_METRIC_ID);
    if (fixedIndex !== -1) {
      const [fixed] = list.splice(fixedIndex, 1);
      list.push(fixed);
    }
    return list;
  }, [metricOptions, selectedMetricIds]);

  const handleToggleMetric = useCallback((id: HeaderMetricId) => {
    setSelectedMetricIds((prev) => {
      const normalizedPrev = normalizeHeaderMetricIds(prev);
      if (id === FIXED_HEADER_METRIC_ID) {
        return normalizedPrev;
      }
      if (normalizedPrev.includes(id)) {
        return normalizedPrev.filter((item) => item !== id);
      }
      const optionalCount = normalizedPrev.length - 1;
      if (optionalCount >= MAX_OPTIONAL_HEADER_METRICS) {
        return normalizedPrev;
      }
      return [...normalizedPrev, id];
    });
  }, []);

  const handleToggleTheme = useCallback(() => {
    if (isThemeSwitching) return;
    const targetMode = mode === 'dark' ? 'light' : 'dark';

    setThemeSwitching(true);
    themeSwitchTimeoutRef.current = window.setTimeout(() => {
      requestAnimationFrame(() => {
        localStorage.setItem('tradingview.current_theme.name', targetMode);
        setMode(targetMode);
        themeSwitchTimeoutRef.current = window.setTimeout(() => {
          setThemeSwitching(false);
          themeSwitchTimeoutRef.current = null;
        }, 220);
      });
    }, 140);
  }, [isThemeSwitching, mode, setMode]);

  return (
    <div className="bg-background sticky top-0 z-40 min-h-14 border-b border-neutral-200 px-3 py-2 sm:min-h-16 sm:px-4 md:h-18 md:min-h-0 md:px-6 md:py-0 dark:border-neutral-800">
      <div className="flex h-full min-h-[inherit] flex-wrap items-center justify-between gap-x-2 gap-y-2 sm:gap-x-4 md:flex-nowrap md:gap-6">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4 md:gap-6">
          <div className="flex shrink-0 items-center gap-2">
            <Image
              src="/logo/logo-web.svg"
              alt="MTX Trading"
              width={175}
              height={28}
              className="h-5 w-auto sm:h-6 md:h-7 dark:hidden"
              priority
            />
            <Image
              src="/logo/logo-web-darkmode.svg"
              alt="MTX Trading"
              width={175}
              height={28}
              className="hidden h-5 w-auto sm:h-6 md:h-7 dark:block"
              priority
            />
          </div>

          <div className="focus-within:border-primary-500 w-[250px] rounded border border-neutral-200 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-50 dark:border-neutral-800">
            <Search
              placeholder={
                label ?? t('search.placeholderSymbol', { defaultValue: 'Search symbol' })
              }
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 text-right sm:gap-3 md:gap-5">
          {isAuthenticated ? (
            <>
              <div className="no-scrollbar flex max-w-full min-w-0 shrink-0 items-center gap-2 overflow-x-auto sm:max-w-none md:gap-3">
                {selectedMetrics.map((metric) =>
                  metric.id === 'equity' || metric.id === 'available' ? (
                    <div key={metric.id} className="max-[1208px]:hidden min-[1209px]:contents">
                      <Metric
                        label={metric.label}
                        value={metric.value}
                        valueClassName={metric.valueClassName}
                      />
                    </div>
                  ) : (
                    <Metric
                      key={metric.id}
                      label={metric.label}
                      value={metric.value}
                      valueClassName={metric.valueClassName}
                    />
                  ),
                )}
              </div>
              <div className="relative">
                <ChevronDown
                  size={24}
                  className={`size-6 transition-transform duration-200 ${
                    showAccountDropdown ? 'rotate-180' : 'rotate-0'
                  }`}
                  onClick={() => setShowAccountDropdown(true)}
                />
                {showAccountDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-[1000]"
                      onClick={() => setShowAccountDropdown(false)}
                    />
                    <div className="bg-background dark:bg-card absolute top-full right-0 z-[1000] mt-5 w-[min(360px,calc(100vw-1.5rem))] rounded-md border border-neutral-200 p-2 shadow-lg dark:border-neutral-800">
                      <div className="grid grid-cols-2 gap-1.5">
                        {metricOptions.map((metric) => {
                          const checked = selectedMetricIds.includes(metric.id);
                          const isFixedMetric = metric.id === FIXED_HEADER_METRIC_ID;
                          const selectedOptionalCount = selectedMetricIds.filter(
                            (id) => id !== FIXED_HEADER_METRIC_ID,
                          ).length;
                          const remainingOptionalSlots = Math.max(
                            0,
                            MAX_OPTIONAL_HEADER_METRICS - selectedOptionalCount,
                          );
                          const disableSelect =
                            !checked && !isFixedMetric && remainingOptionalSlots === 0;
                          const disabled = isFixedMetric || disableSelect;
                          const disabledReason =
                            !checked && !isFixedMetric
                              ? t('account.headerMetric.remainingOptional', {
                                  count: remainingOptionalSlots,
                                })
                              : undefined;
                          return (
                            <HeaderAccountMetricCard
                              key={metric.id}
                              checked={checked}
                              disabled={disabled}
                              disabledReason={disabledReason}
                              label={metric.label}
                              value={metric.value}
                              valueColor={metric.valueClassName}
                              onToggle={() => handleToggleMetric(metric.id)}
                            />
                          );
                        })}
                      </div>
                      <div className="mt-2 flex justify-center pb-3">
                        <Button
                          type="button"
                          variant="white-contained"
                          className="!text-primary-500 text-body-small-medium inline-flex items-center gap-1 bg-transparent p-0"
                          onClick={() => {
                            setShowAccountDropdown(false);
                            router.push('/position');
                          }}
                        >
                          <span>{t('common.seeMore', { defaultValue: 'See more' })}</span>
                          <ChevronRight size={14} />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <Button
                type="button"
                variant="white-contained"
                className="text-muted-foreground p-0"
                onClick={() => setIsBalanceHidden((prev) => !prev)}
                aria-label={isBalanceHidden ? 'Show account balances' : 'Hide account balances'}
                title={isBalanceHidden ? 'Show balances' : 'Hide balances'}
              >
                {isBalanceHidden ? <EyeOff className="size-6" /> : <Eye className="size-6" />}
              </Button>

              <Button
                type="button"
                variant="primary-contained"
                className="sm:text-body-small-medium px-2.5 py-1.5 text-xs sm:px-4 sm:py-2"
                onClick={handleDepositClick}
              >
                {t('features.deposit')}
              </Button>
              <DepositFlowSheet isOpen={showDepositSheet} onOpenChange={setShowDepositSheet} />
              <TopUpFlowSheet isOpen={showTopUpSheet} onOpenChange={setShowTopUpSheet} />

              <div className="flex shrink-0 rounded bg-neutral-100 dark:bg-neutral-800">
                <Button
                  type="button"
                  variant="white-contained"
                  onClick={() => handleSwitchMode('demo')}
                  aria-pressed={currentMode === 'demo'}
                  className={`sm:text-body-small-medium rounded px-2 py-1.5 text-xs sm:px-3 sm:py-2 dark:border ${
                    currentMode === 'demo'
                      ? 'dark:border-primary-500 bg-primary-50 text-primary-500 dark:bg-primary-1000 dark:text-primary-500'
                      : 'text-muted-foreground border-transparent bg-neutral-100 dark:bg-neutral-800 dark:text-[#9497A9]'
                  }`}
                >
                  <span>{t('market.accountDropdown.demo')}</span>
                </Button>
                <Button
                  type="button"
                  variant="white-contained"
                  onClick={() => handleSwitchMode('live')}
                  aria-pressed={currentMode === 'live'}
                  className={`sm:text-body-small-medium rounded px-2 py-1.5 text-xs sm:px-3 sm:py-2 dark:border ${
                    currentMode === 'live'
                      ? 'dark:border-primary-500 bg-primary-50 text-primary-500 dark:bg-primary-1000 dark:text-primary-500'
                      : 'text-muted-foreground border-transparent bg-neutral-100 dark:bg-neutral-800 dark:text-[#9497A9]'
                  }`}
                >
                  <span>{t('market.accountDropdown.live')}</span>
                </Button>
              </div>
            </>
          ) : (
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <Button
                type="button"
                variant="white-outline"
                className="sm:text-body-small-medium px-2.5 py-1.5 text-xs sm:px-4 sm:py-2"
                onClick={() => router.push('/login')}
              >
                {t('auth.login.title', { defaultValue: 'Login' })}
              </Button>
              <Button
                type="button"
                variant="primary-contained"
                className="sm:text-body-small-medium px-2.5 py-1.5 text-xs sm:px-4 sm:py-2"
                onClick={() => router.push('/register')}
              >
                {t('auth.register.title', { defaultValue: 'Sign up' })}
              </Button>
            </div>
          )}

          <div className="flex shrink-0 items-center justify-center gap-2 sm:gap-4">
            <Button
              type="button"
              variant="white-contained"
              className="cursor-pointer"
              onClick={handleToggleTheme}
              disabled={isThemeSwitching}
              aria-label={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={mode === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {mode === 'dark' ? (
                <Sun className="text-foreground size-5" />
              ) : (
                <Moon01 className="text-foreground size-5" />
              )}
            </Button>
          </div>
          {rightItem as ReactNode}
        </div>
      </div>
      {isThemeSwitching ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-white dark:bg-black">
          <div className="animate-pulse">
            <Image src="/logo/logo.png" alt="MTX Trading" width={84} height={84} priority />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Metric({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-[72px] shrink-0 text-right sm:min-w-[96px] md:min-w-[112px]">
      <p className="text-caption-regular text-muted-foreground truncate tabular-nums">{label}</p>
      <p
        className={`text-caption-regular sm:text-body-small-medium tabular-nums ${valueClassName ?? 'text-foreground'}`}
      >
        {value}
      </p>
    </div>
  );
}

function HeaderAccountMetricCard({
  checked = false,
  disabled = false,
  disabledReason,
  label,
  onToggle,
  value,
  valueColor,
}: {
  checked?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  label: string;
  onToggle?: () => void;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={cn(
          'w-full rounded p-1.5 text-left',
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        )}
      >
        <div className="flex items-start gap-2">
          <span
            className={`border-primary-500 dark:border-primary-500 dark:bg-background mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border ${checked ? 'border-primary-500 bg-primary-500 dark:bg-primary-500 text-neutral-900 text-white' : 'border-neutral-300 bg-neutral-100 text-transparent'}`}
          >
            <Check size={14} />
          </span>
          <div className="min-w-0 text-left">
            <p className="text-caption-regular text-muted-foreground text-left leading-none whitespace-nowrap tabular-nums">
              {label}
            </p>
            <p
              className={`text-body-small-semibold pt-[2px] text-left leading-tight tabular-nums ${valueColor ?? 'text-foreground'}`}
            >
              {value}
            </p>
          </div>
        </div>
      </button>
      {disabledReason ? (
        <span className="bg-foreground text-background pointer-events-none absolute -top-9 left-1/2 z-10 hidden -translate-x-1/2 rounded px-2 py-1 text-[11px] leading-tight whitespace-nowrap group-hover:block">
          {disabledReason}
        </span>
      ) : null}
    </div>
  );
}
