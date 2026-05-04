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
import { Button } from '@/components/shared/atoms/button';

dayjs.extend(relativeTime);

const TAKE = 5;

function normalizeLocale(language?: string) {
  if (!language) return 'en-US';
  const code = String(language);
  const lower = code.toLowerCase();

  if (lower === 'en' || lower.startsWith('en-')) return 'en-US';
  if (lower === 'vi' || lower.startsWith('vi-')) return 'vi-VN';
  if (lower.startsWith('zh-')) return code;

  return code.replace(/-en$/i, '-US');
}

function normalizeTimeMs(time?: number) {
  const value = time ?? 0;
  return value > 1e12 ? value : value * 1000;
}

function extractMetricsFromTitle(title?: string) {
  const normalizedTitle = typeof title === 'string' ? title : '';
  if (!normalizedTitle) return { cleanTitle: '', price: '', change: '' };

  const metricPattern = /(\d+(?:[.,]\d+)*)(?:\s+|\s*[|/-]\s*)([+-]\d+(?:[.,]\d+)?%)/;
  const match = normalizedTitle.match(metricPattern);

  if (!match) {
    return { cleanTitle: normalizedTitle, price: '', change: '' };
  }

  const [fullMatch, price, change] = match;
  const cleanTitle = normalizedTitle
    .replace(fullMatch, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return {
    cleanTitle: cleanTitle || normalizedTitle,
    price,
    change,
  };
}

export default function NewsStrategy() {
  const { t } = useTranslation();
  const router = useRouter();
  const { mode } = useTheme();
  const hasHydratedApp = useAppHydrated();
  const appLanguage = useAppStore((s) => s.language);
  const strategyLocale = useMemo(() => normalizeLocale(appLanguage), [appLanguage]);

  const scrollableList = true;

  const [page, setPage] = useState(1);
  const [allStrategies, setAllStrategies] = useState<StrategyResultItem[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasNoMoreFromApi, setHasNoMoreFromApi] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyResultItem | null>(null);

  const { data, isLoading } = useStrategyPage(
    {
      page,
      size: scrollableList ? TAKE : 10,
      type: 'ALL',
      locale: strategyLocale,
    },
    {
      enabled: hasHydratedApp,
    },
  );

  useEffect(() => {
    if (isLoading || !data?.value?.resultList) return;

    const incoming = data.value.resultList;

    setAllStrategies((prev) => {
      if (page === 1) {
        return incoming;
      }

      const existingIds = new Set(prev.map((item) => item.id));
      const newItems = incoming.filter((item) => !existingIds.has(item.id));
      return [...prev, ...newItems];
    });

    setHasNoMoreFromApi(incoming.length < TAKE);
    setIsLoadingMore(false);
  }, [data, isLoading, page, TAKE]);

  const total = data?.value?.total;
  const hasMore = hasNoMoreFromApi
    ? false
    : total !== undefined
      ? allStrategies.length < total
      : data?.value?.resultList?.length === (scrollableList ? TAKE : 10);
  const hasResults = allStrategies.length > 0;

  const shouldShowButton = scrollableList
    ? hasMore
    : total !== undefined
      ? total > 5
      : data?.value?.resultList?.length === 5;

  const visibleStrategies = useMemo(() => {
    if (!Array.isArray(allStrategies) || allStrategies.length === 0) return [];
    return scrollableList ? allStrategies : allStrategies.slice(0, 5);
  }, [allStrategies, scrollableList]);

  useEffect(() => {
    if (visibleStrategies.length === 0) {
      setSelectedStrategy(null);
      return;
    }

    setSelectedStrategy((prev) => {
      if (!prev) return visibleStrategies[0];
      const found = visibleStrategies.find((item) => item.id === prev.id);
      return found ?? visibleStrategies[0];
    });
  }, [visibleStrategies]);

  const showInitialSkeleton =
    page === 1 && !hasResults && (isLoading || !hasHydratedApp) && visibleStrategies.length === 0;

  const getStrategyImage = (item?: StrategyResultItem | null) => {
    if (!item) return undefined;
    return mode === 'dark' ? (item.darkImage ?? item.image) : (item.image ?? item.darkImage);
  };

  const formatStrategyTimeAgo = (time: number) => dayjs(normalizeTimeMs(time)).fromNow();

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      setIsLoadingMore(true);
      setPage((p) => p + 1);
    }
  };

  return (
    <div className={scrollableList ? 'flex-1 pb-16' : 'pb-16'}>
      {showInitialSkeleton ? (
        <div className="flex flex-col gap-4 xl:grid xl:grid-cols-3 xl:items-start xl:gap-6">
          <div className="xl:col-span-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="mb-3 w-full animate-pulse rounded p-4">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="bg-muted h-5 w-1/3 rounded" />
                    <div className="bg-muted mt-2 h-4 w-4/5 rounded" />
                    <div className="bg-muted mt-2 h-4 w-3/5 rounded" />
                  </div>
                  <div className="bg-muted h-16 w-16 shrink-0 rounded" />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-card border-border min-h-[280px] animate-pulse rounded-lg border p-5 xl:col-span-2">
            <div className="bg-muted h-8 w-2/5 rounded" />
            <div className="bg-muted mt-3 h-40 w-full rounded" />
            <div className="bg-muted mt-4 h-4 w-11/12 rounded" />
            <div className="bg-muted mt-2 h-4 w-10/12 rounded" />
          </div>
        </div>
      ) : visibleStrategies.length === 0 ? (
        <div className="flex h-full min-h-[50vh] flex-col items-center justify-center">
          <p className="text-body-large-medium text-muted-foreground">
            {t('home.noItemsAvailable', { type: t('home.strategyTab') })}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 xl:grid xl:h-[calc(100vh-8.5rem)] xl:grid-cols-[minmax(340px,38%)_minmax(0,1fr)] xl:gap-6 xl:overflow-hidden">
          <div className="[scrollbar-color:var(--color-neutral-300)_transparent] xl:h-full xl:overflow-y-auto xl:pr-1 dark:[scrollbar-color:var(--color-neutral-600)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-600">
            {visibleStrategies.map((strategy, index) => {
              const isSelected = selectedStrategy?.id === strategy.id;

              const direction = String(strategy.direction ?? '').toLowerCase();
              const isDown = direction === 'down';
              const symbolDisplay = (strategy.symbolName ?? strategy.symbol ?? '').toString();
              const periodDisplay = (strategy.period ?? '').toString().replace(/_/g, ' ');
              const tradeTypeText = isDown
                ? t('symbolDetail.sell', 'Sell')
                : t('symbolDetail.buy', 'Buy');
              const directionLabel = periodDisplay ? `${periodDisplay}` : tradeTypeText;
              const titleText = strategy.title ?? symbolDisplay;
              const descriptionText = strategy.description ?? '';
              const timeText =
                typeof strategy.time === 'number' ? formatStrategyTimeAgo(strategy.time) : '';
              const { cleanTitle } = extractMetricsFromTitle(titleText);
              const headerTitle = cleanTitle || symbolDisplay;

              return (
                <div key={strategy.id}>
                  <Button
                    variant="white-contained"
                    className={`mb-3 !flex min-h-[112px] w-full items-start justify-start rounded px-3 py-2.5 text-left whitespace-normal transition-all ${isSelected ? 'border-primary-500 bg-neutral-100 dark:bg-neutral-900' : 'hover:bg-muted/70 border-transparent'}`}
                    type="button"
                    onClick={() => setSelectedStrategy(strategy)}
                  >
                    <div className="flex w-full items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-foreground text-body-large-semibold truncate leading-none">
                            {symbolDisplay}
                          </span>

                          <div className="mr-2 flex shrink-0 items-center gap-2">
                            <span
                              className={`-mr-2 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium ${isDown ? 'bg-red-50 text-red-500 dark:bg-red-900/30 dark:text-red-300' : 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-300'}`}
                            >
                              <span className="text-caption-medium leading-none">
                                {isDown ? '↓' : '↑'}
                              </span>
                              <span className="uppercase">{directionLabel}</span>
                            </span>
                          </div>
                        </div>

                        {descriptionText ? (
                          <div className="text-muted-foreground text-body-small-regular line-clamp-2 min-h-[40px] leading-5 break-words">
                            {descriptionText}
                          </div>
                        ) : headerTitle ? (
                          <div className="text-muted-foreground text-body-small-regular line-clamp-2 min-h-[40px] leading-5 break-words">
                            {headerTitle}
                          </div>
                        ) : null}

                        {timeText ? (
                          <span className="text-muted-foreground text-caption-regular block leading-none opacity-90">
                            {timeText}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </Button>

                  {index < visibleStrategies.length - 1 ? (
                    <div className="bg-border/70 mb-3 h-px w-full" />
                  ) : null}
                </div>
              );
            })}

            <div className="mt-1 min-h-[52px]">
              {hasResults && shouldShowButton && (
                <Button
                  type="button"
                  variant="neutral-contained"
                  className="text-foreground hover:bg-muted/80 w-full rounded py-3 font-medium"
                  onClick={
                    scrollableList
                      ? handleLoadMore
                      : () => {
                          router.push('/discover?tab=strategy');
                          window.scrollTo(0, 0);
                        }
                  }
                  disabled={isLoadingMore}
                >
                  {isLoadingMore
                    ? t('home.loading', { defaultValue: 'Loading...' })
                    : scrollableList
                      ? t('home.loadMore', { defaultValue: 'Load more' })
                      : t('home.viewAll', { defaultValue: 'View all' })}
                </Button>
              )}
            </div>

            <div className="h-6" />
          </div>

          <div className="bg-background border-border rounded-lg border xl:flex xl:h-full xl:flex-col xl:overflow-hidden">
            <div className="border-border border-b px-5 py-4 lg:px-6">
              <h2 className="text-h3-semibold text-foreground line-clamp-2">
                {selectedStrategy?.title ?? t('home.strategyTab', 'Strategy')}
              </h2>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 [scrollbar-color:var(--color-neutral-300)_transparent] lg:px-6 dark:[scrollbar-color:var(--color-neutral-600)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-300 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-600">
              {(() => {
                const src = getStrategyImage(selectedStrategy);
                if (!src) return null;

                return (
                  <div className="bg-muted border-border overflow-hidden rounded-lg border p-2 dark:border-neutral-700 dark:bg-neutral-900">
                    <Image
                      src={src}
                      alt={selectedStrategy?.title ?? 'Strategy image'}
                      width={900}
                      height={500}
                      className="h-[220px] w-full object-contain lg:h-[260px]"
                    />
                  </div>
                );
              })()}

              <div className="flex flex-wrap items-center gap-2">
                {(() => {
                  const direction = String(selectedStrategy?.direction ?? '').toLowerCase();
                  const isDown = direction === 'down';
                  const periodDisplay = (selectedStrategy?.period ?? '')
                    .toString()
                    .replace(/_/g, ' ');
                  const tradeTypeText = isDown
                    ? t('symbolDetail.sell', 'Sell')
                    : t('symbolDetail.buy', 'Buy');
                  const directionLabel = periodDisplay
                    ? `${periodDisplay} ${tradeTypeText}`
                    : tradeTypeText;

                  return (
                    <>
                      {selectedStrategy?.symbolName ? (
                        <span className="text-body-small-medium text-foreground bg-muted rounded px-2 py-1 dark:bg-neutral-800">
                          {selectedStrategy.symbolName}
                        </span>
                      ) : null}

                      {selectedStrategy?.period ? (
                        <span className="text-body-small-medium text-muted-foreground bg-muted rounded px-2 py-1 dark:bg-neutral-800">
                          {selectedStrategy.period}
                        </span>
                      ) : null}

                      {selectedStrategy?.direction ? (
                        <span
                          className={`text-body-small-medium rounded px-2 py-1 ${direction === 'down' ? 'bg-red-50 text-red-500 dark:bg-red-900/30 dark:text-red-300' : 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-300'}`}
                        >
                          <span className="mr-1">{isDown ? '↓' : '↑'}</span>
                          {directionLabel}
                        </span>
                      ) : null}

                      {Number.isFinite(selectedStrategy?.time) ? (
                        <span className="text-body-small-medium text-muted-foreground">
                          {dayjs(normalizeTimeMs(selectedStrategy?.time)).format(
                            'DD MMM YYYY, HH:mm',
                          )}
                        </span>
                      ) : null}
                    </>
                  );
                })()}
              </div>

              <div className="space-y-4">
                {selectedStrategy?.description ? (
                  <p className="text-body-small-regular text-muted-foreground whitespace-pre-line">
                    {selectedStrategy.description}
                  </p>
                ) : null}

                {selectedStrategy?.preference ? (
                  <div>
                    <div className="text-body-small-semibold text-foreground">
                      {t('symbolDetail.analysis.ourPreference', 'Our preference')}
                    </div>
                    <p className="text-body-small-regular text-muted-foreground mt-1 whitespace-pre-line">
                      {selectedStrategy.preference}
                    </p>
                  </div>
                ) : null}

                {selectedStrategy?.technology ? (
                  <div>
                    <div className="text-body-small-semibold text-foreground">
                      {t('symbolDetail.analysis.comment', 'Comment')}
                    </div>
                    <p className="text-body-small-regular text-muted-foreground mt-1 whitespace-pre-line">
                      {selectedStrategy.technology}
                    </p>
                  </div>
                ) : null}

                {selectedStrategy?.alternative ? (
                  <div>
                    <div className="text-body-small-semibold text-foreground">
                      {t('symbolDetail.analysis.alternativeScenario', 'Alternative scenario')}
                    </div>
                    <p className="text-body-small-regular text-muted-foreground mt-1 whitespace-pre-line">
                      {selectedStrategy.alternative}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
