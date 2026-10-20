'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { RentalIncomeDetailSheet } from '../RentalIncomeDetailSheet';
import { formatVnd, getIntlLocale } from '@/i18n/formatting';

import { AssetManagementButton as Button } from '@/features/asset-management/web/components/AssetManagementButton';
import { Input } from '@/components/shared/atoms/input';
import { Skeleton } from '@/components/shared/atoms/skeleton';
import {
  useAssetStatus,
  useCreateRentalEnablementProposal,
  useRentalApplications,
} from '@/hook/useAssetManagement';
import { useClaimDividend, useRentalIncomeDistributions } from '@/hook/useDividends';
import { useAuthStore } from '@/store/authStore';
import type { Asset } from '@/types/assets';
import { getGuestNumber } from '@/utils/publicIdentity';

const PURPOSE_SECTORS = [
  'COMMERCIAL',
  'HOSPITALITY',
  'RESIDENTIAL',
  'SERVICES',
  'PRODUCTION',
  'OTHER',
] as const;

export default function RentalOperationsTab({ asset }: { asset: Asset }) {
  const { t, i18n } = useTranslation();
  const currentUser = useAuthStore((state) => state.user);
  const statusQuery = useAssetStatus(asset.id);
  const applicationsQuery = useRentalApplications(asset.id, Boolean(currentUser));
  const distributionsQuery = useRentalIncomeDistributions(asset.id, Boolean(currentUser));
  const createEnablement = useCreateRentalEnablementProposal(asset.id);
  const claimDividend = useClaimDividend();
  const [selectedDistributionId, setSelectedDistributionId] = useState<string | null>(null);
  const [showEnablement, setShowEnablement] = useState(false);
  const [expectedRent, setExpectedRent] = useState(
    String(asset.rentalSummary?.expectedMonthlyRentVnd ?? ''),
  );
  const [expectedDeposit, setExpectedDeposit] = useState(
    String(asset.rentalSummary?.expectedDepositVnd ?? ''),
  );
  const [description, setDescription] = useState('');
  const [allowedPurposes, setAllowedPurposes] = useState<string[]>([
    'COMMERCIAL',
    'HOSPITALITY',
    'RESIDENTIAL',
  ]);
  const locale = getIntlLocale(i18n.resolvedLanguage ?? i18n.language);
  const vnd = (value?: string | number | null) => formatVnd(value, locale);

  if (statusQuery.isLoading) return <Skeleton className="h-72 w-full" />;

  const status = statusQuery.data;
  const rental = status?.rentalContract;
  const tenant = rental?.tenant;
  const selectedDistribution = distributionsQuery.data?.find(
    (item) => item.id === selectedDistributionId,
  );

  const submitEnablement = (event: React.FormEvent) => {
    event.preventDefault();
    createEnablement.mutate(
      {
        expectedMonthlyRentVnd: expectedRent,
        expectedDepositVnd: expectedDeposit,
        allowedPurposeSectors: allowedPurposes,
        description,
      },
      {
        onSuccess: () => {
          toast.success(
            t('assetManagement.rentalOperations.enablementSubmitted', {
              defaultValue: 'Rental enablement vote created.',
            }),
          );
          setShowEnablement(false);
        },
      },
    );
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-foreground text-base font-semibold">
            {t('assetManagement.rentalOperations.title', { defaultValue: 'Rental operations' })}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {t('assetManagement.rentalOperations.daoDescription', {
              defaultValue:
                'Rental permission and each tenant application are decided by token-holder voting.',
            })}
          </p>
        </div>
        {!rental && currentUser ? (
          <Button
            type="button"
            variant="neutral-outline"
            className="h-9 px-4 text-xs"
            onClick={() => setShowEnablement((value) => !value)}
          >
            {t('assetManagement.rentalOperations.openEnablementVote', {
              defaultValue: 'Propose rental opening',
            })}
          </Button>
        ) : null}
      </header>

      {showEnablement ? (
        <form onSubmit={submitEnablement} className="border-border space-y-4 border p-4">
          <label className="block">
            <span className="text-muted-foreground mb-1.5 block text-xs">
              {t('assetManagement.rentalOperations.expectedRent', {
                defaultValue: 'Expected monthly rent (VND)',
              })}
            </span>
            <Input
              required
              type="number"
              min="1"
              step="1"
              value={expectedRent}
              onChange={(event) => setExpectedRent(event.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-muted-foreground mb-1.5 block text-xs">
              {t('assetManagement.rentalOperations.expectedDeposit', {
                defaultValue: 'Expected deposit (VND)',
              })}
            </span>
            <Input
              required
              type="number"
              min="0"
              step="1"
              value={expectedDeposit}
              onChange={(event) => setExpectedDeposit(event.target.value)}
            />
          </label>
          <fieldset>
            <legend className="text-muted-foreground mb-2 text-xs">
              {t('assetManagement.rentalOperations.allowedPurposes', {
                defaultValue: 'Allowed use sectors',
              })}
            </legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {PURPOSE_SECTORS.map((sector) => (
                <label
                  key={sector}
                  className="border-border flex items-center gap-2 border px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={allowedPurposes.includes(sector)}
                    onChange={(event) =>
                      setAllowedPurposes((current) =>
                        event.target.checked
                          ? [...current, sector]
                          : current.filter((value) => value !== sector),
                      )
                    }
                  />
                  <span className="text-foreground">
                    {t(`rentalPurposes.sectors.${sector}`, { defaultValue: sector })}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block">
            <span className="text-muted-foreground mb-1.5 block text-xs">
              {t('common.description', { defaultValue: 'Description' })}
            </span>
            <textarea
              required
              minLength={10}
              maxLength={2000}
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="border-border bg-background text-foreground w-full rounded border p-3 text-sm outline-none"
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="neutral-outline"
              className="h-9 px-4 text-xs"
              onClick={() => setShowEnablement(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              className="h-9 px-4 text-xs"
              disabled={
                createEnablement.isPending ||
                allowedPurposes.length === 0 ||
                !expectedRent ||
                !expectedDeposit ||
                description.trim().length < 10
              }
            >
              {t('assetManagement.rentalOperations.submitToDao', {
                defaultValue: 'Submit to governance',
              })}
            </Button>
          </div>
        </form>
      ) : null}

      {status?.rentalEnabledUntil ? (
        <section className="border-border rounded-lg border p-4">
          <h3 className="text-sm font-semibold">
            {t('assetManagement.terms.approvedRentalTerms')}
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <DataRow
              label={t('assetManagement.terms.monthlyRentVnd')}
              value={vnd(String(status.rentalExpectedMonthlyVnd ?? 0))}
            />
            <DataRow
              label={t('assetManagement.terms.depositVnd')}
              value={vnd(String(status.rentalExpectedDepositVnd ?? 0))}
            />
          </div>
          <p className="text-muted-foreground mt-3 text-xs leading-5">
            {t('assetManagement.terms.nextRentalOnly')}
          </p>
        </section>
      ) : null}
      <section className="border-border border">
        <DataRow
          label={t('assetManagement.rentalOperations.status', { defaultValue: 'Status' })}
          value={t(
            `assetManagement.statuses.${rental?.status ?? asset.rentalSummary?.status ?? 'LOCKED'}`,
            { defaultValue: String(rental?.status ?? asset.rentalSummary?.status ?? 'LOCKED') },
          )}
        />
        <DataRow
          label={t('assetManagement.rentalOperations.tenant', { defaultValue: 'Tenant' })}
          value={
            tenant?.id
              ? t('assetManagement.rentalOperations.guestName', {
                  number: getGuestNumber(tenant),
                  defaultValue: 'Guest {{number}}',
                })
              : '—'
          }
        />
        <DataRow
          label={t('assetManagement.rentalOperations.monthlyRentVnd')}
          value={rental?.monthlyRentVnd ? vnd(rental.monthlyRentVnd) : '—'}
        />
        <DataRow
          label={t('assetManagement.rentalOperations.contractWallet', {
            defaultValue: 'Contract wallet available',
          })}
          value={vnd(rental?.walletBalanceVnd)}
        />
        <DataRow
          label={t('assetManagement.rentalOperations.reservedForClaims', {
            defaultValue: 'Reserved for claims',
          })}
          value={vnd(rental?.walletReservedVnd)}
        />
        <DataRow
          label={t('assetManagement.rentalOperations.nextCollection', {
            defaultValue: 'Next collection',
          })}
          value={rental?.nextDueAt ? new Date(rental.nextDueAt).toLocaleString(locale) : '—'}
        />
      </section>

      {currentUser ? (
        <section className="border-border border">
          <SectionHeader
            title={t('assetManagement.rentalOperations.incomeHistoryTitle')}
            description={t('assetManagement.rentalOperations.incomeHistoryDescription')}
          />
          {distributionsQuery.isLoading ? (
            <Skeleton className="m-4 h-24" />
          ) : distributionsQuery.isError ? (
            <div className="p-4 text-sm text-amber-600">
              <p>
                {t('assetManagement.rentalOperations.historyError', {
                  defaultValue: 'Unable to load rental payments.',
                })}
              </p>
              <Button
                variant="neutral-outline"
                className="mt-3"
                onClick={() => distributionsQuery.refetch()}
              >
                {t('common.retry', { defaultValue: 'Retry' })}
              </Button>
            </div>
          ) : distributionsQuery.data?.length ? (
            <div className="divide-border divide-y">
              <div className="text-muted-foreground bg-muted/20 hidden grid-cols-[1fr_1fr_1fr_auto] gap-3 px-4 py-2 text-xs md:grid">
                <span>{t('assetManagement.rentalOperations.paymentPeriod')}</span>
                <span className="text-right">
                  {t('assetManagement.rentalOperations.periodTotal')}
                </span>
                <span className="text-right">
                  {t('assetManagement.rentalOperations.yourShare')}
                </span>
                <span className="min-w-40 text-right">{t('portfolio.table.actions')}</span>
              </div>
              {distributionsQuery.data.map((distribution) => {
                const pendingAmount = distribution.claims
                  .filter((claim) => claim.status === 'PENDING')
                  .reduce((sum, claim) => sum + Number(claim.amount), 0);
                const userAmount = distribution.claims.reduce(
                  (sum, claim) => sum + Number(claim.amount),
                  0,
                );
                return (
                  <div
                    key={distribution.id}
                    className="grid items-center gap-3 px-4 py-3 text-sm md:grid-cols-[1fr_1fr_1fr_auto]"
                  >
                    <span className="text-foreground">
                      {new Date(distribution.periodStart).toLocaleDateString(locale, {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="text-muted-foreground md:text-right">
                      {vnd(distribution.totalAmount)}
                    </span>
                    <span className="text-muted-foreground md:text-right">
                      {vnd(String(userAmount))}
                      <span className="mt-1 block text-xs">
                        {pendingAmount > 0
                          ? t('assetManagement.rentalOperations.unclaimed')
                          : userAmount > 0
                            ? t('assetManagement.rentalOperations.claimed')
                            : t('assetManagement.rentalOperations.noEntitlement')}
                      </span>
                    </span>
                    <div className="flex min-w-40 justify-end gap-2">
                      {pendingAmount > 0 ? (
                        <Button
                          type="button"
                          className="h-8 px-3 text-xs"
                          disabled={claimDividend.isPending}
                          onClick={() => claimDividend.mutate(distribution.id)}
                        >
                          {claimDividend.isPending && claimDividend.variables === distribution.id
                            ? t('common.processing')
                            : t('assetManagement.rentalOperations.claimRent', {
                                defaultValue: 'Claim rental income',
                              })}
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="neutral-outline"
                        className="h-8 px-3 text-xs"
                        onClick={() => setSelectedDistributionId(distribution.id)}
                      >
                        {t('common.viewDetails', { defaultValue: 'Details' })}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-8 text-center">
              <p className="text-foreground text-sm font-medium">
                {t('assetManagement.rentalOperations.noIncomeHistory')}
              </p>
              {rental ? (
                <p className="text-muted-foreground mx-auto mt-2 max-w-xl text-xs leading-5">
                  {t('assetManagement.rentalOperations.awaitingPaymentExplanation')}
                </p>
              ) : null}
              {tenant?.id === currentUser.id && rental?.status === 'PENDING_FUNDING' ? (
                <Link
                  href="/my-rentals"
                  className="text-primary-500 mt-3 inline-flex text-sm font-medium hover:underline"
                >
                  {t('assetManagement.rentalOperations.manageRentPayment')}
                </Link>
              ) : null}
            </div>
          )}
        </section>
      ) : null}

      {currentUser ? (
        <section className="border-border border">
          <SectionHeader
            title={t('assetManagement.rentalOperations.applicantList')}
            description={t('assetManagement.rentalOperations.privateVoteNotice', {
              defaultValue:
                'Only aggregate voting power is shown. Individual shareholder choices remain private.',
            })}
          />
          {applicationsQuery.isLoading ? (
            <Skeleton className="m-4 h-28 w-auto" />
          ) : applicationsQuery.data?.length ? (
            <div className="divide-border divide-y">
              {applicationsQuery.data.map((application) => (
                <article key={application.id} className="px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/profile/${encodeURIComponent(application.applicant?.id ?? '')}`}
                        className="text-foreground text-sm font-semibold hover:underline"
                      >
                        {application.applicant?.id
                          ? t('assetManagement.rentalOperations.guestName', {
                              number: getGuestNumber(application.applicant),
                              defaultValue: 'Guest {{number}}',
                            })
                          : t('assetManagement.rentalOperations.unknownApplicant')}
                      </Link>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {application.applicant?.kycStatus === 'APPROVED'
                          ? t('rentalListing.kycVerified', { defaultValue: 'KYC verified' })
                          : t('rentalListing.kycNotVerified', { defaultValue: 'KYC not verified' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs font-medium">
                        {t(
                          `assetManagement.rentalOperations.applicationStatuses.${application.status}`,
                          { defaultValue: application.status },
                        )}
                      </span>
                      {application.proposalId && application.status === 'PENDING_VOTE' ? (
                        <Link
                          href={`/asset-management/${asset.id}/governance`}
                          className="border-border text-foreground hover:bg-muted border px-3 py-2 text-xs"
                        >
                          {t('assetManagement.rentalOperations.voteNow', {
                            defaultValue: 'Vote',
                          })}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-muted-foreground mt-3 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
                    <span>
                      {application.durationMonths ?? '—'} {t('rentalListing.months')}
                    </span>
                    <span>{vnd(application.proposedRentVnd)}</span>
                    <span>
                      {t(`rentalPurposes.sectors.${application.purposeSector}`, {
                        defaultValue: application.purposeSector ?? '—',
                      })}
                    </span>
                    <span>
                      {application.desiredStartDate
                        ? new Date(application.desiredStartDate).toLocaleDateString(locale)
                        : '—'}
                    </span>
                  </div>
                  {application.message ? (
                    <p className="text-muted-foreground mt-3 text-xs leading-5">
                      {application.message}
                    </p>
                  ) : null}
                  {application.voteSummary ? (
                    <VoteBar
                      yes={Number(application.voteSummary.yesPower)}
                      no={Number(application.voteSummary.noPower)}
                      blank={Number(application.voteSummary.blankPower)}
                      voterCount={application.voteSummary.voterCount}
                    />
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground px-4 py-8 text-center text-sm">
              {t('assetManagement.rentalOperations.noApplications')}
            </p>
          )}
        </section>
      ) : null}

      {selectedDistribution ? (
        <RentalIncomeDetailSheet
          distribution={selectedDistribution}
          assetName={asset.name}
          onClose={() => setSelectedDistributionId(null)}
          onClaim={() => claimDividend.mutate(selectedDistribution.id)}
          claiming={claimDividend.isPending}
        />
      ) : null}
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="border-border border-b px-4 py-3">
      <h3 className="text-foreground text-sm font-semibold">{title}</h3>
      <p className="text-muted-foreground mt-1 text-xs">{description}</p>
    </div>
  );
}

function VoteBar({
  yes,
  no,
  blank,
  voterCount,
}: {
  yes: number;
  no: number;
  blank: number;
  voterCount: number;
}) {
  const { t } = useTranslation();
  const total = yes + no + blank;
  const yesPercent = total > 0 ? (yes / total) * 100 : 0;
  const noPercent = total > 0 ? (no / total) * 100 : 0;
  return (
    <div className="mt-4">
      <div className="bg-muted flex h-2 overflow-hidden">
        <span className="bg-emerald-500" style={{ width: `${yesPercent}%` }} />
        <span className="bg-red-500" style={{ width: `${noPercent}%` }} />
      </div>
      <div className="text-muted-foreground mt-1 flex flex-wrap justify-between gap-2 text-[11px]">
        <span>
          {yesPercent.toFixed(1)}% {String.fromCharCode(10003)}
        </span>
        <span>
          {noPercent.toFixed(1)}% {String.fromCharCode(10005)}
        </span>
        <span>{t('assetManagement.rentalOperations.voters', { count: voterCount })}</span>
      </div>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border flex items-center justify-between gap-6 border-b px-4 py-3 last:border-b-0">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-foreground text-right text-sm font-medium">{value}</span>
    </div>
  );
}
