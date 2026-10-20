'use client';
import { useTranslation } from 'react-i18next';

export function AssetActionBadge({ count }: { count?: number }) {
  const { t } = useTranslation();
  if (!count || count < 1) return null;
  return <span aria-label={t('assetManagement.actions.pending', { count, defaultValue: '{{count}} pending actions' })} className="ml-2 inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-primary-500 px-1.5 text-[11px] leading-5 font-semibold text-white tabular-nums">{count > 99 ? '99+' : count}</span>;
}
