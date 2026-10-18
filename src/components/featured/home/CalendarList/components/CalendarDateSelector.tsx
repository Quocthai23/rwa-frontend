'use client';

import { Calendar } from '@untitledui/icons';
import { useMemo } from 'react';

import { useTheme } from '@/theme';
import { formatToMMDD, toISODateString } from '@/utils/dateUtils';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

interface CalendarDateSelectorProps {
  displayDays?: number;
  selectedDate: string;
  anchorDate?: string;
  onDateSelect: (dateKey: string) => void;
  onShowCalendarModal?: () => void;
}

export const CalendarDateSelector = ({
  displayDays = 5,
  selectedDate,
  anchorDate,
  onDateSelect,
  onShowCalendarModal,
}: CalendarDateSelectorProps) => {
  const { colors } = useTheme();

  const dates = useMemo(() => {
    const centerDate = new Date(anchorDate || selectedDate);

    return getCenteredDates(centerDate, displayDays);
  }, [anchorDate, selectedDate, displayDays]);

  return (
    <div className="bg-card mb-4 flex flex-row items-center rounded">
      <div className="flex-1 overflow-x-auto" style={{ display: 'flex', gap: 0 }}>
        {dates.map((dateItem) => (
          <button
            key={dateItem.dateKey}
            className="flex flex-shrink-0 flex-col items-center justify-center rounded p-2"
            style={{
              width: `${100 / displayDays}%`,
              backgroundColor:
                selectedDate === dateItem.dateKey ? colors.primary500 : 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
            onClick={() => {
              onDateSelect(dateItem.dateKey);
            }}
          >
            <p
              className={`text-body-small-regular ${
                selectedDate === dateItem.dateKey ? 'text-white' : 'text-muted-foreground'
              }`}
              style={{ margin: 0 }}
            >
              {dateItem.day}
            </p>
            <p
              className={`text-body-small-regular ${
                selectedDate === dateItem.dateKey ? 'text-white' : 'text-foreground'
              }`}
              style={{ margin: 0 }}
            >
              {dateItem.displayDate}
            </p>
          </button>
        ))}
      </div>
      {onShowCalendarModal && (
        <button
          className="flex-shrink-0 cursor-pointer border-none bg-none p-2"
          onClick={onShowCalendarModal}
        >
          <Calendar className="text-foreground" size={24} />
        </button>
      )}
    </div>
  );
};

