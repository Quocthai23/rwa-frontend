'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCcw01 } from '@untitledui/icons';
import { useRouter } from 'next/navigation';
import {
  CalendarDateSelector,
  CalendarEventItem,
  CalendarSubTabs,
} from './CalendarList/components';
import CalendarModal from './CalendarList/CalendarModal';
import { useCalendarEvents } from '@/hook/useCalendarEvents';
import { toISODateString } from '@/utils/dateUtils';
import { CalendarEventType } from '@/types/calendar';
import { Button } from '@/components/shared/atoms/button';
import { CalendarItemSkeleton } from './skeletons';
import { useTranslation } from 'react-i18next';

const TAKE = 5;

export default function HomeCalendar({ scrollableList = false }: { scrollableList?: boolean }) {
  const router = useRouter();
  const { t } = useTranslation();

  const [activeSubTab, setActiveSubTab] = useState('featured');

  const today = new Date();
  const todayKey = useMemo(() => toISODateString(today), []);

  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [skip, setSkip] = useState(0);

  const [anchorDate, setAnchorDate] = useState(todayKey);
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const {
    data: calendarData,
    error,
    isLoading,
    refetch,
  } = useCalendarEvents({
    date: selectedDate,
    take: TAKE,
    skip,
    type: activeSubTab as CalendarEventType,
  });

  useEffect(() => {
    if (error) {
      setIsLoadingMore(false);
      setIsResetting(false);
      return;
    }

    if (!calendarData?.data) return;

    setAllEvents((prev) => (skip === 0 ? calendarData.data : [...prev, ...calendarData.data]));

    setIsLoadingMore(false);
    setIsResetting(false);
  }, [calendarData, skip, error]);

  const hasError = !!error;

  const handleLoadMore = useCallback(() => {
    if (isLoading || isLoadingMore || !calendarData) return;
    if ((calendarData.data?.length ?? 0) < TAKE) return;

    const currentLoaded = skip + TAKE;

    if (currentLoaded < calendarData.total) {
      setIsLoadingMore(true);
      setSkip((p) => p + TAKE);
    }
  }, [isLoading, isLoadingMore, calendarData, skip]);

  const onDateSelect = useCallback((dateKey: string) => {
    setSelectedDate(dateKey);
    setSkip(0);
    setAllEvents([]);
    setIsResetting(true);
  }, []);

  const onSubTabChange = useCallback((tab: string) => {
    setActiveSubTab(tab);
    setSkip(0);
    setAllEvents([]);
    setIsResetting(true);
  }, []);

  const onRefresh = useCallback(() => {
    setSkip(0);
    setAllEvents([]);
    refetch();
  }, [refetch]);

  const onMonthChange = useCallback((direction: 'next' | 'prev') => {
    setCurrentMonth((prev) => {
      const newMonth = new Date(prev);
      if (direction === 'prev') newMonth.setMonth(newMonth.getMonth() - 1);
      else newMonth.setMonth(newMonth.getMonth() + 1);
      return newMonth;
    });
  }, []);

  const listHeader = (
    <div className="bg-background sticky top-[calc(60px+env(safe-area-inset-top))] z-10 pt-2">
      <CalendarSubTabs
        activeSubTab={activeSubTab as CalendarEventType}
        onSubTabChange={onSubTabChange}
      />

      <CalendarDateSelector
        anchorDate={anchorDate}
        displayDays={5}
        selectedDate={selectedDate}
        onDateSelect={onDateSelect}
        onShowCalendarModal={() => setShowCalendarModal(true)}
      />
    </div>
  );

  const renderEmpty = () => {
    if (isLoading || isResetting) {
      return (
        <div className="flex flex-col">
          {[1, 2, 3, 4, 5].map((i) => (
            <CalendarItemSkeleton key={i} />
          ))}
        </div>
      );
    }

    if (hasError) {
      return (
        <div className="flex flex-col items-center p-8">
          <p className="text-muted-foreground mb-4">{t('home.failedLoadData')}</p>

          <button onClick={onRefresh} className="bg-muted flex items-center gap-2 px-4 py-2">
            <RefreshCcw01 size={16} />
            {t('home.retry')}
          </button>
        </div>
      );
    }

    if (!isLoading && !isLoadingMore && allEvents.length === 0) {
      return (
        <div className="text-muted-foreground p-8 text-center">{t('home.noDataAvailable')}</div>
      );
    }

    return null;
  };

  return (
    <div className={scrollableList ? 'flex-1 pb-16' : 'pb-16'}>
      {!scrollableList && listHeader}

      <div className="border-border">
        {scrollableList && listHeader}

        <div className="px-4">
          {allEvents.map((event, index) => (
            <CalendarEventItem key={`${event.id}-${index}`} event={event} />
          ))}

          {renderEmpty()}

          {isLoadingMore && (
            <div className="flex justify-center py-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
            </div>
          )}
        </div>
      </div>

      {calendarData && allEvents.length < calendarData.total && (
        <div className="pt-4">
          <Button
            variant="neutral-contained"
            onClick={scrollableList ? handleLoadMore : () => router.push('/discover?tab=calendar')}
            className="h-10 w-full"
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

      {showCalendarModal && (
        <CalendarModal
          visible={showCalendarModal}
          currentMonth={currentMonth}
          selectedDate={selectedDate}
          onClose={() => setShowCalendarModal(false)}
          onDateSelect={(date) => {
            onDateSelect(date);
            setAnchorDate(date);
            setShowCalendarModal(false);
          }}
          onMonthChange={onMonthChange}
        />
      )}
    </div>
  );
}
