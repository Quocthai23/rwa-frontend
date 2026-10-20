'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from '@untitledui/icons';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/shared/atoms/button';
import { Input } from '@/components/shared/atoms/input';
import { Skeleton } from '@/components/shared/atoms/skeleton';
import {
  useAssetStatus,
  useMyRentalApplication,
  useSubmitRentalApplication,
} from '@/hook/useAssetManagement';
import { useActiveAssets } from '@/hook/useAssets';
import { localizeApiError } from '@/i18n/apiErrors';
import { useAuthStore } from '@/store/authStore';

const parseStringList = (value?: string | string[]) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
};

const formatVnd = (value?: string | number | null) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0
    ? `${amount.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} VND`
    : null;
};

const PURPOSE_OPTIONS: Record<string, string[]> = {
  COMMERCIAL: [
    'RESTAURANT',
    'CAFE',
    'RETAIL',
    'SHOWROOM',
    'MINIMART',
    'OFFICE',
    'COWORKING',
    'SALON_SPA',
    'TRAINING_CENTER',
    'CLINIC_PHARMACY',
    'WAREHOUSE_LOGISTICS',
  ],
  HOSPITALITY: ['HOTEL', 'GUESTHOUSE', 'HOMESTAY', 'SERVICED_APARTMENT', 'SHORT_STAY'],
  RESIDENTIAL: ['FAMILY_HOME', 'INDIVIDUAL_HOME', 'STAFF_HOUSING', 'LONG_TERM_RESIDENCE'],
  SERVICES: ['GYM', 'STUDIO', 'EVENT_SPACE', 'COMMUNITY_CENTER', 'CARE_SERVICE'],
  PRODUCTION: ['CLEAN_WORKSHOP', 'LIGHT_MANUFACTURING', 'PACKAGING'],
  OTHER: ['OTHER'],
};

export default function RentalListingDetailScreen({ assetId }: { assetId: string }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.user);
  const { data: assets = [], isLoading: isLoadingAsset } = useActiveAssets();
  const asset = useMemo(() => {
    const normalizedRef = decodeURIComponent(assetId).replaceAll('/', '').trim().toUpperCase();
    return assets.find(
      (item) => item.id === assetId || item.symbol.replaceAll('/', '').trim().toUpperCase() === normalizedRef,
    );
  }, [assetId, assets]);
  const resolvedAssetId = asset?.id ?? '';
  const { data: status, isLoading: isLoadingStatus } = useAssetStatus(resolvedAssetId);
  const applicationQuery = useMyRentalApplication(resolvedAssetId, Boolean(currentUser && resolvedAssetId));
  const submitApplication = useSubmitRentalApplication(resolvedAssetId);
  const [message, setMessage] = useState('');
  const [desiredStartDate, setDesiredStartDate] = useState('');
  const [durationMonths, setDurationMonths] = useState('12');
  const [proposedRentVnd, setProposedRentVnd] = useState('');
  const [proposedDepositVnd, setProposedDepositVnd] = useState('');
  const [purposeSector, setPurposeSector] = useState('RESIDENTIAL');
  const [purposeCode, setPurposeCode] = useState('FAMILY_HOME');
  const [purposeDetails, setPurposeDetails] = useState('');
  const [minimumStartDate] = useState(() =>
    new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  );

  const eligibility = applicationQuery.data?.eligibility;
  const allowedSectors = useMemo(() => {
    const approved = eligibility?.allowedPurposeSectors?.filter(
      (sector) => Boolean(PURPOSE_OPTIONS[sector]),
    );
    return approved?.length ? approved : Object.keys(PURPOSE_OPTIONS);
  }, [eligibility?.allowedPurposeSectors]);

  useEffect(() => {
    if (!asset || asset.id === assetId) return;
    router.replace(`/rentals/${encodeURIComponent(asset.symbol)}`);
  }, [asset, assetId, router]);

  useEffect(() => {
    if (!eligibility) return;
    if (!proposedRentVnd && eligibility.expectedMonthlyRentVnd) {
      setProposedRentVnd(String(eligibility.expectedMonthlyRentVnd));
    }
    if (!proposedDepositVnd && eligibility.expectedDepositVnd) {
      setProposedDepositVnd(String(eligibility.expectedDepositVnd));
    }
    if (!allowedSectors.includes(purposeSector)) {
      const nextSector = allowedSectors[0] ?? 'OTHER';
      setPurposeSector(nextSector);
      setPurposeCode(PURPOSE_OPTIONS[nextSector]?.[0] ?? 'OTHER');
    }
  }, [allowedSectors, eligibility, proposedDepositVnd, proposedRentVnd, purposeSector]);

  if (isLoadingAsset || (Boolean(asset) && isLoadingStatus)) {
    return (
      <div className="mx-auto w-full max-w-[1440px] space-y-5 px-5 py-6 lg:px-8">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-64 w-full" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex min-h-[520px] flex-col items-center justify-center gap-4 px-5">
        <p className="text-foreground text-base font-semibold">
          {t('rentalListing.notFound')}
        </p>
        <Button type="button" variant="neutral-outline" onClick={() => router.push('/market')}>
          {t('rentalListing.backToMarket')}
        </Button>
      </div>
    );
  }

  const rental = status?.rentalContract;
  const isRented = rental?.status === 'ACTIVE' || asset.rentalSummary?.status === 'RENTED';
  const application = applicationQuery.data?.application;
  const canApply = !isRented && applicationQuery.data?.available !== false;
  const amenities = parseStringList(asset.amenities);
  const monthlyRent = formatVnd(
    rental?.monthlyRentVnd ??
      eligibility?.expectedMonthlyRentVnd ??
      asset.rentalSummary?.expectedMonthlyRentVnd,
  );
  const expectedDeposit = formatVnd(
    rental?.depositVnd ?? eligibility?.expectedDepositVnd ?? asset.rentalSummary?.expectedDepositVnd,
  );
  const locale = i18n.language.startsWith('vi') ? 'vi-VN' : 'en-US';

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    submitApplication.mutate(
      {
        message: message.trim() || undefined,
        desiredStartDate: desiredStartDate
          ? new Date(`${desiredStartDate}T00:00:00`).toISOString()
          : undefined,
        durationMonths: Number(durationMonths),
        proposedRentVnd,
        proposedDepositVnd,
        purposeSector,
        purposeCode,
        purposeDetails: purposeDetails.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success(t('assetManagement.rentalOperations.submitSuccess'));
          setMessage('');
          setDesiredStartDate('');
          setPurposeDetails('');
        },
        onError: (error) =>
          toast.error(localizeApiError(error, t, 'assetManagement.rentalOperations.submitError')),
      },
    );
  };

  return (
    <main className="bg-background min-h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-[1440px] px-5 py-5 lg:px-8 lg:py-7">
        <button
          type="button"
          onClick={() => router.push('/market')}
          className="text-muted-foreground hover:text-foreground mb-5 inline-flex items-center gap-2 text-sm"
        >
          <ArrowLeft className="size-4" />
          {t('rentalListing.backToMarket')}
        </button>

        <section className="border-border relative overflow-hidden border bg-card">
          <div className="bg-primary-500 absolute inset-y-0 left-0 w-1" />
          <div className="px-6 py-7 sm:px-8">
            <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="border-border bg-muted/40 text-foreground border px-2 py-1 font-mono text-xs font-semibold tracking-wide">
                    {asset.symbol}
                  </span>
                  <span
                    className={
                      isRented
                        ? 'bg-muted text-muted-foreground px-2 py-1 text-xs font-medium'
                        : 'bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400'
                    }
                  >
                    {t(isRented ? 'rentalListing.rented' : 'rentalListing.available')}
                  </span>
                </div>
                <h1 className="text-foreground text-2xl font-semibold tracking-tight sm:text-3xl">
                  {asset.name}
                </h1>
                <p className="text-muted-foreground mt-2 text-sm">
                  {asset.location || t('trade.info.locationNotSpecified')}
                </p>
              </div>
              <div className="border-border grid shrink-0 grid-cols-2 border lg:min-w-[460px]">
                <Metric label={t('rentalListing.approvedRent')} value={monthlyRent || '—'} />
                <Metric label={t('rentalListing.approvedDeposit')} value={expectedDeposit || '—'} />
                <Metric
                  label={t('trade.info.propertyType')}
                  value={asset.propertyType || t('common.notAvailable')}
                />
                <Metric
                  label={t('trade.info.totalArea')}
                  value={asset.totalArea ? `${asset.totalArea.toLocaleString(locale)} m²` : '—'}
                />
              </div>
            </div>
          </div>
        </section>

        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-5">
            <section className="border-border border p-5 sm:p-6">
              <h2 className="text-foreground text-base font-semibold">
                {t('rentalListing.overview')}
              </h2>
              <p className="text-muted-foreground mt-3 text-sm leading-6 whitespace-pre-line">
                {asset.description || t('trade.info.noDescription')}
              </p>
            </section>

            <section className="border-border border p-5 sm:p-6">
              <h2 className="text-foreground text-base font-semibold">
                {t('rentalListing.details')}
              </h2>
              <div className="mt-4 divide-y divide-border">
                <DetailRow label={t('trade.info.businessModel')} value={asset.businessModel} />
                <DetailRow label={t('trade.info.developer')} value={asset.developer} />
                <DetailRow label={t('trade.info.legalStatus')} value={asset.legalStatus} />
                <DetailRow label={t('trade.info.handoverCondition')} value={asset.handoverCondition} />
                <DetailRow
                  label={t('assetManagement.rentalOperations.durationMonths')}
                  value={
                    asset.contractDuration
                      ? `${asset.contractDuration} ${t('rentalListing.months')}`
                      : undefined
                  }
                />
              </div>
            </section>

            {amenities.length > 0 ? (
              <section className="border-border border p-5 sm:p-6">
                <h2 className="text-foreground text-base font-semibold">
                  {t('rentalListing.amenities')}
                </h2>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {amenities.map((amenity) => (
                    <div key={amenity} className="border-border text-foreground border px-3 py-2 text-sm">
                      {amenity}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="border-border border lg:sticky lg:top-24">
            <div className="border-border border-b p-5">
              <h2 className="text-foreground text-base font-semibold">
                {t('rentalListing.applicationPanelTitle')}
              </h2>
              <p className="text-muted-foreground mt-2 text-xs leading-5">
                {t('assetManagement.rentalOperations.applicationNotice')}
              </p>
            </div>

            <div className="p-5">
              {isRented ? (
                <EmptyApplication
                  title={t('rentalListing.unavailableTitle')}
                  description={t('rentalListing.unavailableDescription')}
                />
              ) : !currentUser ? (
                <div>
                  <EmptyApplication
                    title={t('rentalListing.loginTitle')}
                    description={t('rentalListing.loginDescription')}
                  />
                  <Button
                    type="button"
                    className="mt-4 h-10 w-full"
                    onClick={() =>
                      router.push(`/login?redirect=${encodeURIComponent(`/rentals/${asset.id}`)}`)
                    }
                  >
                    {t('rentalListing.loginAction')}
                  </Button>
                </div>
              ) : applicationQuery.isLoading ? (
                <Skeleton className="h-44 w-full" />
              ) : applicationQuery.data?.available === false ? (
                <EmptyApplication
                  title={t('rentalListing.applicationsClosedTitle')}
                  description={t('rentalListing.applicationsClosedDescription')}
                />
              ) : application &&
                ['PENDING', 'PENDING_VOTE', 'APPROVED_PENDING_FUNDING', 'APPROVED'].includes(
                  application.status,
                ) ? (
                <div>
                  <p className="text-muted-foreground text-xs">
                    {t('assetManagement.rentalOperations.yourApplication')}
                  </p>
                  <p className="text-foreground mt-1 text-sm font-semibold">
                    {t(`assetManagement.rentalOperations.applicationStatuses.${application.status}`)}
                  </p>
                  <p className="text-muted-foreground mt-2 text-xs">
                    {t('assetManagement.rentalOperations.submittedAt', {
                      time: new Date(application.createdAt).toLocaleString(locale),
                    })}
                  </p>
                  {application.votingEndsAt ? (
                    <p className="text-muted-foreground mt-2 text-xs">
                      {t('rentalListing.voteEndsAt', {
                        time: new Date(application.votingEndsAt).toLocaleString(locale),
                        defaultValue: 'Voting ends {{time}}',
                      })}
                    </p>
                  ) : null}
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  {application?.status === 'REJECTED' && application.rejectionReason ? (
                    <p className="border-red-500/20 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
                      {t('assetManagement.rentalOperations.rejectionReasonValue', {
                        reason: application.rejectionReason,
                      })}
                    </p>
                  ) : null}
                  <p className="text-muted-foreground text-xs leading-5">
                    {t('assetManagement.rentalOperations.noTokenRequired')}
                  </p>
                  <div className="border-primary-500/25 bg-primary-500/5 border p-3">
                    <p className="text-foreground text-xs font-semibold">
                      {t('rentalListing.shareholderTermsTitle')}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-muted-foreground text-[11px]">
                          {t('rentalListing.approvedRent')}
                        </p>
                        <p className="text-foreground mt-0.5 text-sm font-semibold tabular-nums">
                          {monthlyRent || ''}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-[11px]">
                          {t('rentalListing.approvedDeposit')}
                        </p>
                        <p className="text-foreground mt-0.5 text-sm font-semibold tabular-nums">
                          {expectedDeposit || ''}
                        </p>
                      </div>
                    </div>
                    <p className="text-muted-foreground mt-2 text-[11px] leading-4">
                      {t('rentalListing.shareholderTermsHint')}
                    </p>
                  </div>
                  <label className="block">
                    <span className="text-muted-foreground mb-1.5 block text-xs">
                      {t('assetManagement.rentalOperations.desiredStartDate')}
                    </span>
                    <input
                      required
                      type="date"
                      value={desiredStartDate}
                      min={minimumStartDate}
                      onChange={(event) => setDesiredStartDate(event.target.value)}
                      className="border-border bg-background text-foreground h-10 w-full rounded border px-3 text-sm"
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-muted-foreground mb-1.5 block text-xs">
                        {t('rentalListing.durationMonths', {
                          defaultValue: 'Contract duration (months)',
                        })}
                      </span>
                      <Input
                        required
                        type="number"
                        min="1"
                        max="120"
                        value={durationMonths}
                        onChange={(event) => setDurationMonths(event.target.value)}
                      />
                    </label>
                    <label className="block">
                      <span className="text-muted-foreground mb-1.5 block text-xs">
                        {t('rentalListing.proposedRent', {
                          defaultValue: 'Proposed monthly rent (VND)',
                        })}
                      </span>
                      <Input
                        required
                        type="number"
                        min="1"
                        step="1"
                        value={proposedRentVnd}
                        onChange={(event) => setProposedRentVnd(event.target.value)}
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className="text-muted-foreground mb-1.5 block text-xs">
                      {t('rentalListing.proposedDeposit', {
                        defaultValue: 'Proposed deposit (VND)',
                      })}
                    </span>
                    <Input
                      required
                      type="number"
                      min="0"
                      step="1"
                      value={proposedDepositVnd}
                      onChange={(event) => setProposedDepositVnd(event.target.value)}
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-muted-foreground mb-1.5 block text-xs">
                        {t('rentalListing.purposeSector', { defaultValue: 'Use sector' })}
                      </span>
                      <select
                        value={purposeSector}
                        onChange={(event) => {
                          const sector = event.target.value;
                          setPurposeSector(sector);
                          setPurposeCode(PURPOSE_OPTIONS[sector]?.[0] ?? 'OTHER');
                        }}
                        className="border-border bg-background text-foreground h-10 w-full rounded border px-3 text-sm"
                      >
                        {allowedSectors.map((sector) => (
                          <option key={sector} value={sector}>
                            {t(`rentalPurposes.sectors.${sector}`, { defaultValue: sector })}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-muted-foreground mb-1.5 block text-xs">
                        {t('rentalListing.purposeCode', { defaultValue: 'Specific activity' })}
                      </span>
                      <select
                        value={purposeCode}
                        onChange={(event) => setPurposeCode(event.target.value)}
                        className="border-border bg-background text-foreground h-10 w-full rounded border px-3 text-sm"
                      >
                        {(PURPOSE_OPTIONS[purposeSector] ?? []).map((purpose) => (
                          <option key={purpose} value={purpose}>
                            {t(`rentalPurposes.activities.${purpose}`, { defaultValue: purpose })}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <label className="block">
                    <span className="text-muted-foreground mb-1.5 block text-xs">
                      {t('rentalListing.purposeDetails', {
                        defaultValue: 'Detailed use plan',
                      })}
                    </span>
                    <textarea
                      value={purposeDetails}
                      onChange={(event) => setPurposeDetails(event.target.value)}
                      maxLength={2000}
                      rows={3}
                      className="border-border bg-background text-foreground focus:border-primary-500 w-full rounded border p-3 text-sm outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-muted-foreground mb-1.5 block text-xs">
                      {t('assetManagement.rentalOperations.messageLabel')}
                    </span>
                    <textarea
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      maxLength={1000}
                      rows={5}
                      placeholder={t('assetManagement.rentalOperations.messagePlaceholder')}
                      className="border-border bg-background text-foreground focus:border-primary-500 w-full rounded border p-3 text-sm outline-none"
                    />
                    <span className="text-muted-foreground mt-1 block text-right text-xs">
                      {message.length}/1000
                    </span>
                  </label>
                  <Button
                    type="submit"
                    className="h-10 w-full"
                    disabled={!canApply || submitApplication.isPending}
                  >
                    {submitApplication.isPending
                      ? t('assetManagement.rentalOperations.submittingApplication')
                      : t('assetManagement.rentalOperations.submitApplication')}
                  </Button>
                </form>
              )}
            </div>

            <div className="border-border bg-muted/20 border-t p-5">
              <h3 className="text-foreground text-sm font-semibold">
                {t('assetManagement.rentalOperations.processTitle')}
              </h3>
              <ol className="text-muted-foreground mt-3 space-y-3 text-xs">
                <ProcessStep number="1" text={t('assetManagement.rentalOperations.step1Text')} />
                <ProcessStep number="2" text={t('assetManagement.rentalOperations.step2Text')} />
                <ProcessStep number="3" text={t('assetManagement.rentalOperations.step3Text')} />
              </ol>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border min-w-0 border-b p-4 odd:border-r last:border-b-0 [&:nth-last-child(2)]:border-b-0">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-foreground mt-1 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-8 py-3 first:pt-0 last:pb-0">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-foreground max-w-[60%] text-right text-sm font-medium">{value || '—'}</span>
    </div>
  );
}

function EmptyApplication({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <p className="text-foreground text-sm font-semibold">{title}</p>
      <p className="text-muted-foreground mt-2 text-xs leading-5">{description}</p>
    </div>
  );
}

function ProcessStep({ number, text }: { number: string; text: string }) {
  return (
    <li className="flex gap-3">
      <span className="border-border text-foreground flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold">
        {number}
      </span>
      <span className="leading-5">{text}</span>
    </li>
  );
}
