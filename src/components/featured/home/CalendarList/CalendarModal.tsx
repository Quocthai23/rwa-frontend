import { X } from '@untitledui/icons';
import React from 'react';
import { useTranslation } from 'react-i18next';

interface CalendarModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: string;
  onDateSelect: (date: string) => void;
  currentMonth: Date;
  onMonthChange: (direction: 'next' | 'prev') => void;
}

function CalendarModal({
  visible,
  onClose,
  selectedDate,
  onDateSelect,
  currentMonth,
  onMonthChange,
}: CalendarModalProps) {
  const { t, i18n } = useTranslation();
  if (!visible) return null;
  const weekDayLabels = React.useMemo(() => {
    const formatter = new Intl.DateTimeFormat(i18n.language, { weekday: 'short' });
    const sunday = new Date(Date.UTC(2024, 0, 7));
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(sunday);
      date.setUTCDate(sunday.getUTCDate() + index);
      return formatter.format(date);
    });
  }, [i18n.language]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const formatToISODate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  const handleDateSelect = (day: number) => {
    const selectedFullDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);

    onDateSelect(formatToISODate(selectedFullDate));
  };

  const renderCalendar = () => {
    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);

    const days: React.ReactNode[] = [];

    const monthName = currentMonth.toLocaleDateString(i18n.language, {
      month: 'long',
      year: 'numeric',
    });

    for (let index = 0; index < startingDayOfWeek; index++) {
      days.push(<div key={`empty-${index}`} className="w-[14.28%] p-1" />);
    }

    const todayString = formatToISODate(new Date());

    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);

      const dateString = formatToISODate(dayDate);
      const isSelected = dateString === selectedDate;
      const isToday = dateString === todayString;

      days.push(
        <button
          key={day}
          className="relative flex w-[14.28%] flex-col items-center justify-center p-2 transition-colors"
          onClick={() => handleDateSelect(day)}
        >
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full ${
              isSelected ? 'bg-primary-500' : ''
            }`}
          >
            <span
              className={`text-sm ${isSelected ? 'font-medium text-white' : 'text-foreground'}`}
            >
              {day}
            </span>
          </div>
          {isToday && <div className="bg-primary-500 absolute bottom-0 h-[3px] w-5 rounded-full" />}
        </button>,
      );
    }

    return (
      <div>
        {/* Month Header */}
        <div className="mb-4 flex items-center justify-between px-4">
          <button className="p-2" onClick={() => onMonthChange('prev')}>
            â†
          </button>

          <span className="font-semibold">{monthName}</span>

          <button className="p-2" onClick={() => onMonthChange('next')}>
            â†’
          </button>
        </div>

        {/* Day Names */}
        <div className="mb-2 flex">
          {weekDayLabels.map((dayName) => (
            <div key={dayName} className="w-[14.28%] text-center">
              <span className="text-muted-foreground text-xs">{dayName}</span>
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="flex flex-wrap">{days}</div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* modal */}
      <div className="bg-background relative w-11/12 max-w-[400px] rounded-2xl p-4">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <span className="font-semibold">{t('home.selectDate')}</span>

          <button className="p-2" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Calendar */}
        <div className="max-h-[400px] overflow-y-auto">{renderCalendar()}</div>
      </div>
    </div>
  );
}

export default CalendarModal;

