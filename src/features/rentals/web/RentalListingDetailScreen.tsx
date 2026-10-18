'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from '@untitledui/icons';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/shared/atoms/button';
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

export default function RentalListingDetailScreen({ assetId }: { assetId: string }) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const currentUser = useAuthStore((state) => state.user);
  const { data: assets = [], isLoading: isLoadingAsset } = useActiveAssets();
  const asset = assets.find((item) => item.id === assetId);
  const { data: status, isLoading: isLoadingStatus } = useAssetStatus(assetId);
  const applicationQuery = useMyRentalApplication(assetId, Boolean(currentUser));
  const submitApplication = useSubmitRentalApplication(assetId);
  const [message, setMessage] = useState('');
  const [desiredStartDate, setDesiredStartDate] = useState('');
  const [minimumStartDate] = useState(() =>
    new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  );

  if (isLoadingAsset || isLoadingStatus) {
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
  const galleries = parseStringList(asset.gallery);
  const imageUrl =
    asset.images?.find((image) => image.isPrimary)?.url ?? asset.images?.[0]?.url ?? galleries[0];
  const amenities = parseStringList(asset.amenities);
  const monthlyRent = formatVnd(rental?.monthlyRentVnd ?? asset.rentalSummary?.monthlyRentVnd);
  const locale = i18n.language.startsWith('vi') ? 'vi-VN' : 'en-US';

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    submitApplication.mutate(
      {
        message: message.trim() || undefined,
        desiredStartDate: desiredStartDate
          ? new Date(`${desiredStartDate}T00:00:00`).toISOString()
          : undefined,
      },
      {
        onSuccess: () => {
          toast.success(t('assetManagement.rentalOperations.submitSuccess'));
          setMessage('');
          setDesiredStartDate('');
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

        <section className="border-border overflow-hidden border">
          <div className="grid min-h-64 md:grid-cols-[42%_1fr]">
            <div className="bg-muted relative min-h-56 overflow-hidden">
              {imageUrl ? (
                // Asset media URLs are managed by the backend and may use tenant-specific hosts.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt={asset.name} className="h-full w-full object-cover" />
              ) : (
                <div className="text-muted-foreground flex h-full min-h-56 items-center justify-center text-2xl font-semibold">
                  {asset.symbol}
                </div>
              )}
            </div>
            <div className="flex flex-col justify-center p-5 sm:p-7">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                  {t('rentalListing.pageEyebrow')}
                </span>
                <span
                  className={
                    isRented
                      ? 'bg-muted text-muted-foreground rounded px-2 py-1 text-xs font-medium'
                      : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded px-2 py-1 text-xs font-medium'
                  }
                >
                  {t(isRented ? 'rentalListing.rented' : 'rentalListing.available')}
                </span>
              </div>
              <h1 className="text-foreground text-2xl font-semibold sm:text-3xl">{asset.name}</h1>
              <p className="text-muted-foreground mt-2 text-sm">
                {asset.symbol} · {asset.location || t('trade.info.locationNotSpecified')}
              </p>
              <div className="border-border mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t pt-5 sm:grid-cols-4">
                <Metric
                  label={t('trade.info.propertyType')}
                  value={asset.propertyType || t('common.notAvailable')}
                />
                <Metric
                  label={t('trade.info.totalArea')}
                  value={asset.totalArea ? `${asset.totalArea.toLocaleString(locale)} m²` : '—'}
                />
                <Metric
                  label={t('assetManagement.rentalOperations.monthlyRentVnd')}
                  value={monthlyRent || t('rentalListing.rentNotPublished')}
                />
                <Metric
                  label={t('trade.info.expectedYield')}
                  value={
                    asset.expectedApy
                      ? `${Number(asset.expectedApy).toLocaleString(locale)}% / ${t('rentalListing.year')}`
                      : '—'
                  }
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
              ) : application && ['PENDING', 'APPROVED'].includes(application.status) ? (
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
                  <label className="block">
                    <span className="text-muted-foreground mb-1.5 block text-xs">
                      {t('assetManagement.rentalOperations.desiredStartDate')}
                    </span>
                    <input
                      type="date"
                      value={desiredStartDate}
                      min={minimumStartDate}
                      onChange={(event) => setDesiredStartDate(event.target.value)}
                      className="border-border bg-background text-foreground h-10 w-full rounded border px-3 text-sm"
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
    <div className="min-w-0">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-foreground mt-1 truncate text-sm font-semibold">{value}</p>
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
