'use client';

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { RefreshCcw01 } from '@untitledui/icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { newsService } from '@/services/newsService';
import { Button } from '@/components/shared/atoms/button';
import { NewsItemSkeleton } from './skeletons';
import { useTranslation } from 'react-i18next';

dayjs.extend(relativeTime);

const TAKE = 5;

interface HomeNewsProps {
  scrollableList?: boolean;
  separateTopicContainer?: boolean;
  webLayout?: boolean;
}

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

export const HomeNews = ({
  scrollableList = false,
  separateTopicContainer = false,
  webLayout = false,
}: HomeNewsProps) => {
  const router = useRouter();
  const { t } = useTranslation();

  const [topics, setTopics] = useState<string[]>([]);
  const [activeTopic, setActiveTopic] = useState<string>('All'); // Changed to single active topic
  const [allEvents, setAllEvents] = useState<any[]>([]);

  const [skip, setSkip] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isFetchingTopic, setIsFetchingTopic] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const topicRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const fetchedTopics = await newsService.getNewsTopics();
      const validTopics = Array.isArray(fetchedTopics) ? fetchedTopics : [];
      setTopics(validTopics);

      // Set initial active topic to 'All'
      setActiveTopic('All');

      // Fetch news for 'All' topics initially
      const response = await newsService.getNewsList({
        topics: validTopics, // Pass all fetched topics for 'All'
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
      const topicsToFetch = activeTopic === 'All' ? topics : [activeTopic]; // Use activeTopic
      const response = await newsService.getNewsList({
        topics: topicsToFetch,
        skip: skip,
        take: TAKE,
      });

      if (response.data && response.data.length > 0) {
        setAllEvents((prev) => {
          const existingIds = new Set(prev.map((item) => item.id));
          const newEvents = response.data.filter((item: any) => !existingIds.has(item.id));
          return [...prev, ...newEvents];
        });
        setSkip((prev) => prev + TAKE);

        if (response.total !== undefined) {
          setHasMore(skip + TAKE < response.total);
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
  }, [isLoadingMore, hasMore, activeTopic, topics, skip]); // Add `topics` to dependencies

  const onRefresh = () => {
    setSkip(0);
    setHasMore(true);
    setAllEvents([]);
    loadInitialData(); // Re-load initial data, which will set activeTopic to 'All'
  };

  const handleTopicClick = async (topic: string) => {
    if (activeTopic === topic) return; // Already selected

    const topicElement = topicRefs.current[topic];
    if (topicElement) {
      topicElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }

    setActiveTopic(topic);
    try {
      setIsFetchingTopic(true);
      setSkip(0); // Reset skip when changing topic
      setAllEvents([]); // Clear events for new topic
      setHasMore(true); // Assume more data for new topic

      const topicsToFetch = topic === 'All' ? topics : [topic];
      const response = await newsService.getNewsList({
        topics: topicsToFetch,
        skip: 0,
        take: TAKE,
      });

      if (response.data && response.data.length > 0) {
        setAllEvents((prev) => {
          const existingIds = new Set(prev.map((item) => item.id));
          const newEvents = response.data.filter((item: any) => !existingIds.has(item.id));
          return [...newEvents, ...prev];
        });
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
      className={`sticky top-[calc(60px+env(safe-area-inset-top))] z-10 pt-2 pb-2 ${
        renderTopicOutsideCard ? 'bg-background' : 'bg-card'
      }`}
    >
      <div
        className="overflow-x-auto [&::-webkit-scrollbar]:hidden"
        style={{ msOverflowStyle: 'none', scrollbarWidth: 'none', display: 'flex' }}
      >
        <div className="flex flex-row items-center gap-2">
          {isLoading && topics.length === 0
            ? [1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-muted h-7 w-20 shrink-0 animate-pulse rounded" />
              ))
            : ['All', ...topics].map((topic) => {
                // Prepend 'All' for display
                const active = activeTopic === topic;
                return (
                  <button
                    ref={(el) => {
                      topicRefs.current[topic] = el;
                    }}
                    key={topic}
                    onClick={() => handleTopicClick(topic)}
                    className={`text-body-regular border-b-2 px-3 py-1 whitespace-nowrap transition-colors ${
                      active
                        ? 'text-primary-500 border-primary-500'
                        : 'text-muted-foreground border-transparent'
                    }`}
                  >
                    {topic.charAt(0).toUpperCase() + topic.slice(1)}
                  </button>
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
          {' '}
          {/* Added px-4 for consistency */}
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
          <button onClick={onRefresh} className="bg-muted x-4 flex items-center gap-2 rounded py-2">
            <RefreshCcw01 size={16} />
            {t('home.retry')}
          </button>
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
            className={webLayout ? 'grid grid-cols-1 gap-4 py-2 md:grid-cols-2 xl:grid-cols-3' : ''}
          >
            {allEvents.map((event) => (
              <button
                key={event.id}
                className={
                  webLayout
                    ? 'border-border hover:bg-muted h-full overflow-hidden rounded border text-left transition-colors'
                    : 'border-border hover:bg-muted flex w-full gap-3 border-b py-4 text-left transition-colors last:border-none'
                }
                onClick={() => window.open(event.url, '_blank')}
              >
                {webLayout ? (
                  <div className="flex h-full flex-col">
                    {event.imageUrl ? (
                      <img
                        src={event.imageUrl}
                        alt={event.title}
                        className="bg-muted h-44 w-full object-cover"
                      />
                    ) : null}
                    <div className="flex flex-1 flex-col p-4">
                      <p className="text-body-large-semibold text-foreground line-clamp-3">
                        {event.title}
                      </p>

                      <div className="text-body-regular mt-3 flex items-center gap-3">
                        <span className="text-foreground truncate">{event.topic}</span>
                        <span className="bg-muted-foreground h-4 w-px"></span>
                        <span className="text-muted-foreground whitespace-nowrap">
                          {formatTimeAgo(event.publishedAt, t)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="text-body-large-semibold text-foreground line-clamp-2">
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
              </button>
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
            onClick={scrollableList ? handleLoadMore : () => router.push('/discover?tab=News')}
            className={webLayout ? 'w-full max-w-60 py-2' : 'w-full py-2'}
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
};

