'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useMemo, useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useStrategyPage } from '@/hook/useStrategyPage';
import type { StrategyResultItem } from '@/types/strategy';
import Image from 'next/image';
import { useTheme } from '@/theme';
import { useAppHydrated } from '@/hook/useAppHydrated';
import { useGetData } from '@/context/GetdataContext';

dayjs.extend(relativeTime);

export interface HomeStrategyProps {
  scrollableList?: boolean;
  webLayout?: boolean;
}

export const HomeStrategy = ({
  scrollableList = true,
  webLayout = false,
}: HomeStrategyProps = {}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { mode } = useTheme();
  const hasHydratedApp = useAppHydrated();
  const appLanguage = useAppStore((s) => s.language);
  const { assets } = useGetData();

  const strategyLocale = useMemo(() => {
    if (!appLanguage) return 'en-US';
    const code = String(appLanguage);
    const lower = code.toLowerCase();
    if (lower === 'en' || lower.startsWith('en-')) return 'en-US';
    if (lower === 'vi' || lower.startsWith('vi-')) return 'vi-VN';
    if (lower.startsWith('zh-')) return code; // e.g. zh-CN
    return code.replace(/-en$/i, '-US');
  }, [appLanguage]);

  const TAKE = 5;
  const [page, setPage] = useState(1);
  const [allStrategies, setAllStrategies] = useState<StrategyResultItem[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasNoMoreFromApi, setHasNoMoreFromApi] = useState(false);

  const { data, isLoading } = useStrategyPage(
    {
      page: page,
      size: scrollableList ? TAKE : 5,
      type: 'ALL',
      locale: strategyLocale,
    },
    {
      enabled: hasHydratedApp,
    },
  );

  useEffect(() => {
    if (data?.value?.resultList) {
      setAllStrategies((prev) => {
        if (page === 1) {
          setHasNoMoreFromApi(false);
          return data.value!.resultList!;
        }
        const existingIds = new Set(prev.map((item) => item.id));
        const newItems = data.value!.resultList!.filter((item) => !existingIds.has(item.id));
        if (newItems.length === 0) {
          setHasNoMoreFromApi(true);
        }

        return [...prev, ...newItems];
      });
      setIsLoadingMore(false);
    }
  }, [data, page]);

  const total = data?.value?.total;
  const hasMore = hasNoMoreFromApi
    ? false
    : total !== undefined
      ? allStrategies.length < total
      : data?.value?.resultList?.length === (scrollableList ? TAKE : 5);
  const hasResults = allStrategies.length > 0;

  const shouldShowButton = scrollableList
    ? hasMore
    : total !== undefined
      ? total > 5
      : data?.value?.resultList?.length === 5;

  const visibleStrategies = useMemo(() => {
    if (!Array.isArray(allStrategies) || allStrategies.length === 0) return [];
    const sorted = [...allStrategies].sort((a, b) => (b.time ?? 0) - (a.time ?? 0));
    return scrollableList ? sorted : sorted.slice(0, 5);
  }, [allStrategies, scrollableList]);

  // Prevent SSR/CSR hydration mismatch: on the server the query is disabled (no loading),
  // but on the client it can start immediately after hydration. Render a stable skeleton
  // until the app store has hydrated.
  const showInitialSkeleton =
    page === 1 && !hasResults && (isLoading || !hasHydratedApp) && visibleStrategies.length === 0;

  // Heuristic: most APIs use ms; some use seconds.
  const normalizeTimeMs = (time?: number) => {
    const t = time ?? 0;
    return t > 1e12 ? t : t * 1000;
  };

  const getStrategyImage = (item?: StrategyResultItem | null) => {
    if (!item) return undefined;
    return mode === 'dark' ? (item.darkImage ?? item.image) : (item.image ?? item.darkImage);
  };

  const formatStrategyTimeAgo = (time: number) => {
    return dayjs(normalizeTimeMs(time)).fromNow();
  };

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      setIsLoadingMore(true);
      setPage((p) => p + 1);
    }
  };

  return (
    <div className={scrollableList ? 'flex-1 overflow-y-auto pb-16' : 'overflow-y-auto pb-16'}>
      {showInitialSkeleton ? (
        <div
          className={
            webLayout ? 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3' : 'space-y-3'
          }
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="border-border mb-3 w-full animate-pulse rounded border p-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="bg-muted h-6 w-1/3 rounded" />
                  <div className="bg-muted mt-3 h-4 w-4/5 rounded" />
                  <div className="bg-muted mt-2 h-4 w-3/5 rounded" />
                </div>

                <div className="flex min-w-[72px] shrink-0 flex-col items-end gap-2">
                  <div className="bg-muted h-[72px] w-[72px] rounded" />
                  <div className="bg-muted h-3 w-14 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : visibleStrategies.length === 0 ? (
        <div className="flex h-full min-h-[50vh] flex-col items-center justify-center">
          <p className="text-body-large-medium text-muted-foreground">
            {t('home.noItemsAvailable', { type: t('home.strategyTab') })}
          </p>
        </div>
      ) : (
        <div className={webLayout ? 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3' : ''}>
          {visibleStrategies.map((strategy) => {
            const handleOpenDetail = () => {
              const asset = assets?.find((a) => a.symbol === strategy.symbol);
              const assetId = asset?.id || '';
              router.push(`/market/${encodeURIComponent(strategy.symbol)}${assetId ? `?assetId=${assetId}` : ''}`);
            };

            const thumbnailSrc = getStrategyImage(strategy);

            const direction = (strategy.direction ?? '').toLowerCase();
            const isDown = direction === 'down';
            const symbolDisplay = (strategy.symbolName ?? strategy.symbol ?? '').toString();
            const symbolTypeDisplay = (strategy.symbolType ?? '').toString();
            const titleText = strategy.title ?? symbolDisplay;
            const descriptionText = strategy.description ?? '';
            const timeText =
              typeof strategy.time === 'number' ? formatStrategyTimeAgo(strategy.time) : '';

            return (
              <button
                key={strategy.id}
                className={`border-border hover:bg-muted w-full rounded border p-4 text-left ${
                  webLayout ? 'h-full' : 'mb-3'
                }`}
                type="button"
                onClick={handleOpenDetail}
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    {/* 1) Symbol + direction */}
                    <div className="flex gap-2">
                      <span
                        className={`text-body-small-medium inline-flex items-center gap-2 rounded px-2 py-1 ${
                          isDown
                            ? 'bg-red-50 text-red-500 dark:bg-red-900/30 dark:text-red-300'
                            : 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-300'
                        }`}
                      >
                        <span className="text-base leading-none">{isDown ? '↓' : '↑'}</span>
                        <span className="truncate">{symbolDisplay}</span>
                      </span>

                      {symbolTypeDisplay ? (
                        <span className="text-body-small-medium text-muted-foreground bg-muted rounded px-2 py-1 dark:bg-neutral-800 dark:text-neutral-200">
                          {symbolTypeDisplay}
                        </span>
                      ) : null}
                    </div>

                    <div className="text-foreground text-body-large-medium mt-2 line-clamp-2 leading-tight font-semibold break-words">
                      {titleText}
                    </div>

                    {descriptionText ? (
                      <div className="text-body-small-regular text-muted-foreground mt-2 line-clamp-3 overflow-hidden leading-snug break-words">
                        {descriptionText}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end justify-center gap-3 py-2">
                    {thumbnailSrc ? (
                      <Image
                        src={thumbnailSrc}
                        alt={symbolDisplay || 'Strategy image'}
                        width={72}
                        height={72}
                        unoptimized
                        className="bg-muted h-[72px] w-[72px] rounded object-cover dark:bg-neutral-800"
                      />
                    ) : null}

                    {timeText ? (
                      <span className="text-muted-foreground text-body-small-regular leading-tight">
                        {timeText}
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* View All */}
      {hasResults && shouldShowButton && (
        <button
          className="text-foreground bg-muted hover:bg-muted/80 mt-4 w-full rounded py-3 font-medium"
          onClick={
            scrollableList
              ? handleLoadMore
              : () => router.push('/discover?tab=strategy', { scroll: false })
          }
          disabled={isLoadingMore}
        >
          {isLoadingMore
            ? t('home.loading', { defaultValue: 'Loading...' })
            : scrollableList
              ? t('home.loadMore', { defaultValue: 'Load more' })
              : t('home.viewAll', { defaultValue: 'View all' })}
        </button>
      )}
    </div>
  );
};
