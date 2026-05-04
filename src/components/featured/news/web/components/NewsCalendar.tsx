'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, RefreshCcw01 } from '@untitledui/icons';
import CalendarModal from '@/components/featured/home/CalendarList/CalendarModal';
import { useCalendarEvents } from '@/hook/useCalendarEvents';
import { formatToMMDD, toISODateString } from '@/utils/dateUtils';
import { CalendarEvent, CalendarEventType } from '@/types/calendar';
import { Button } from '@/components/shared/atoms/button';
import { CalendarItemSkeleton } from '@/components/featured/home/skeletons';
import { useTranslation } from 'react-i18next';
import { cn } from '@/utils';
import NewsCalendarEventItem from './NewsCalendarEventItem';
import dayjs from 'dayjs';

const TAKE = 10;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type NewsCalendarEvent = CalendarEvent & {
  countryCode?: string;
  country?: string;
  time?: string;
};

function getCenteredDates(
  centerDate: Date,
  numberOfDays: number,
): Array<{ dateKey: string; displayDate: string; day: string }> {
  const offset = Math.floor(numberOfDays / 2);

  return Array.from({ length: numberOfDays }, (_, i) => {
    const day = new Date(centerDate);
    day.setDate(centerDate.getDate() - offset + i);

    return {
      dateKey: toISODateString(day),
      displayDate: formatToMMDD(day),
      day: DAY_NAMES[day.getDay()],
    };
  });
}

export default function NewsCalendar() {
  const { t } = useTranslation();

  const [activeSubTab, setActiveSubTab] = useState('featured');

  const today = new Date();
  const todayKey = useMemo(() => toISODateString(today), []);

  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [skip, setSkip] = useState(0);

  const [anchorDate, setAnchorDate] = useState(todayKey);
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [allEvents, setAllEvents] = useState<NewsCalendarEvent[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const subTabs: Array<{ id: CalendarEventType; label: string }> = [
    { id: 'featured', label: t('home.calendarFeatured') },
    { id: 'data', label: t('home.calendarData') },
    { id: 'event', label: t('home.calendarEvent') },
    { id: 'holiday', label: t('home.calendarHoliday') },
  ];

  const dates = useMemo(() => {
    const centerDate = new Date(anchorDate || selectedDate);
    return getCenteredDates(centerDate, 5);
  }, [anchorDate, selectedDate]);

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
    window.scrollTo(0, 0);
  }, []);

  const onSubTabChange = useCallback((tab: string) => {
    setActiveSubTab(tab);
    setSkip(0);
    setAllEvents([]);
    setIsResetting(true);
    window.scrollTo(0, 0);
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
    <header className="bg-background sticky top-[128px] z-20 space-y-3 pb-3">
      <div className="flex items-center justify-between overflow-x-auto [&::-webkit-scrollbar]:hidden">
        <div className="border-border flex min-w-max items-center gap-1 border-b">
          {subTabs.map((tab) => {
            const active = activeSubTab === tab.id;
            return (
              <Button
                key={tab.id}
                type="button"
                variant="white-contained"
                onClick={() => onSubTabChange(tab.id)}
                className={cn(
                  'typo-body-regular text-muted-foreground rounded-none border-b-2 border-transparent px-3 py-1.5 whitespace-nowrap transition-colors',
                  active
                    ? 'typo-body-medium text-primary-500 border-primary-500'
                    : 'hover:text-foreground hover:border-muted-foreground/40',
                )}
              >
                {tab.label}
              </Button>
            );
          })}
        </div>
        <Button
          type="button"
          variant="white-contained"
          className="hover:bg-background text-foreground bg-card flex items-center justify-center gap-2 rounded-sm p-2 transition-colors"
          onClick={() => setShowCalendarModal(true)}
          aria-label="Open calendar"
        >
          <Calendar size={16} />
          <span className="text-body-small-medium">{dayjs(selectedDate).format('DD/MM/YYYY')}</span>
        </Button>
      </div>

      <div className="bg-card rounded-md py-1.5">
        <div className="grid grid-cols-[repeat(5,minmax(0,1fr))_40px] gap-1">
          {dates.map((dateItem) => {
            const active = selectedDate === dateItem.dateKey;
            return (
              <Button
                key={dateItem.dateKey}
                type="button"
                variant="white-contained"
                className={cn(
                  'bg-card flex h-12 flex-col rounded-sm px-2 py-1 text-center transition-colors',
                  active
                    ? 'bg-primary-500 text-white'
                    : 'hover:bg-background text-muted-foreground',
                )}
                onClick={() => onDateSelect(dateItem.dateKey)}
              >
                <p
                  className={`text-body-small-medium leading-4 ${active ? 'text-white/90' : 'text-muted-foreground'}`}
                >
                  {dateItem.day}
                </p>
                <p
                  className={`text-body-large-semibold leading-4 ${active ? 'text-white' : 'text-foreground'}`}
                >
                  {dateItem.displayDate}
                </p>
              </Button>
            );
          })}
        </div>
      </div>
    </header>
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

          <Button
            type="button"
            variant="neutral-contained"
            onClick={onRefresh}
            className="flex items-center gap-2 px-4 py-2"
          >
            <RefreshCcw01 size={16} />
            {t('home.retry')}
          </Button>
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
    <div className="flex-1 pb-16">
      {listHeader}

      <div className="border-border border">
        <div className="px-4 py-2">
          {allEvents.map((event) => (
            <NewsCalendarEventItem
              key={event.id}
              event={{
                ...event,
                countryCode: event.countryCode || event.currency?.slice(0, 2),
              }}
            />
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
            onClick={handleLoadMore}
            className="h-10 w-full"
            disabled={isLoadingMore}
          >
            {isLoadingMore
              ? t('home.loading', { defaultValue: 'Loading...' })
              : t('home.loadMore', { defaultValue: 'Load more' })}
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
