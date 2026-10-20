'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { useAssetActionCounts } from '@/hook/useAssetActionCounts';
import { AssetActionBadge } from '@/features/asset-management/web/components/AssetActionBadge';

import { ArrowLeft } from '@untitledui/icons';

import { AssetManagementButton as Button } from '@/features/asset-management/web/components/AssetManagementButton';
import { cn } from '@/lib/utils';
import { useActiveAssets } from '@/hook/useAssets';
import GovernanceTab from './components/tabs/GovernanceTab';
import TransactionHistoryTab from './components/tabs/TransactionHistoryTab';
import AssetOverviewTab from './components/tabs/AssetOverviewTab';
import RentalOperationsTab from './components/tabs/RentalOperationsTab';
import AssetActivityTab from './components/tabs/AssetActivityTab';
import { MiniOrderbook } from './components/tabs/MiniOrderbook';

export type AssetManagementSection =
  | 'overview'
  | 'rental'
  | 'liquidity'
  | 'governance'
  | 'cash-flow'
  | 'activity';

const toFiniteNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatVnd = (value: unknown) =>
  `${toFiniteNumber(value).toLocaleString('vi-VN', { maximumFractionDigits: 0 })} VNĐ`;

export default function AssetDetailWebScreen({
  assetId,
  section = 'overview',
}: {
  assetId: string;
  section?: AssetManagementSection;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: actionCounts } = useAssetActionCounts();
  const { data: assets = [], isLoading } = useActiveAssets();
  const asset = assets.find((item) => item.id === assetId);

  const tabs = useMemo(
    () => [
      {
        id: 'overview',
        label: t('assetManagement.sections.overview', { defaultValue: 'Tổng quan' }),
      },
      {
        id: 'rental',
        label: t('assetManagement.sections.rental', { defaultValue: 'Cho thuê' }),
      },
      {
        id: 'liquidity',
        label: t('assetManagement.sections.liquidity', { defaultValue: 'Thanh khoản' }),
      },
      {
        id: 'governance',
        label: t('assetManagement.sections.governance', { defaultValue: 'Quản trị' }),
      },
      {
        id: 'cash-flow',
        label: t('assetManagement.transactionHistory.title', { defaultValue: 'Dòng tiền' }),
      },
      {
        id: 'activity',
        label: t('assetManagement.notifications.title', { defaultValue: 'Nhật ký tài sản' }),
      },
    ],
    [t],
  );

  if (isLoading) {
    return (
      <div className="bg-background flex h-full min-h-[640px] items-center justify-center">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="bg-background text-muted-foreground flex min-h-[500px] items-center justify-center">
        {t('assetManagement.assetNotFound', { defaultValue: 'Không tìm thấy tài sản' })}
      </div>
    );
  }

  const expectedApy = toFiniteNumber(asset.expectedApy);
  const active = asset.isActive !== false;

  return (
    <div className="bg-background flex h-[calc(100dvh-72px)] min-h-0 w-full flex-col overflow-hidden">
      <header className="border-border bg-background z-30 shrink-0 border-b">
        <div className="mx-auto flex w-full max-w-[1480px] items-center justify-between gap-5 px-5 py-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Button
              type="button"
              variant="neutral-outline"
              aria-label={t('common.back', { defaultValue: 'Quay lại' })}
              onClick={() => router.back()}
              className="border-border bg-card hover:bg-muted h-10 w-10 shrink-0 rounded-xl p-0"
            >
              <ArrowLeft size={19} />
            </Button>
            <div className="min-w-0">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground text-xs font-semibold tracking-[0.08em]">
                  {asset.symbol || 'RWA'}
                </span>
                <span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      active ? 'bg-emerald-500' : 'bg-muted-foreground',
                    )}
                  />
                  {active
                    ? t('assetManagement.status.active', { defaultValue: 'Đang vận hành' })
                    : t('assetManagement.status.inactive', { defaultValue: 'Tạm dừng' })}
                </span>
              </div>
              <h1 className="text-foreground truncate text-xl font-bold tracking-tight lg:text-2xl">
                {asset.name}
              </h1>
            </div>
          </div>

          <div className="hidden items-center gap-7 lg:flex">
            <div className="text-right">
              <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.1em] uppercase">
                {t('assetManagement.expectedApy', { defaultValue: 'Lợi suất dự kiến' })}
              </p>
              <p className="text-foreground mt-1 text-sm font-semibold">
                {expectedApy.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%/năm
              </p>
            </div>
            <div className="bg-border h-9 w-px" />
            <div className="text-right">
              <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.1em] uppercase">
                {t('assetManagement.price', { defaultValue: 'Giá tham chiếu' })}
              </p>
              <p className="text-foreground mt-1 text-sm font-bold">
                {formatVnd(asset.tokenPrice ?? asset.referencePrice)}
              </p>
            </div>
            <Button
              onClick={() => router.push(`/trade/${asset.symbol}`)}
              className="h-10 rounded-xl px-5 font-semibold"
            >
              {t('assetManagement.tradeAsset', { defaultValue: 'Giao dịch token' })}
            </Button>
          </div>
        </div>

        <nav
          className="mx-auto flex w-full max-w-[1480px] gap-7 overflow-x-auto scrollbar-neutral-slim px-5 lg:px-8"
          aria-label={t('assetManagement.navigation', {
            defaultValue: 'Điều hướng quản lý tài sản',
          })}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => router.push(tab.id === 'overview' ? `/asset-management/${asset.id}` : `/asset-management/${asset.id}/${tab.id}`)}
              className={cn(
                'relative shrink-0 py-3.5 text-sm font-medium transition-colors',
                section === tab.id
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
              <AssetActionBadge count={actionCounts?.[asset.id]?.[tab.id as 'rental' | 'governance']} />
              {section === tab.id && (
                <span className="bg-primary absolute right-0 bottom-0 left-0 h-0.5 rounded-t-full" />
              )}
            </button>
          ))}
        </nav>
      </header>

      <main className="bg-background min-h-0 flex-1 overflow-y-auto scrollbar-neutral-slim">
        <div className="mx-auto min-h-[500px] w-full max-w-[1480px] px-5 py-7 lg:px-8 lg:py-9">
          {section === 'overview' && <AssetOverviewTab asset={asset} />}
          {section === 'rental' && <RentalOperationsTab asset={asset} />}
          {section === 'liquidity' && <MiniOrderbook assetId={asset.id} symbol={asset.symbol} />}
          {section === 'governance' && <GovernanceTab asset={asset} />}
          {section === 'cash-flow' && <TransactionHistoryTab asset={asset} />}
          {section === 'activity' && <AssetActivityTab asset={asset} />}
        </div>
      </main>
    </div>
  );
}
