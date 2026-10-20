'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AlertCircle, PlusCircle } from '@untitledui/icons';

import { WebLayout } from '@/components/layouts/WebLayout';
import { Button } from '@/components/shared/atoms/button';
import { Input } from '@/components/shared/atoms/input';
import { Skeleton } from '@/components/shared/atoms/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/atoms/dialog';
import { useFundRentalWallet, useMyRentalContracts } from '@/hook/useDividends';
import { localizeApiError } from '@/i18n/apiErrors';
import type { TenantRentalContract } from '@/services/dividendService';
import { useAccountStore } from '@/store/useAccountStore';

const vnd = (value?: string | number | null) =>
  `${Number(value ?? 0).toLocaleString('vi-VN', { maximumFractionDigits: 0 })} VND`;

export default function MyRentalsPage() {
  const { t } = useTranslation();
  const rentals = useMyRentalContracts();
  const contracts = useMemo(() => rentals.data ?? [], [rentals.data]);
  const summary = useMemo(
    () => ({
      totalWallet: contracts.reduce(
        (total, contract) => total + Number(contract.walletBalanceVnd || 0),
        0,
      ),
      totalMonthlyRent: contracts.reduce(
        (total, contract) => total + Number(contract.monthlyRentVnd || 0),
        0,
      ),
      needsAttention: contracts.filter((contract) =>
        ['PENDING_FUNDING', 'DELINQUENT'].includes(contract.status),
      ).length,
    }),
    [contracts],
  );

  return (
    <WebLayout>
      <main className="bg-background min-h-full overflow-y-auto">
        <div className="mx-auto w-full max-w-[1440px] px-5 py-6 lg:px-8">
          <h1 className="text-foreground text-2xl font-semibold">
            {t('myRentals.title', { defaultValue: 'Properties I rent' })}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {t('myRentals.description', {
              defaultValue:
                'Fund each VND contract wallet and review every automatic monthly deduction.',
            })}
          </p>
          {contracts.length > 0 ? (
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <SummaryMetric
                label={t('myRentals.totalContracts', { defaultValue: 'Rental contracts' })}
                value={String(contracts.length)}
              />
              <SummaryMetric
                label={t('myRentals.totalWallet', { defaultValue: 'Total contract wallet' })}
                value={vnd(summary.totalWallet)}
              />
              <SummaryMetric
                label={t('myRentals.monthlyCommitment', {
                  defaultValue: 'Monthly commitment',
                })}
                value={vnd(summary.totalMonthlyRent)}
                hint={
                  summary.needsAttention > 0
                    ? t('myRentals.needsAttention', {
                        count: summary.needsAttention,
                        defaultValue: '{{count}} contract needs attention',
                      })
                    : undefined
                }
              />
            </div>
          ) : null}
          {rentals.isLoading ? (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <Skeleton className="h-72 w-full" />
              <Skeleton className="h-72 w-full" />
            </div>
          ) : rentals.isError ? (
            <div className="border-border mt-6 flex min-h-48 flex-col items-center justify-center gap-3 border px-5 py-12 text-center">
              <p className="text-foreground text-sm font-semibold">
                {t('myRentals.loadError', { defaultValue: 'Unable to load rental contracts' })}
              </p>
              <p className="text-muted-foreground text-xs">
                {t('myRentals.loadErrorDescription', {
                  defaultValue:
                    'The server did not return your rental contracts. Please try again.',
                })}
              </p>
              <Button
                type="button"
                variant="neutral-outline"
                onClick={() => void rentals.refetch()}
              >
                {t('common.retry', { defaultValue: 'Retry' })}
              </Button>
            </div>
          ) : contracts.length ? (
            <div className="mt-6 space-y-5">
              {contracts.map((contract) => (
                <RentalContractCard key={contract.id} contract={contract} />
              ))}
            </div>
          ) : (
            <div className="border-border mt-6 border px-5 py-12 text-center">
              <p className="text-foreground text-sm font-semibold">
                {t('myRentals.emptyTitle', { defaultValue: 'No active rental contract' })}
              </p>
              <p className="text-muted-foreground mt-2 text-xs">
                {t('myRentals.emptyDescription', {
                  defaultValue: 'This section appears after shareholders approve your application.',
                })}
              </p>
            </div>
          )}
        </div>
      </main>
    </WebLayout>
  );
}

function RentalContractCard({ contract }: { contract: TenantRentalContract }) {
  const { t, i18n } = useTranslation();
  const fundWallet = useFundRentalWallet(contract.assetId);
  const accounts = useAccountStore((state) => state.accounts);
  const selectedAccount = useAccountStore((state) => state.selectedAccount);
  const [amount, setAmount] = useState('');
  const [isFundingOpen, setIsFundingOpen] = useState(false);
  const locale = i18n.language.startsWith('vi') ? 'vi-VN' : 'en-US';
  const missingDeposit = Math.max(
    0,
    Number(contract.depositVnd) - Number(contract.depositFundedVnd),
  );
  const missingRent = Math.max(
    0,
    Number(contract.monthlyRentVnd) - Number(contract.walletBalanceVnd),
  );
  const minimumRequired = missingDeposit + missingRent;
  const depositTarget = Number(contract.depositVnd || 0);
  const fundedDeposit = Number(contract.depositFundedVnd || 0);
  const depositProgress =
    depositTarget > 0 ? Math.min(100, Math.max(0, (fundedDeposit / depositTarget) * 100)) : 100;
  const availableWallet = Math.max(0, Number(contract.walletBalanceVnd || 0));
  const fundingAccount = contract.fundingAccountId
    ? accounts.find((account) => account.id === contract.fundingAccountId)
    : selectedAccount;
  const fundingAvailable = Math.max(0, Number(fundingAccount?.availableBalance || 0));
  const amountNumber = Number(amount || 0);
  const fundingError = fundWallet.error
    ? localizeApiError(fundWallet.error, t, 'myRentals.fundError')
    : null;
  const amountError =
    amountNumber > fundingAvailable
      ? t('myRentals.insufficientFundingBalance', {
          defaultValue: 'The selected account does not have enough available VND.',
        })
      : null;
  const needsAttention = ['PENDING_FUNDING', 'DELINQUENT'].includes(contract.status);
  const suggestedAmounts = Array.from(
    new Set(
      [minimumRequired, Number(contract.monthlyRentVnd), Number(contract.monthlyRentVnd) * 2]
        .filter((value) => value > 0)
        .map((value) => Math.ceil(value)),
    ),
  ).slice(0, 3);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!fundingAccount || amountNumber <= 0 || amountNumber > fundingAvailable) return;
    fundWallet.mutate(
      {
        accountId: fundingAccount.id,
        amountVnd: amount,
        idempotencyKey: `web:${contract.id}:${Date.now()}`,
        autoDebitEnabled: true,
      },
      {
        onSuccess: () => {
          setAmount('');
          setIsFundingOpen(false);
          toast.success(t('myRentals.fundSuccess', { defaultValue: 'Contract wallet funded.' }));
        },
        onError: (error: unknown) => {
          toast.error(localizeApiError(error, t, 'myRentals.fundError'));
        },
      },
    );
  };

  const setFundingOpen = (open: boolean) => {
    setIsFundingOpen(open);
    if (!open) {
      setAmount('');
      fundWallet.reset();
    }
  };

  return (
    <>
      <article className="border-border bg-card overflow-hidden rounded-xl border shadow-sm">
        <header className="border-border flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              href={`/rentals/${encodeURIComponent(contract.asset.symbol)}`}
              className="text-foreground text-base font-semibold hover:underline"
            >
              {contract.asset.name}
            </Link>
            <p className="text-muted-foreground mt-1 text-xs">
              {contract.asset.symbol} · {contract.asset.location || '—'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                needsAttention
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
              }`}
            >
              {t(`myRentals.status.${contract.status}`, { defaultValue: contract.status })}
            </span>
            <Button type="button" className="h-9 px-3" onClick={() => setFundingOpen(true)}>
              <PlusCircle className="size-4" />
              {t('myRentals.fund', { defaultValue: 'Fund' })}
            </Button>
          </div>
        </header>

        <div className="border-border grid gap-3 border-b p-5 sm:grid-cols-2 lg:grid-cols-3">
          <Metric
            label={t('myRentals.walletBalance', { defaultValue: 'Wallet balance' })}
            value={vnd(contract.walletBalanceVnd)}
          />
          <Metric
            label={t('myRentals.reserved', { defaultValue: 'Reserved for claims' })}
            value={vnd(contract.walletReservedVnd)}
          />
          <Metric
            label={t('myRentals.monthlyRent', { defaultValue: 'Monthly rent' })}
            value={vnd(contract.monthlyRentVnd)}
          />
          <Metric
            label={t('myRentals.deposit', { defaultValue: 'Funded deposit' })}
            value={`${vnd(contract.depositFundedVnd)} / ${vnd(contract.depositVnd)}`}
          />
          <Metric
            label={t('myRentals.nextDue', { defaultValue: 'Next due' })}
            value={contract.nextDueAt ? new Date(contract.nextDueAt).toLocaleString(locale) : '—'}
          />
          <Metric
            label={t('myRentals.contractEnd', { defaultValue: 'Contract end' })}
            value={contract.endDate ? new Date(contract.endDate).toLocaleDateString(locale) : '—'}
          />
        </div>

        <div className="border-border border-b p-5">
          <div className="flex items-center justify-between gap-4 text-xs">
            <span className="text-muted-foreground">
              {t('myRentals.depositProgress', { defaultValue: 'Deposit progress' })}
            </span>
            <span className="text-foreground font-medium">
              {Math.round(depositProgress)}% | {vnd(fundedDeposit)} / {vnd(depositTarget)}
            </span>
          </div>
          <div className="bg-muted mt-2 h-2 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-[width]"
              style={{ width: `${depositProgress}%` }}
            />
          </div>
          {needsAttention && minimumRequired > 0 ? (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>
                {t('myRentals.minimumRequired', {
                  amount: vnd(minimumRequired),
                  defaultValue: 'Minimum {{amount}}',
                })}
              </span>
            </div>
          ) : null}
        </div>

        <section>
          <div className="border-border border-b px-4 py-3">
            <h2 className="text-foreground text-sm font-semibold">
              {t('myRentals.walletHistory', { defaultValue: 'Wallet history' })}
            </h2>
          </div>
          {contract.walletEntries.length ? (
            <div className="divide-border divide-y">
              {contract.walletEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="grid gap-1 px-4 py-3 text-xs sm:grid-cols-[1fr_auto_auto]"
                >
                  <div>
                    <p className="text-foreground font-medium">
                      {t(`myRentals.entryType.${entry.type}`, { defaultValue: entry.type })}
                    </p>
                    <p className="text-muted-foreground mt-1">
                      {new Date(entry.createdAt).toLocaleString(locale)}
                    </p>
                  </div>
                  <span
                    className={
                      entry.direction === 'CREDIT'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }
                  >
                    {entry.direction === 'CREDIT' ? '+' : '-'} {vnd(entry.amountVnd)}
                  </span>
                  <span className="text-muted-foreground sm:text-right">
                    {vnd(entry.balanceAfterVnd)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground px-4 py-8 text-center text-xs">
              {t('myRentals.noHistory', { defaultValue: 'No wallet transactions yet.' })}
            </p>
          )}
        </section>
      </article>

      <Dialog open={isFundingOpen} onOpenChange={setFundingOpen}>
        <DialogContent className="bg-card border-border max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-2xl p-0 shadow-2xl sm:max-w-xl">
          <DialogHeader className="border-border bg-muted/30 shrink-0 border-b px-6 py-5 text-left">
            <div className="text-primary mb-3 flex items-center gap-2 text-xs font-semibold tracking-[0.14em] uppercase">
              <span className="bg-primary/10 flex size-8 items-center justify-center rounded-full">
                <PlusCircle className="size-4" />
              </span>
              {contract.asset.symbol}
            </div>
            <DialogTitle className="text-xl">
              {t('myRentals.fundDialogTitle', { defaultValue: 'Fund contract wallet' })}
            </DialogTitle>
            <DialogDescription className="mt-1.5 max-w-md leading-5">
              {t('myRentals.fundDialogDescription', {
                asset: contract.asset.name,
                defaultValue: 'Add VND for rent and deposit payments for {{asset}}.',
              })}
            </DialogDescription>
          </DialogHeader>

          <form
            id={`fund-rental-${contract.id}`}
            onSubmit={submit}
            className="min-h-0 space-y-5 overflow-y-auto px-6 py-5"
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="border-border bg-background rounded-xl border p-3.5">
                <p className="text-muted-foreground text-xs">
                  {t('myRentals.availableForRent', { defaultValue: 'Available in wallet' })}
                </p>
                <p className="text-foreground mt-1.5 text-sm font-semibold tabular-nums">
                  {vnd(availableWallet)}
                </p>
              </div>
              <div className="border-border bg-background rounded-xl border p-3.5">
                <p className="text-muted-foreground text-xs">
                  {t('myRentals.monthlyRent', { defaultValue: 'Monthly rent' })}
                </p>
                <p className="text-foreground mt-1.5 text-sm font-semibold tabular-nums">
                  {vnd(contract.monthlyRentVnd)}
                </p>
              </div>
              <div className="border-border bg-background col-span-2 rounded-xl border p-3.5 sm:col-span-1">
                <p className="text-muted-foreground text-xs">
                  {t('myRentals.minimumNeeded', { defaultValue: 'Minimum needed' })}
                </p>
                <p className="text-foreground mt-1.5 text-sm font-semibold tabular-nums">
                  {vnd(minimumRequired)}
                </p>
              </div>
            </div>

            <div className="border-primary/20 bg-primary/5 flex items-center justify-between gap-4 rounded-xl border px-4 py-3.5">
              <div className="min-w-0">
                <p className="text-muted-foreground text-xs">
                  {t('myRentals.fundingAccount', { defaultValue: 'Funding account' })}
                </p>
                <p className="text-foreground mt-1 truncate text-sm font-semibold">
                  {fundingAccount?.name ??
                    t('myRentals.noFundingAccount', { defaultValue: 'No live VND account' })}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-muted-foreground text-xs">
                  {t('myRentals.accountAvailable', { defaultValue: 'Available VND' })}
                </p>
                <p className="text-primary mt-1 text-sm font-semibold tabular-nums">
                  {vnd(fundingAvailable)}
                </p>
              </div>
            </div>

            {suggestedAmounts.length ? (
              <div>
                <p className="text-foreground mb-2 text-sm font-medium">
                  {t('myRentals.suggestedAmount', { defaultValue: 'Suggested amount' })}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {suggestedAmounts.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAmount(String(value))}
                      className={`rounded-lg border px-4 py-3 text-xs font-semibold tabular-nums transition-colors ${
                        amountNumber === value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-foreground hover:border-primary/60 hover:text-primary'
                      }`}
                    >
                      {vnd(value)}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <label className="text-foreground block text-sm font-medium">
              <span className="mb-2 flex items-center justify-between gap-3">
                {t('myRentals.fundAmount', { defaultValue: 'Amount to add' })}
                <button
                  type="button"
                  className="text-primary rounded-md px-2 py-1 text-xs font-semibold hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!fundingAccount || fundingAvailable <= 0}
                  onClick={() => setAmount(String(Math.floor(fundingAvailable)))}
                >
                  {t('myRentals.useMaximum', { defaultValue: 'Use maximum' })}
                </button>
              </span>
              <div className="relative">
                <Input
                  required
                  autoFocus
                  inputMode="numeric"
                  className="h-14 pr-16 text-lg font-semibold tabular-nums"
                  value={amount ? amountNumber.toLocaleString(locale) : ''}
                  onChange={(event) => setAmount(event.target.value.replace(/\D/g, ''))}
                  placeholder="0"
                />
                <span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-semibold">
                  VND
                </span>
              </div>
            </label>

            {amountNumber > 0 && !amountError ? (
              <div className="text-muted-foreground flex items-center justify-between gap-4 text-xs">
                <span>
                  {t('myRentals.walletAfterFunding', { defaultValue: 'Wallet after funding' })}
                </span>
                <span className="text-foreground font-semibold tabular-nums">
                  {vnd(availableWallet + Math.max(0, amountNumber - missingDeposit))}
                </span>
              </div>
            ) : null}

            {amountError || fundingError || !fundingAccount ? (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs leading-5 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>
                  {amountError ||
                    fundingError ||
                    t('myRentals.noFundingAccountDescription', {
                      defaultValue: 'Create or activate a live VND account before funding.',
                    })}
                </span>
              </div>
            ) : null}

            <div className="text-muted-foreground bg-muted/40 flex items-start gap-2 rounded-xl px-3.5 py-3 text-xs leading-5">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>
                {t('myRentals.autoDebitNote', {
                  defaultValue:
                    'The contract wallet is used automatically for deposit and monthly rent payments.',
                })}
              </span>
            </div>
          </form>

          <DialogFooter className="border-border bg-muted/20 shrink-0 border-t px-6 py-4 sm:justify-between">
            <Button
              type="button"
              variant="neutral-outline"
              className="h-11 min-w-28 px-6"
              onClick={() => setFundingOpen(false)}
            >
              {t('common.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button
              type="submit"
              form={`fund-rental-${contract.id}`}
              className="h-11 min-w-32 px-6"
              disabled={
                fundWallet.isPending ||
                !fundingAccount ||
                amountNumber <= 0 ||
                amountNumber > fundingAvailable
              }
            >
              {fundWallet.isPending
                ? t('common.processing', { defaultValue: 'Processing...' })
                : t('myRentals.fund', { defaultValue: 'Fund' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SummaryMetric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border-border bg-card rounded-xl border p-4 shadow-sm">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-foreground mt-1 text-lg font-semibold">{value}</p>
      {hint ? (
        <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">{hint}</p>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/40 rounded-lg p-4">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-foreground mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
