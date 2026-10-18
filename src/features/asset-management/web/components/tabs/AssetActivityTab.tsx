'use client';

import { useState } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from '@untitledui/icons';

import { Skeleton } from '@/components/shared/atoms/skeleton';
import { useAssetActivity } from '@/hook/useAssetManagement';
import type { AssetActivityItem } from '@/services/assetManagementService';
import type { Asset } from '@/types/assets';
import { formatBalance } from '@/utils/currency';
import { AssetEntryDetailDialog } from '../AssetEntryDetailDialog';

export default function AssetActivityTab({ asset }: { asset: Asset }) {
  const { t, i18n } = useTranslation();
  const [selectedActivity, setSelectedActivity] = useState<AssetActivityItem | null>(null);
  const { data: items = [], isLoading, isError } = useAssetActivity(asset.id);
  const locale = i18n.resolvedLanguage?.startsWith('vi') ? 'vi-VN' : 'en-US';

  const localizeCategory = (category: string) =>
    t(`assetManagement.activity.categories.${category}`, { defaultValue: category });
  const localizeAction = (action: string) =>
    t(`assetManagement.activity.actions.${action}`, { defaultValue: action });
  const localizeStatus = (status: string) =>
    t(`assetManagement.statuses.${status}`, { defaultValue: status });
  const localizeTitle = (action: string, title: string) => {
    if (action === 'TOKEN_TRADED') {
      return t('assetManagement.activity.titles.tokenTrade', { defaultValue: 'Token trade' });
    }
    if (action === 'DISTRIBUTION_UPDATED') {
      return t('assetManagement.activity.titles.dividendDistribution', {
        defaultValue: 'Dividend distribution',
      });
    }
    return title;
  };

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (isError) {
    return (
      <Empty
        text={t('assetManagement.activity.loadError', {
          defaultValue: 'Unable to load asset activity.',
        })}
      />
    );
  }
  if (items.length === 0) {
    return (
      <Empty
        text={t('assetManagement.activity.empty', {
          defaultValue:
            'No operating, governance, valuation or cash-flow events have been recorded.',
        })}
      />
    );
  }

  return (
    <div>
      <h2 className="text-foreground text-base font-semibold">
        {t('assetManagement.activity.title', { defaultValue: 'Asset activity log' })}
      </h2>
      <p className="text-muted-foreground mt-1 mb-5 text-sm">
        {t('assetManagement.activity.description', {
          defaultValue: 'Events recorded from the asset database.',
        })}
      </p>
      <div className="border-border border">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelectedActivity(item)}
            className="border-border hover:bg-muted/40 focus-visible:ring-primary grid w-full gap-2 border-b px-4 py-3 text-left transition-colors last:border-b-0 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset md:grid-cols-[150px_minmax(0,1fr)_140px_24px] md:items-center"
            aria-label={t('assetManagement.details.openActivity', {
              defaultValue: 'View activity details',
            })}
          >
            <span className="text-muted-foreground text-xs">
              {new Date(item.createdAt).toLocaleString(locale)}
            </span>
            <span className="min-w-0">
              <span className="text-foreground block truncate text-sm font-medium">
                {localizeTitle(item.action, item.title)}
              </span>
              <span className="text-muted-foreground mt-0.5 block text-xs">
                {localizeCategory(item.category)} · {localizeAction(item.action)}
              </span>
            </span>
            <span className="text-muted-foreground text-xs md:text-right">
              {localizeStatus(item.status)}
            </span>
            <ChevronRight className="text-muted-foreground hidden md:block" size={15} />
          </button>
        ))}
      </div>

      {selectedActivity ? (
        <AssetEntryDetailDialog
          open
          onOpenChange={(open) => {
            if (!open) setSelectedActivity(null);
          }}
          eyebrow={localizeCategory(selectedActivity.category)}
          title={localizeTitle(selectedActivity.action, selectedActivity.title)}
          description={t('assetManagement.details.activityDescription', {
            asset: asset.symbol || asset.name,
            defaultValue: `Recorded event details for ${asset.symbol || asset.name}.`,
          })}
          status={localizeStatus(selectedActivity.status)}
          fields={[
            {
              label: t('assetManagement.details.category', { defaultValue: 'Category' }),
              value: localizeCategory(selectedActivity.category),
            },
            {
              label: t('assetManagement.details.action', { defaultValue: 'Action' }),
              value: localizeAction(selectedActivity.action),
            },
            {
              label: t('assetManagement.details.recordedAt', { defaultValue: 'Recorded at' }),
              value: new Date(selectedActivity.createdAt).toLocaleString(locale),
            },
            {
              label: t('assetManagement.details.eventId', { defaultValue: 'Event ID' }),
              value: selectedActivity.id,
              mono: true,
            },
          ]}
          metadata={Object.entries(selectedActivity.metadata ?? {}).map(([key, value]) => ({
            label: t(`assetManagement.details.metadataLabels.${key}`, {
              defaultValue: humanizeKey(key),
            }),
            value: formatMetadataValue(key, value, selectedActivity.metadata ?? {}, locale, t),
            wide: typeof value === 'object' && value !== null,
            mono: typeof value === 'object' && value !== null,
          }))}
          metadataTitle={t('assetManagement.details.eventData', { defaultValue: 'Event data' })}
          closeLabel={t('assetManagement.details.close', { defaultValue: 'Close' })}
        />
      ) : null}
    </div>
  );
}

function humanizeKey(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (character) => character.toUpperCase());
}

function formatMetadataValue(
  key: string,
  value: unknown,
  metadata: Record<string, unknown>,
  locale: string,
  t: TFunction,
) {
  if (value === null || value === undefined || value === '') {
    return t('assetManagement.details.notAvailable', { defaultValue: 'Not available' });
  }
  if (typeof value === 'boolean') {
    return value
      ? t('assetManagement.details.yes', { defaultValue: 'Yes' })
      : t('assetManagement.details.no', { defaultValue: 'No' });
  }
  if (key === 'price' || key === 'totalAmount') {
    return `${formatBalance(String(value))} ${String(metadata.currency ?? 'VND')}`;
  }
  if (key === 'quantity') {
    return `${formatBalance(String(value))} token`;
  }
  if (key === 'snapshotDate' || key.endsWith('At')) {
    const date = new Date(String(value));
    if (!Number.isNaN(date.getTime())) return date.toLocaleString(locale);
  }
  if (key.toLowerCase().includes('status')) {
    return t(`assetManagement.statuses.${String(value)}`, { defaultValue: String(value) });
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

function Empty({ text }: { text: string }) {
  return (
    <div className="border-border text-muted-foreground border border-dashed px-5 py-16 text-center text-sm">
      {text}
    </div>
  );
}
