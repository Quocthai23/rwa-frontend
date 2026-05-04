'use client';

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { RefreshCcw01 } from '@untitledui/icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { newsService } from '@/services/newsService';
import { Button } from '@/components/shared/atoms/button';
import { NewsItemSkeleton } from '@/components/featured/home/skeletons';
import { useTranslation } from 'react-i18next';

dayjs.extend(relativeTime);

const TAKE = 15;

function formatTimeAgo(
  publishedAt: string,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  const date = dayjs(publishedAt);
  const diffMinutes = dayjs().diff(date, 'minute');
  if (diffMinutes < 60) return t('home.minutesAgo', { count: diffMinutes });

  const diffHours = dayjs().diff(date, 'hour');
  if (diffHours < 24) return t('home.hoursAgo', { count: diffHours });

  const diffDays = dayjs().diff(date, 'day');
  return t('home.daysAgo', { count: diffDays });
}

export default function NewsContent() {
  const router = useRouter();
  const { t } = useTranslation();

  const scrollableList = true;
  const separateTopicContainer = true;
  const webLayout = true;
  const [topics, setTopics] = useState<string[]>([]);
  const [activeTopic, setActiveTopic] = useState<string>('All');
  const [allEvents, setAllEvents] = useState<any[]>([]);

  const [skip, setSkip] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isFetchingTopic, setIsFetchingTopic] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const topicRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const normalizeTopic = (value: unknown): string | null => {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  };

  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const fetchedTopics = await newsService.getNewsTopics();
      const validTopics = Array.isArray(fetchedTopics)
        ? fetchedTopics
            .map((topic) => normalizeTopic(topic))
            .filter((topic): topic is string => Boolean(topic))
        : [];
      setTopics(validTopics);
      setActiveTopic('All');

      const response = await newsService.getNewsList({
        topics: validTopics,
        skip: 0,
        take: TAKE,
      });

      setAllEvents(response.data || []);
      setSkip(TAKE);

      if (response.total !== undefined) {
        setHasMore(TAKE < response.total);
      } else {
        setHasMore((response.data?.length || 0) === TAKE);
      }
    } catch (error) {
      console.error('Failed to load initial data:', error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    try {
      setIsLoadingMore(true);
      const currentSkip = skip;
      const topicsToFetch = activeTopic === 'All' ? topics : [activeTopic];
      const response = await newsService.getNewsList({
        topics: topicsToFetch,
        skip: currentSkip,
        take: TAKE,
      });

      if (response.data && response.data.length > 0) {
        setAllEvents((prev) => {
          const existingIds = new Set(prev.map((item) => item.id));
          const newEvents = response.data.filter((item: any) => !existingIds.has(item.id));
          return [...prev, ...newEvents];
        });
        const nextSkip = currentSkip + TAKE;
        setSkip(nextSkip);

        if (response.total !== undefined) {
          setHasMore(nextSkip < response.total);
        } else {
          setHasMore(response.data.length === TAKE);
        }
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more news:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, activeTopic, topics, skip]);

  const onRefresh = () => {
    setSkip(0);
    setHasMore(true);
    setAllEvents([]);
    loadInitialData();
  };

  const handleTopicClick = async (topic: string) => {
    if (activeTopic === topic) return;

    const topicElement = topicRefs.current[topic];
    if (topicElement) {
      topicElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }

    setActiveTopic(topic);
    window.scrollTo(0, 0);
    try {
      setIsFetchingTopic(true);
      setSkip(0);
      setAllEvents([]);
      setHasMore(true);

      const topicsToFetch = topic === 'All' ? topics : [topic];
      const response = await newsService.getNewsList({
        topics: topicsToFetch,
        skip: 0,
        take: TAKE,
      });

      const firstPageEvents = response.data || [];
      setAllEvents(firstPageEvents);
      setSkip(firstPageEvents.length > 0 ? TAKE : 0);

      if (response.total !== undefined) {
        setHasMore(firstPageEvents.length < response.total);
      } else {
        setHasMore(firstPageEvents.length === TAKE);
      }
    } catch (error) {
      console.error('Error fetching new topic:', error);
    } finally {
      setIsFetchingTopic(false);
    }
  };

  const renderTopicOutsideCard = !scrollableList || separateTopicContainer;

  const listHeader = (
    <div
      className={`sticky top-[128px] z-20 pt-2 pb-2 ${renderTopicOutsideCard ? 'bg-background' : 'bg-card'}`}
    >
      <div
        className="overflow-x-auto [&::-webkit-scrollbar]:hidden"
        style={{ msOverflowStyle: 'none', scrollbarWidth: 'none', display: 'flex' }}
      >
        <div className="border-border flex flex-row items-center gap-1 border-b">
          {isLoading && topics.length === 0
            ? [1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-muted h-7 w-20 shrink-0 animate-pulse rounded" />
              ))
            : ['All', ...topics].map((topic) => {
                const active = activeTopic === topic;
                return (
                  <Button
                    variant="white-contained"
                    key={topic}
                    ref={(el) => {
                      topicRefs.current[topic] = el;
                    }}
                    type="button"
                    onClick={() => handleTopicClick(topic)}
                    className={`text-body-regular rounded-none border-b-2 px-3 py-1.5 whitespace-nowrap transition-colors ${active ? 'text-primary-500 border-primary-500 dark:text-primary-500 font-medium' : 'text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 border-transparent'}`}
                  >
                    {topic === 'All' ? topic : topic.charAt(0).toUpperCase() + topic.slice(1)}
                  </Button>
                );
              })}
        </div>
      </div>
    </div>
  );

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col px-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <NewsItemSkeleton key={i} />
          ))}
        </div>
      );
    }

    if (isError) {
      return (
        <div className="flex flex-col items-center p-8 text-center">
          <p className="text-muted-foreground mb-4">{t('home.failedLoadData')}</p>
          <Button
            type="button"
            variant="neutral-contained"
            onClick={onRefresh}
            className="x-4 flex items-center gap-2 rounded py-2"
          >
            <RefreshCcw01 size={16} />
            {t('home.retry')}
          </Button>
        </div>
      );
    }

    if (!isLoading && !isLoadingMore && !isFetchingTopic && allEvents.length === 0) {
      return (
        <div className="text-muted-foreground p-8 text-center">{t('home.noDataAvailable')}</div>
      );
    }

    return null;
  };

  return (
    <div className={scrollableList ? 'flex-1 pb-16' : 'pb-16'}>
      {renderTopicOutsideCard && listHeader}

      <div className="border-border bg-background overflow-hidden rounded">
        {!renderTopicOutsideCard && listHeader}

        <div className="px-4">
          {allEvents.length === 0 && !isLoading && renderEmpty()}
          {isFetchingTopic && (
            <div className="flex flex-col">
              {[1, 2, 3].map((i) => (
                <NewsItemSkeleton key={`fetching-${i}`} />
              ))}
            </div>
          )}

          <div
            className={
              webLayout
                ? 'grid grid-cols-1 gap-y-3 py-2 md:grid-cols-2 md:gap-x-20 xl:grid-cols-3'
                : ''
            }
          >
            {allEvents.map((event) => (
              <Button
                key={event.id}
                type="button"
                variant="white-contained"
                className={
                  webLayout
                    ? 'border-border hover:bg-muted/40 flex min-h-[108px] w-full items-center gap-3 border-b px-3 py-3 text-left transition-colors'
                    : 'border-border hover:bg-muted flex w-full gap-3 rounded border px-3 py-4 text-left transition-colors'
                }
                onClick={() => window.open(event.url, '_blank')}
              >
                {webLayout ? (
                  <>
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-body-large-semibold text-foreground truncate leading-6"
                        title={event.title}
                      >
                        {event.title}
                      </p>

                      <div className="text-body-regular mt-2 flex items-center gap-2">
                        <span className="text-foreground truncate">
                          {event.source || event.topic || 'News'}
                        </span>
                        <span className="bg-muted-foreground h-4 w-px" />
                        <span className="text-muted-foreground whitespace-nowrap">
                          {formatTimeAgo(event.publishedAt, t)}
                        </span>
                      </div>
                    </div>

                    {event.imageUrl ? (
                      <img
                        src={event.imageUrl}
                        alt={event.title}
                        className="bg-muted h-[72px] w-[112px] shrink-0 rounded object-cover"
                      />
                    ) : (
                      <div className="bg-muted h-[72px] w-[112px] shrink-0 rounded" />
                    )}
                  </>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-body-large-semibold text-foreground truncate"
                        title={event.title}
                      >
                        {event.title}
                      </p>

                      <div className="text-body-regular mt-1 flex items-center gap-3">
                        <span className="text-foreground">{event.topic}</span>
                        <span className="bg-muted-foreground h-4 w-px"></span>
                        <span className="text-muted-foreground">
                          {formatTimeAgo(event.publishedAt, t)}
                        </span>
                      </div>
                    </div>

                    {event.imageUrl && (
                      <img
                        src={event.imageUrl}
                        alt={event.title}
                        className="bg-muted h-20 w-20 shrink-0 object-cover"
                      />
                    )}
                  </>
                )}
              </Button>
            ))}
          </div>

          {isLoadingMore && (
            <div className="flex flex-col">
              {[1, 2, 3].map((i) => (
                <NewsItemSkeleton key={`load-more-${i}`} />
              ))}
            </div>
          )}
        </div>
      </div>

      {hasMore && allEvents.length > 0 && (
        <div className="flex justify-center pt-4">
          <Button
            variant="neutral-contained"
            onClick={
              scrollableList
                ? handleLoadMore
                : () => {
                    router.push('/discover?tab=News');
                    window.scrollTo(0, 0);
                  }
            }
            className={webLayout ? 'w-full py-2' : 'w-full py-2'}
            disabled={isLoadingMore}
          >
            {isLoadingMore
              ? t('home.loading', { defaultValue: 'Loading...' })
              : scrollableList
                ? t('home.loadMore', { defaultValue: 'Load more' })
                : t('home.viewAll', { defaultValue: 'View all' })}
          </Button>
        </div>
      )}
    </div>
  );
}
