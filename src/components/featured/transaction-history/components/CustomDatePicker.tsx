'use client';

import { ChevronLeft, ChevronRight } from '@untitledui/icons';
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';

import { Button } from '@/components/shared/atoms/button';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

type Props = {
  onApply?: (startDate: Date, endDate: Date) => void;
  buttonRef?: React.RefObject<HTMLElement | null>;
  centered?: boolean;
};

export type CustomDatePickerHandle = {
  close: () => void;
  open: (initialStart?: Date, initialEnd?: Date) => void;
};

type AnchorLayout = { y: number; x: number; height: number; width: number };

const GAP = 8;

// Keys for quick periods (used for logic routing)
const QUICK_PERIOD_KEYS = ['weekly', 'monthly', 'annual'] as const;

const CustomDatePicker = forwardRef<CustomDatePickerHandle, Props>(
  ({ onApply, buttonRef, centered = false }, reference) => {
    const { t, i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [anchor, setAnchor] = useState<AnchorLayout | null>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedStart, setSelectedStart] = useState<Date | null>(null);
    const [selectedEnd, setSelectedEnd] = useState<Date | null>(null);
    const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);

    useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
      return () => {
        document.body.style.overflow = '';
      };
    }, [isOpen]);

    const DAYS = useMemo(
      () => [
        t('common.days.mo'),
        t('common.days.tu'),
        t('common.days.we'),
        t('common.days.th'),
        t('common.days.fr'),
        t('common.days.sa'),
        t('common.days.su'),
      ],
      [t],
    );

    const QUICK_PERIODS = useMemo(
      () => [
        t('common.dateRanges.weekly'),
        t('common.dateRanges.monthly'),
        t('common.dateRanges.annual'),
      ],
      [t],
    );

    useImperativeHandle(reference, () => ({
      close: () => setIsOpen(false),
      open: (initialStart?: Date, initialEnd?: Date) => {
        if (initialStart) {
          setSelectedStart(initialStart);
          setCurrentMonth(new Date(initialStart.getFullYear(), initialStart.getMonth(), 1));
        } else {
          setSelectedStart(null);
          setCurrentMonth(new Date());
        }
        if (initialEnd) setSelectedEnd(initialEnd);
        else setSelectedEnd(null);

        if (centered) {
          setIsOpen(true);
          return;
        }

        if (buttonRef?.current) {
          const rect = buttonRef.current.getBoundingClientRect();
          setAnchor({
            y: rect.top,
            x: rect.left,
            height: rect.height,
            width: rect.width,
          });
          setIsOpen(true);
        }
      },
    }));

    const getDaysInMonth = (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startingDayOfWeek = (firstDay.getDay() + 6) % 7; // Monday = 0

      const days = [];
      // Previous month days
      const prevMonthDays = new Date(year, month, 0).getDate();
      for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        days.push({
          date: new Date(year, month - 1, prevMonthDays - i),
          isCurrentMonth: false,
        });
      }
      // Current month days
      for (let i = 1; i <= daysInMonth; i++) {
        days.push({
          date: new Date(year, month, i),
          isCurrentMonth: true,
        });
      }

      // Next month days to fill the grid
      const remainingDays = 42 - days.length;
      for (let i = 1; i <= remainingDays; i++) {
        days.push({
          date: new Date(year, month + 1, i),
          isCurrentMonth: false,
        });
      }

      return days;
    };

    const handleDateSelect = (date: Date) => {
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      if (date > endOfToday) return;

      if (!selectedStart || (selectedStart && selectedEnd)) {
        setSelectedStart(date);
        setSelectedEnd(null);
      } else {
        if (date < selectedStart) {
          setSelectedEnd(selectedStart);
          setSelectedStart(date);
        } else {
          setSelectedEnd(date);
        }
      }
      setSelectedPeriod(null);
    };

    const handleQuickPeriod = (periodIndex: number) => {
      const period = QUICK_PERIODS[periodIndex];
      setSelectedPeriod(period);

      const today = new Date();
      const start = new Date();
      const end = new Date();

      const key = QUICK_PERIOD_KEYS[periodIndex];
      switch (key) {
        case 'weekly':
          start.setDate(today.getDate() - 7);
          break;
        case 'monthly':
          start.setMonth(today.getMonth() - 1);
          break;
        case 'annual':
          start.setFullYear(today.getFullYear() - 1);
          break;
      }
      setSelectedStart(start);
      setSelectedEnd(end);
    };

    const isDateInRange = (date: Date) => {
      if (!selectedStart || !selectedEnd) return false;
      const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
      const s = new Date(
        selectedStart.getFullYear(),
        selectedStart.getMonth(),
        selectedStart.getDate(),
      ).getTime();
      const e = new Date(
        selectedEnd.getFullYear(),
        selectedEnd.getMonth(),
        selectedEnd.getDate(),
      ).getTime();
      return d >= Math.min(s, e) && d <= Math.max(s, e);
    };

    const isDateSelected = (date: Date) => {
      if (!selectedStart) return false;
      if (selectedStart && !selectedEnd) {
        return date.toDateString() === selectedStart.toDateString();
      }
      return (
        date.toDateString() === selectedStart.toDateString() ||
        date.toDateString() === selectedEnd?.toDateString()
      );
    };

    const handleReset = () => {
      setSelectedStart(null);
      setSelectedEnd(null);
      setSelectedPeriod(null);
      setIsOpen(false);
    };

    const handleApply = () => {
      if (selectedStart && selectedEnd) {
        onApply?.(selectedStart, selectedEnd);
        setIsOpen(false);
      } else if (selectedStart && !selectedEnd) {
        onApply?.(selectedStart, selectedStart);
        setIsOpen(false);
      }
    };

    const locale = i18n.resolvedLanguage || i18n.language || 'en-US';
    const monthYear = currentMonth.toLocaleDateString(locale, {
      month: 'long',
      year: 'numeric',
    });

    const days = getDaysInMonth(currentMonth);

    const popupPos = useMemo(() => {
      if (!anchor) return null;
      return { top: anchor.y + anchor.height + GAP, left: anchor.x };
    }, [anchor]);

    if (!isOpen) return null;

    const todayStr = new Date().toDateString();
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const calendarContent = (
      <div className="max-h-[600px] overflow-y-auto px-4 py-4">
        {/* Header */}
        <div className="mb-4 flex flex-row items-center justify-between">
          <Button
            variant="white-outline"
            className="h-8 w-8 p-0"
            onClick={() =>
              setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
            }
          >
            <ChevronLeft className="text-muted-foreground h-4 w-4" />
          </Button>

          <span className="text-body-large-medium font-medium">{monthYear}</span>

          <Button
            variant="white-outline"
            className="h-8 w-8 p-0"
            onClick={() =>
              setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
            }
          >
            <ChevronRight className="text-muted-foreground h-4 w-4" />
          </Button>
        </div>

        {/* Quick Period Links */}
        <div className="mb-4 flex flex-row items-center gap-2">
          {QUICK_PERIODS.map((period, index) => (
            <Button
              key={period}
              variant={selectedPeriod === period ? 'primary-ghost' : 'white-contained'}
              className={cn(
                'flex h-auto flex-1 items-center justify-center rounded py-1.5 transition-colors',
                selectedPeriod !== period && 'hover:bg-muted !bg-transparent',
              )}
              onClick={() => handleQuickPeriod(index)}
            >
              <span className="!text-primary-500 text-sm font-semibold">{period}</span>
            </Button>
          ))}
        </div>

        {/* Calendar Grid */}
        <div>
          {/* Day Headers */}
          <div className="mb-2 grid grid-cols-7">
            {DAYS.map((day) => (
              <div key={day} className="flex items-center justify-center py-2">
                <span className="text-muted-foreground text-xs font-medium">{day}</span>
              </div>
            ))}
          </div>

          {/* Date Grid */}
          <div className="flex flex-col gap-1">
            {Array.from({ length: 6 }).map((_, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7">
                {days
                  .slice(weekIndex * 7, (weekIndex + 1) * 7)
                  .map(({ date, isCurrentMonth }, dayIndex) => {
                    const inRange = isDateInRange(date);
                    const isSelected = isDateSelected(date);
                    const isStartDate =
                      selectedStart && date.toDateString() === selectedStart.toDateString();
                    const isEndDate =
                      selectedEnd && date.toDateString() === selectedEnd.toDateString();
                    const isToday = date.toDateString() === todayStr;
                    const isFuture = date > endOfToday;

                    let roundedClass = '';
                    if ((isStartDate && isEndDate) || (isSelected && !inRange))
                      roundedClass = 'rounded';
                    else if (isStartDate) roundedClass = 'rounded-l-md';
                    else if (isEndDate) roundedClass = 'rounded-r-md';
                    else if (inRange) {
                      if (dayIndex === 0) roundedClass = 'rounded-l-md';
                      if (dayIndex === 6) roundedClass = 'rounded-r-md';
                    }

                    const roundedMap: Record<string, string> = {
                      rounded: '!rounded',
                      'rounded-l-md': '!rounded-none !rounded-l-md',
                      'rounded-r-md': '!rounded-none !rounded-r-md',
                      '': '!rounded-none',
                    };

                    return (
                      <Button
                        key={dayIndex}
                        variant="white-contained"
                        disabled={isFuture}
                        className={cn(
                          'relative flex aspect-square h-auto w-full items-center justify-center p-0 text-sm font-medium transition-colors',
                          roundedMap[roundedClass] || '!rounded-none',
                          isSelected
                            ? 'bg-primary-500! text-white'
                            : inRange
                              ? 'bg-primary-500/12 dark:bg-primary-500/28 text-foreground'
                              : 'bg-transparent!',
                          !isSelected && !isCurrentMonth
                            ? '!text-muted-foreground!'
                            : !isSelected
                              ? 'text-foreground! hover:bg-muted!'
                              : '',
                          isFuture && 'cursor-not-allowed opacity-30 hover:bg-transparent!',
                        )}
                        onClick={() => !isFuture && handleDateSelect(date)}
                      >
                        {date.getDate()}
                        {isToday && (
                          <span
                            className={cn(
                              'absolute bottom-1.5 left-1/2 mt-5 h-0.5 w-4 -translate-x-1/2 rounded-full',
                              isSelected ? 'bg-white' : 'bg-primary-500',
                            )}
                          />
                        )}
                      </Button>
                    );
                  })}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-border mt-4 flex flex-row gap-2 border-t pt-4">
          <Button variant="neutral-outline" className="h-12 flex-1" onClick={handleReset}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary-contained" className="h-12 flex-1" onClick={handleApply}>
            {t('transactionHistory.continue')}
          </Button>
        </div>
      </div>
    );

    if (centered) {
      return (
        <div className="fixed inset-0 z-70 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsOpen(false)} />
          <div
            className="border-border bg-card z-10 w-full max-w-[340px] rounded-xl border p-0 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {calendarContent}
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-50 flex">
        {/* Backdrop overlay */}
        <div className="absolute inset-0 bg-transparent" onClick={() => setIsOpen(false)} />

        {/* Popover content */}
        <div
          style={
            !centered && popupPos
              ? { position: 'absolute', top: popupPos.top, left: popupPos.left }
              : { position: 'relative' }
          }
          className="border-border bg-card z-10 w-full max-w-[340px] rounded-xl border shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          {calendarContent}
        </div>
      </div>
    );
  },
);

CustomDatePicker.displayName = 'CustomDatePicker';

export default CustomDatePicker;
