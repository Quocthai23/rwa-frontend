'use client';

import { ChevronLeft, ChevronRight } from '@untitledui/icons';
import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';

import { Button } from '@/components/shared/atoms/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/shared/atoms/dialog';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

type Props = {
  onApply?: (startDate: Date, endDate: Date) => void;
  buttonRef?: React.RefObject<HTMLElement | null>;
  centered?: boolean;
};

export type CustomDatePickerHandle = {
  close: () => void;
  open: (initialStart?: Date, initialEnd?: Date, mode?: 'range' | 'start' | 'end') => void;
};

type AnchorLayout = { y: number; x: number; height: number; width: number };

const GAP = 8;

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sat', 'Su'];
const QUICK_PERIODS = ['Weekly', 'Monthly', 'Annual'];

const CustomDatePicker = forwardRef<CustomDatePickerHandle, Props>(
  ({ onApply, buttonRef, centered = false }, reference) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [anchor, setAnchor] = useState<AnchorLayout | null>(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedStart, setSelectedStart] = useState<Date | null>(null);
    const [selectedEnd, setSelectedEnd] = useState<Date | null>(null);
    const [selectionMode, setSelectionMode] = useState<'range' | 'start' | 'end'>('range');
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

    useImperativeHandle(reference, () => ({
      close: () => setIsOpen(false),
      open: (initialStart?: Date, initialEnd?: Date, mode: 'range' | 'start' | 'end' = 'range') => {
        setSelectionMode(mode);
        setSelectedStart(initialStart || null);
        setSelectedEnd(initialEnd || null);

        const dateForMonth = initialEnd || initialStart || new Date();
        setCurrentMonth(new Date(dateForMonth.getFullYear(), dateForMonth.getMonth(), 1));

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

      setSelectedPeriod(null);

      if (selectionMode === 'start') {
        if (!selectedEnd || date <= selectedEnd) setSelectedStart(date);
        return;
      }

      if (selectionMode === 'end') {
        if (!selectedStart || date >= selectedStart) setSelectedEnd(date);
        return;
      }

      if (!selectedStart || selectedEnd) {
        setSelectedStart(date);
        setSelectedEnd(null);
        return;
      }

      if (date < selectedStart) {
        setSelectedEnd(selectedStart);
        setSelectedStart(date);
      } else {
        setSelectedEnd(date);
      }
    };

    const handleQuickPeriod = (period: string) => {
      setSelectedPeriod(period);
      setSelectionMode('range');

      const today = new Date();
      const start = new Date();
      const end = new Date();

      switch (period) {
        case 'Weekly':
          start.setDate(today.getDate() - 7);
          break;
        case 'Monthly':
          start.setMonth(today.getMonth() - 1);
          break;
        case 'Annual':
          start.setFullYear(today.getFullYear() - 1);
          break;
      }
      setSelectedStart(start);
      setSelectedEnd(end);
      setCurrentMonth(new Date(start.getFullYear(), start.getMonth(), 1));
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

    const monthYear = currentMonth.toLocaleDateString('en-US', {
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
          {QUICK_PERIODS.map((period) => (
            <Button
              key={period}
              variant={selectedPeriod === period ? 'primary-ghost' : 'white-contained'}
              className={cn(
                'flex h-auto flex-1 items-center justify-center rounded py-1.5 transition-colors',
                selectedPeriod !== period && 'hover:bg-muted !bg-transparent',
              )}
              onClick={() => handleQuickPeriod(period)}
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

                    const dateStartOfDay = new Date(
                      date.getFullYear(),
                      date.getMonth(),
                      date.getDate(),
                    ).getTime();
                    const selectedEndStartOfDay = selectedEnd
                      ? new Date(
                          selectedEnd.getFullYear(),
                          selectedEnd.getMonth(),
                          selectedEnd.getDate(),
                        ).getTime()
                      : null;
                    const selectedStartStartOfDay = selectedStart
                      ? new Date(
                          selectedStart.getFullYear(),
                          selectedStart.getMonth(),
                          selectedStart.getDate(),
                        ).getTime()
                      : null;

                    const isAfterSelectedEnd =
                      selectionMode === 'start' &&
                      selectedEndStartOfDay !== null &&
                      dateStartOfDay > selectedEndStartOfDay;
                    const isBeforeSelectedStart =
                      selectionMode === 'end' &&
                      selectedStartStartOfDay !== null &&
                      dateStartOfDay < selectedStartStartOfDay;

                    const isDisabled = isFuture || isAfterSelectedEnd || isBeforeSelectedStart;

                    let roundedClasses = '!rounded-none';
                    if ((isStartDate && isEndDate) || (isSelected && !inRange)) {
                      roundedClasses = '!rounded';
                    } else if (isStartDate || (inRange && dayIndex === 0)) {
                      roundedClasses = '!rounded-none !rounded-l-md';
                    } else if (isEndDate || (inRange && dayIndex === 6)) {
                      roundedClasses = '!rounded-none !rounded-r-md';
                    }

                    return (
                      <Button
                        key={dayIndex}
                        variant="white-contained"
                        disabled={isDisabled}
                        className={cn(
                          'relative flex aspect-square h-auto w-full items-center justify-center p-0 text-sm font-medium transition-colors',
                          roundedClasses,
                          isSelected
                            ? '!bg-primary-500 !text-white'
                            : inRange
                              ? '!text-foreground !bg-primary-100 dark:!bg-neutral-600'
                              : '!bg-transparent',
                          !isSelected && !isCurrentMonth
                            ? '!text-muted-foreground'
                            : !isSelected
                              ? '!text-foreground hover:!bg-primary-300 dark:hover:!bg-neutral-900'
                              : '',
                          isDisabled && 'cursor-not-allowed opacity-30 hover:!bg-transparent',
                        )}
                        onClick={() => !isDisabled && handleDateSelect(date)}
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
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent
            showCloseButton={false}
            className="border-border bg-card z-70 w-full max-w-85 rounded-xl border p-0 shadow-lg sm:max-w-85"
          >
            <DialogTitle className="sr-only">
              {t('common.dateRange', { defaultValue: 'Date Range' })}
            </DialogTitle>
            {calendarContent}
          </DialogContent>
        </Dialog>
      );
    }

    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          showCloseButton={false}
          style={popupPos ? { top: popupPos.top, left: popupPos.left } : undefined}
          className="border-border bg-card top-0 left-0 z-50 w-full max-w-85 translate-x-0 translate-y-0 rounded-xl border p-0 shadow-lg sm:max-w-85"
        >
          <DialogTitle className="sr-only">
            {t('common.dateRange', { defaultValue: 'Date Range' })}
          </DialogTitle>
          {calendarContent}
        </DialogContent>
      </Dialog>
    );
  },
);

CustomDatePicker.displayName = 'CustomDatePicker';

export default CustomDatePicker;
