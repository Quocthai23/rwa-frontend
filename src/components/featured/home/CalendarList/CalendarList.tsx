import { ChevronLeft } from '@untitledui/icons';
import { useEffect, useState } from 'react';

import type { CalendarEvent, CalendarEventType } from '@/types/calendar';

import { CalendarDateSelector, CalendarEventItem, CalendarSubTabs } from './components';
import { Button } from '@/components/shared/atoms/button';
import { useCalendarEvents } from '@/hook/useCalendarEvents';
import CalendarModal from './CalendarModal';

function CalendarList({ initialSubTab, initialDate, onBack }: any) {
  const [activeSubTab, setActiveSubTab] = useState<CalendarEventType>(initialSubTab);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [skip, setSkip] = useState(0);
  const take = 20;

  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const {
    data: calendarData,
    error: calendarError,
    isLoading,
    refetch: refetchCalendar,
  } = useCalendarEvents({
    date: selectedDate,
    skip,
    take,
    type: activeSubTab,
  });

  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (!calendarData?.data) return;

    setAllEvents((prev) => {
      const base = skip === 0 ? [] : prev;
      return [...base, ...calendarData.data];
    });

    setIsLoadingMore(false);
    setIsResetting(false);
  }, [calendarData, skip]);

  const hasError = !!calendarError;

  const handleLoadMore = () => {
    if (isLoading || isLoadingMore) return;
    if (!calendarData) return;

    if ((calendarData.data?.length ?? 0) < take) return;

    const currentLoaded = skip + take;

    if (currentLoaded < calendarData.total) {
      setIsLoadingMore(true);
      setSkip((p) => p + take);
    }
  };

  const handleSubTabChange = (newSubTab: CalendarEventType) => {
    setActiveSubTab(newSubTab);
    setSkip(0);
    setAllEvents([]);
    setIsResetting(true);
  };

  const handleDateSelect = (newDate: string) => {
    setSelectedDate(newDate);
    setSkip(0);
    setAllEvents([]);
    setIsResetting(true);
  };

  const onMonthChange = (direction: 'next' | 'prev') => {
    const newMonth = new Date(currentMonth);

    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }

    setCurrentMonth(newMonth);
  };

  const renderEmpty = () => {
    if (isLoading || isResetting) {
      return (
        <div className="p-8 text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border" />
          <p className="text-muted-foreground mt-4">Loading...</p>
        </div>
      );
    }

    if (hasError) {
      return (
        <div className="p-8 text-center">
          <p className="text-muted-foreground mb-4">Failed to load data</p>
          <Button
            variant="red-outline"
            onClick={() => {
              setSkip(0);
              refetchCalendar();
            }}
          />
        </div>
      );
    }

    if (!isLoading && !isLoadingMore && !isResetting && allEvents.length === 0) {
      return <div className="text-muted-foreground p-8 text-center">No data available</div>;
    }

    return null;
  };

  return (
    <div className="bg-background flex h-screen flex-col pb-4">
      <div className="flex-1">
        {/* Header */}
        <div className="relative flex h-[60px] items-center justify-center px-4">
          <button className="absolute left-4" onClick={() => onBack?.()}>
            <ChevronLeft size={24} />
          </button>

          <h3 className="font-semibold">Calendar</h3>
        </div>

        <div className="px-4">
          <CalendarSubTabs activeSubTab={activeSubTab} onSubTabChange={handleSubTabChange} />

          <CalendarDateSelector
            selectedDate={selectedDate}
            onDateSelect={handleDateSelect}
            onShowCalendarModal={() => setShowCalendarModal(true)}
          />
        </div>

        {/* Event list */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {allEvents.length === 0 && renderEmpty()}

          {allEvents.map((event) => (
            <CalendarEventItem key={event.id} event={event} />
          ))}

          {/* Footer */}
          {isLoadingMore && (
            <div className="py-4 text-center">
              <div className="mx-auto h-6 w-6 animate-spin rounded-full border" />
            </div>
          )}

          {calendarData && allEvents.length < calendarData.total && !isLoadingMore && (
            <div className="py-4 text-center">
              <Button content={'Load more'} variant="green-outline" onClick={handleLoadMore} />
            </div>
          )}
        </div>
      </div>

      <CalendarModal
        currentMonth={currentMonth}
        selectedDate={selectedDate}
        visible={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
        onDateSelect={(date) => {
          handleDateSelect(date);
          setShowCalendarModal(false);
        }}
        onMonthChange={onMonthChange}
      />
    </div>
  );
}

export default CalendarList;
