'use client';

import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hook/useToast';
import { Dialog, DialogContent, DialogFooter } from '@/components/shared/atoms/dialog';
import { Button } from '@/components/shared/atoms/button';
import { OrderType } from '@/types/orders';
import { getOrderStatusLabel } from '../../../utils/position.formatters';
import { useTheme } from '@/theme/ThemeProvider';
import Decimal from 'decimal.js';
import { toDecimal } from '@/utils/decimal';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { ORDER_SIDES_API as ORDER_SIDES } from '@/types/orders';
import { LoadingMoreTableSkeleton } from '../../shared/LoadingSkeletons';

export type RtBySymbol = Record<string, { bid?: number; ask?: number }>;
export type SortDir = 'asc' | 'desc';

export type EstimateContext = {
  side: 'BUY' | 'SELL';
  symbol: string;
  quantity: string | number;
  entryPrice: string | number;
  digit?: number;
  rtBySymbol: RtBySymbol;
  id?: string;
  accountId?: string;
  type?: 'order';
  orderType?: 'MARKET' | 'LIMIT';
};

export function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-GB', { hour12: false });
}

export function sideLabel(side: number | string) {
  if (side === 'BUY' || side === 0) return 'Buy';
  if (side === 'SELL' || side === 1) return 'Sell';
  return 'Buy';
}

export function formatDecimal(
  value: string | number | null | undefined,
  fallback: string = '-',
  fixed?: number,
): string {
  if (value === null || value === undefined || value === '') return fallback;

  try {
    const decimal = new Decimal(value.toString());

    if (fixed !== undefined) {
      return decimal.toFixed(fixed);
    }

    return decimal.toFixed();
  } catch {
    return fallback;
  }
}

function SortIcon({ direction }: { direction: 'asc' | 'desc' | null }) {
  return (
    <div className="flex w-2 flex-col items-center gap-0.5">
      <svg
        width="8"
        height="5"
        viewBox="0 0 8 5"
        fill="currentColor"
        className={cn(
          'transition-colors',
          direction === 'asc' ? 'text-primary-500' : 'text-muted-foreground',
        )}
      >
        <polygon points="4,0 8,5 0,5" />
      </svg>
      <svg
        width="8"
        height="5"
        viewBox="0 0 8 5"
        fill="currentColor"
        className={cn(
          'transition-colors',
          direction === 'desc' ? 'text-primary-500' : 'text-muted-foreground',
        )}
      >
        <polygon points="4,5 0,0 8,0" />
      </svg>
    </div>
  );
}

export function SortHeader({
  label,
  sortKey,
  currentSortKey,
  currentSortDir,
  onSort,
}: {
  label: string;
  sortKey: string;
  currentSortKey: string | null;
  currentSortDir: SortDir;
  onSort: (key: string) => void;
}) {
  const isActive = currentSortKey === sortKey;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-normal whitespace-nowrap transition-colors"
    >
      <span
        className={cn('transition-colors', isActive ? 'text-primary-500' : 'text-muted-foreground')}
      >
        {label}
      </span>
      <SortIcon direction={isActive ? currentSortDir : null} />
    </button>
  );
}

export function EmptyState({
  label,
  title,
  description,
}: {
  label?: string;
  title?: string;
  description?: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="text-body-small-medium text-muted-foreground border-border flex h-60 w-full flex-col items-center justify-center gap-2">
      {title ? (
        <h3 className="text-body-large-semibold text-foreground">{title}</h3>
      ) : label ? (
        <span>
          {t('common.no')} {label}
        </span>
      ) : null}
      {description && <p className="text-body-small-regular text-muted-foreground">{description}</p>}
    </div>
  );
}

export function TableLoadingState() {
  return <LoadingMoreTableSkeleton />;
}

export function SidePill({ side }: { side: number | string }) {
  const isBuy = side === 'BUY' || side === 0;
  return (
    <span
      className={cn('text-caption-medium inline-flex', isBuy ? 'text-green-500' : 'text-red-500')}
    >
      {sideLabel(side)}
    </span>
  );
}

export function OrderStatusPill({ status }: { status: string | number }) {
  const { t } = useTranslation();
  return (
    <span className="text-caption-medium text-foreground inline-flex px-2 py-0.5">
      {getOrderStatusLabel(status, t)}
    </span>
  );
}

export function sortRows<T extends Record<string, unknown>>(
  rows: T[],
  sortKey: string | null,
  sortDir: SortDir,
): T[] {
  if (!sortKey) return rows;

  const sorted = [...rows].sort((a, b) => {
    const aVal = a[sortKey as keyof T];
    const bVal = b[sortKey as keyof T];

    if (aVal === undefined || aVal === null) return 1;
    if (bVal === undefined || bVal === null) return -1;

    const aDec = toDecimal(
      typeof aVal === 'string' || typeof aVal === 'number' ? (aVal as any) : String(aVal),
    );
    const bDec = toDecimal(
      typeof bVal === 'string' || typeof bVal === 'number' ? (bVal as any) : String(bVal),
    );

    if (aDec && bDec) {
      return sortDir === 'asc' ? aDec.cmp(bDec) : bDec.cmp(aDec);
    }

    const aStr = String(aVal).toLowerCase();
    const bStr = String(bVal).toLowerCase();
    return sortDir === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
  });

  return sorted;
}
