'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useAssetById } from '@/hook/useAssets';
import { useTranslation } from 'react-i18next';
import { TokenHolderDistribution } from './TokenHolderDistribution';
import { useAssetStatus } from '@/hook/useAssetManagement';

type InfoTabProps = {
  readonly assetId?: string;
};

export default function InfoTab({ assetId }: InfoTabProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: asset, isLoadingAssets: isLoading } = useAssetById(assetId);
  const { data: assetStatus } = useAssetStatus(assetId || '');

  if (isLoading) {
    return (
      <div className="bg-background flex min-h-[300px] flex-1 items-center justify-center">
        <div
          className="border-muted-foreground border-t-foreground h-6 w-6 animate-spin rounded-full border-2"
          aria-label={t('symbolDetail.loading')}
          role="status"
        />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="bg-background flex min-h-[300px] flex-1 items-center justify-center">
        <p className="text-body-medium text-muted-foreground">{t('symbolDetail.assetNotFound')}</p>
      </div>
    );
  }

  const areaDisplay = asset.totalArea
    ? t('trade.info.areaValue', { value: asset.totalArea, defaultValue: '{{value}} m²' })
    : '-';
  const tenant = assetStatus?.rentalContract?.tenant;
  const tenantName = tenant?.displayName || tenant?.username || asset.tenantName;

  // Safely parse JSON array for galleries and amenities
  let galleries: string[] = [];
  try {
    if (asset.gallery) {
      const parsed = typeof asset.gallery === 'string' ? JSON.parse(asset.gallery) : asset.gallery;
      if (Array.isArray(parsed)) galleries = parsed;
    }
  } catch {}

  let amenities: string[] = [];
  try {
    if (asset.amenities) {
      const parsed =
        typeof asset.amenities === 'string' ? JSON.parse(asset.amenities) : asset.amenities;
      if (Array.isArray(parsed)) amenities = parsed;
    }
  } catch {}

  return (
    <div
      className="bg-background relative h-full w-full flex-1 overflow-y-auto pb-12"
      style={{ scrollBehavior: 'smooth' }}
    >
      <div className="mx-auto max-w-5xl px-4 pt-4 sm:px-6">
        {/* HERO SECTION */}
        <div className="group relative h-64 w-full overflow-hidden rounded-xl md:h-80">
          {galleries.length > 0 ? (
            <img
              src={galleries[0]}
              alt={asset.name}
              className="h-full w-full transform object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="from-primary/80 flex h-full w-full items-center justify-center bg-gradient-to-tr to-blue-500/50">
              <span className="text-4xl font-bold tracking-widest text-white/60 uppercase">
                {asset.symbol}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
          <div className="absolute right-6 bottom-6 left-6 text-white drop-shadow-md">
            <div className="mb-2 flex items-center gap-2">
              <span className="bg-primary/90 text-primary-foreground rounded-sm px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">
                {asset.category?.name ||
                  t('trade.info.realEstate', { defaultValue: 'Real estate' })}
              </span>
              <span className="rounded-sm bg-white/20 px-2 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase backdrop-blur-md">
                {asset.statusColor || t('trade.info.active', { defaultValue: 'Active' })}
              </span>
            </div>
            <h2 className="text-h2-bold md:text-h1-bold leading-tight text-white">{asset.name}</h2>
            <p className="text-body-medium-regular mt-1 flex items-center gap-2 text-white/80">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 opacity-70"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                  clipRule="evenodd"
                />
              </svg>
              {asset.location ||
                t('trade.info.locationNotSpecified', { defaultValue: 'Location not specified' })}
            </p>
          </div>
        </div>

        <div className="pt-5 pb-16">
          {/* QUICK STATS GRID */}
          <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
              label={t('trade.info.propertyType', { defaultValue: 'Property type' })}
              value={asset.propertyType || t('common.notAvailable', { defaultValue: 'N/A' })}
            />
            <StatCard
              label={t('trade.info.totalArea', { defaultValue: 'Total area' })}
              value={areaDisplay}
            />
            <StatCard
              label={t('trade.info.expectedYield', { defaultValue: 'Expected yield' })}
              value={
                asset.expectedApy
                  ? `${asset.expectedApy}% APY`
                  : t('trade.info.toBeDetermined', { defaultValue: 'TBD' })
              }
              highlight
            />
            <StatCard
              label={t('trade.info.tokenPrice', { defaultValue: 'Token price' })}
              value={asset.tokenPrice ? `${Number(asset.tokenPrice).toLocaleString()} VND` : '-'}
            />
          </div>

          <div className="mb-10">
            <TokenHolderDistribution assetId={asset.id} />
          </div>

          {/* OVERVIEW SECTION */}
          <div className="border-border bg-card mb-10 rounded-xl border p-5 shadow-sm shadow-slate-200/50 dark:shadow-none">
            <h3 className="border-border text-foreground mb-4 flex items-center gap-2 border-b pb-3 text-xl font-bold">
              {t('trade.info.overview', { defaultValue: 'Property overview' })}
            </h3>
            <p className="text-body-medium-regular text-foreground/75 leading-relaxed whitespace-pre-line">
              {asset.description ||
                t('trade.info.noDescription', {
                  defaultValue: 'No description provided for this asset.',
                })}
            </p>
          </div>

          {/* TWO COLUMN DETAILS LAYOUT */}
          <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-2">
            {/* LEFT COLUMN: INVESTMENT & LEGAL DETAILS */}
            <div className="space-y-8">
              <DetailSection
                title={t('trade.info.investmentProfile', { defaultValue: 'Investment profile' })}
              >
                <InfoRow
                  label={t('trade.info.businessModel', { defaultValue: 'Business model' })}
                  value={asset.businessModel}
                />
                <InfoRow
                  label={t('trade.info.monthlyBenefits', { defaultValue: 'Income distribution' })}
                  value={asset.monthlyBenefits}
                />
                <InfoRow
                  label={t('trade.info.zoning', { defaultValue: 'Zoning / planning' })}
                  value={asset.zoning}
                />
              </DetailSection>

              <DetailSection
                title={t('trade.info.propertySpecs', { defaultValue: 'Property specifications' })}
              >
                <InfoRow
                  label={t('trade.info.yearBuilt', { defaultValue: 'Year built' })}
                  value={asset.yearBuilt}
                />
                <InfoRow
                  label={t('trade.info.totalArea', { defaultValue: 'Total area' })}
                  value={asset.totalArea ? areaDisplay : null}
                />
                <InfoRow
                  label={t('trade.info.maintenanceFee', { defaultValue: 'Maintenance fee' })}
                  value={
                    asset.maintenanceFee
                      ? `${Number(asset.maintenanceFee).toLocaleString()} VND`
                      : null
                  }
                />
                <InfoRow
                  label={t('trade.info.handoverCondition', { defaultValue: 'Handover condition' })}
                  value={asset.handoverCondition}
                />
                <InfoRow
                  label={t('trade.info.projectScale', { defaultValue: 'Project scale' })}
                  value={asset.projectScale}
                />
              </DetailSection>
            </div>

            {/* RIGHT COLUMN: STAKEHOLDERS & TENANT */}
            <div className="space-y-8">
              <DetailSection title={t('trade.info.stakeholders', { defaultValue: 'Stakeholders' })}>
                <InfoRow
                  label={t('trade.info.developer', { defaultValue: 'Developer / investor' })}
                  value={
                    asset.issuerId ? (
                      <Link
                        href={`/discover?tab=profile?userId=${encodeURIComponent(asset.issuerId)}`}
                        className="text-primary hover:underline"
                      >
                        {asset.developer ||
                          t('trade.info.viewIssuerProfile', {
                            defaultValue: 'View issuer profile',
                          })}
                      </Link>
                    ) : (
                      asset.developer
                    )
                  }
                  highlight
                />
                <InfoRow
                  label={t('trade.info.operatingCompany', { defaultValue: 'Operating company' })}
                  value={asset.operatingCompany}
                />
                <InfoRow
                  label={t('trade.info.legalStatus', { defaultValue: 'Legal status' })}
                  value={asset.legalStatus}
                />
              </DetailSection>

              {/* TENANT CARD */}
              <div className="bg-card border-border rounded-xl border p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold">
                    {t('trade.info.tenantDetails', { defaultValue: 'Tenant details' })}
                  </h3>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tenantName ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'}`}
                  >
                    {tenantName
                      ? t('trade.info.occupied', { defaultValue: 'Occupied' })
                      : t('trade.info.vacant', { defaultValue: 'Vacant' })}
                  </span>
                </div>

                <div className="mb-4 flex items-center gap-4">
                  <div className="bg-primary/10 text-primary flex h-14 w-14 items-center justify-center rounded-full text-2xl font-bold shadow-inner">
                    {tenantName ? tenantName.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div>
                    <p className="text-foreground text-base font-bold">
                      {tenant?.id ? (
                        <Link
                          href={`/discover?tab=profile?userId=${encodeURIComponent(tenant.id)}`}
                          className="hover:underline"
                        >
                          {tenantName}
                        </Link>
                      ) : (
                        tenantName ||
                        t('trade.info.noTenant', { defaultValue: 'No current tenant' })
                      )}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-sm">
                      {tenantName
                        ? asset.contractDuration
                          ? t('trade.info.leaseDuration', {
                              count: asset.contractDuration,
                              defaultValue: 'Lease contract: {{count}} months',
                            })
                          : t('trade.info.activeLease', { defaultValue: 'Active lease agreement' })
                        : t('trade.info.availableForLease', {
                            defaultValue: 'Property is available for lease',
                          })}
                    </p>
                  </div>
                </div>

                {!tenantName && (
                  <div className="border-border border-t border-dashed pt-4">
                    <button
                      type="button"
                      onClick={() => router.push(`/asset-management/${asset.id}/rental`)}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground focus-visible:ring-primary h-11 w-full rounded-lg text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                    >
                      {t('trade.info.applyToRent', { defaultValue: 'Apply to rent' })}
                    </button>
                    <p className="text-muted-foreground mt-2 text-center text-xs">
                      {t('trade.info.applyToRentHint', {
                        defaultValue:
                          'Any signed-in user may apply; token ownership is not required.',
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AMENITIES SECTION */}
          {amenities.length > 0 && (
            <div className="mb-12">
              <h3 className="border-border mb-5 flex items-center gap-2 border-b pb-2 text-xl font-bold">
                {t('trade.info.amenities', { defaultValue: 'Amenities' })}
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {amenities.map((item: string) => (
                  <div
                    key={item}
                    className="bg-card border-border hover:bg-muted flex items-center gap-2 rounded-lg border p-3 transition-colors"
                  >
                    <div className="bg-primary/60 h-2 w-2 rounded-full" />
                    <span className="text-foreground/90 text-sm font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DOCUMENTS SECTION */}
          <div className="mb-8">
            <h3 className="border-border mb-4 flex items-center gap-2 border-b pb-2 text-xl font-bold">
              {t('trade.info.documents', { defaultValue: 'Verified documents' })}
            </h3>
            {asset.legalDocsIpfs || asset.auditReportUrl ? (
              <a
                href={(asset.legalDocsIpfs || asset.auditReportUrl)!}
                target="_blank"
                rel="noreferrer"
                className="bg-card border-border hover:border-primary/30 group flex items-center justify-between rounded-xl border p-4 shadow-sm transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-50 p-2 text-blue-700 transition-colors group-hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:group-hover:bg-blue-500/20">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">
                      {t('trade.info.ownershipDocument', {
                        defaultValue: 'Property ownership document',
                      })}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {t('trade.info.blockchainVerifiedPdf', {
                        defaultValue: 'PDF • Verified on blockchain',
                      })}
                    </p>
                  </div>
                </div>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-bold tracking-wider text-emerald-700 uppercase dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                  {t('trade.info.verified', { defaultValue: 'Verified' })}
                </span>
              </a>
            ) : (
              <div className="border-border text-muted-foreground rounded-xl border border-dashed p-5 text-center text-sm">
                {t('trade.info.noDocuments', {
                  defaultValue: 'No legal or valuation documents have been published yet.',
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper Components
function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string | React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`bg-card rounded-xl border p-4 shadow-sm shadow-slate-200/40 dark:shadow-none ${highlight ? 'border-primary/50 bg-primary/5' : 'border-border'} flex flex-col items-start justify-center`}
    >
      <p className="text-muted-foreground mb-1 text-xs font-medium tracking-wider uppercase">
        {label}
      </p>
      <p
        className={`text-lg font-bold sm:text-xl ${highlight ? 'text-primary' : 'text-foreground'}`}
      >
        {value}
      </p>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border-border rounded-xl border p-5 shadow-sm shadow-slate-200/50 dark:shadow-none">
      <h3 className="text-foreground/90 mb-4 text-base font-bold">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  highlight,
}: {
  label: string;
  value?: React.ReactNode | string | number | null;
  highlight?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="border-border/50 flex justify-between border-b py-3 last:border-0 last:pb-0">
      <p className="text-muted-foreground text-sm font-medium">{label}</p>
      <p
        className={`max-w-[60%] text-right text-sm font-semibold ${highlight ? 'text-primary' : 'text-foreground'}`}
      >
        {value || t('trade.info.notUpdated', { defaultValue: 'Not updated' })}
      </p>
    </div>
  );
}
