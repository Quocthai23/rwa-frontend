'use client';
/* eslint-disable react-hooks/set-state-in-effect */

import { Calendar, Check, ChevronRight } from '@untitledui/icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/shared/atoms/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shared/atoms/dropdown-menu';
import { cn } from '@/lib/utils';
import { toStartOfDayISO, toEndOfDayISO } from '@/utils/dateUtils';
import { useTranslation } from 'react-i18next';

import CustomDatePicker, { type CustomDatePickerHandle } from './CustomDatePicker';

type Props = {
  onSelect?: (dates: { startDate: string; endDate: string }) => void;
  selectedValue?: string;
};

const dateRangeOptions = [
  { value: 'last_3_days' },
  { value: 'last_7_days' },
  { value: 'last_30_days' },
  { value: 'last_3_months' },
  { value: 'custom', hasChevron: true },
] as const;

const DateRangePicker = ({ onSelect, selectedValue = 'last_7_days' }: Props) => {
  const { t, i18n } = useTranslation();
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const customDatePickerRef = useRef<CustomDatePickerHandle>(null);

  const [selected, setSelected] = useState(selectedValue);
  const [isOpen, setIsOpen] = useState(false);
  const [pendingCustomOpen, setPendingCustomOpen] = useState<{
    start: Date;
    end: Date;
  } | null>(null);
  const [customDateRange, setCustomDateRange] = useState<{
    start: Date;
    end: Date;
  } | null>(null);

  useEffect(() => {
    if (!isOpen && pendingCustomOpen) {
      customDatePickerRef.current?.open(pendingCustomOpen.start, pendingCustomOpen.end);
      setPendingCustomOpen(null);
    }
  }, [isOpen, pendingCustomOpen]);

  const selectedLabel = useMemo(() => {
    const locale = i18n.resolvedLanguage || i18n.language || 'en-US';
    if (selected === 'custom' && customDateRange) {
      const startStr = customDateRange.start.toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
      });
      const endStr = customDateRange.end.toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
      });
      return `${startStr} - ${endStr}`;
    }
    if (selected === 'last_3_days') return t('transactionHistory.last3Days');
    if (selected === 'last_30_days') return t('transactionHistory.last30Days');
    if (selected === 'last_3_months') return t('transactionHistory.last3Months');
    if (selected === 'custom') return t('transactionHistory.customDate');
    return t('transactionHistory.last7Days');
  }, [selected, customDateRange, t, i18n.language, i18n.resolvedLanguage]);

  const getCurrentDates = () => {
    if (selected === 'custom' && customDateRange) {
      return { start: customDateRange.start, end: customDateRange.end };
    }
    const today = new Date();
    const start = new Date();
    switch (selected) {
      case 'last_3_days':
        start.setDate(today.getDate() - 3);
        break;
      case 'last_7_days':
        start.setDate(today.getDate() - 7);
        break;
      case 'last_30_days':
        start.setDate(today.getDate() - 30);
        break;
      case 'last_3_months':
        start.setMonth(today.getMonth() - 3);
        break;
      default:
        start.setDate(today.getDate() - 7);
        break;
    }
    return { start, end: today };
  };

  const handleSelect = (value: string) => {
    if (value === 'custom') {
      const { start, end } = getCurrentDates();
      setPendingCustomOpen({ start, end });
      setIsOpen(false);
    } else {
      setIsOpen(false);
      setSelected(value);
      setCustomDateRange(null);

      // Calculate date range based on selection
      const today = new Date();
      const startDate = new Date();

      switch (value) {
        case 'last_3_days':
          startDate.setDate(today.getDate() - 3);
          break;
        case 'last_7_days':
          startDate.setDate(today.getDate() - 7);
          break;
        case 'last_30_days':
          startDate.setDate(today.getDate() - 30);
          break;
        case 'last_3_months':
          startDate.setMonth(today.getMonth() - 3);
          break;
      }

      onSelect?.({
        startDate: toStartOfDayISO(startDate),
        endDate: toEndOfDayISO(today),
      });
    }
  };

  const handleCustomDateApply = (start: Date, end: Date) => {
    setCustomDateRange({ start, end });
    setSelected('custom');
    onSelect?.({
      startDate: toStartOfDayISO(start),
      endDate: toEndOfDayISO(end),
    });
  };

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            ref={btnRef}
            variant={selected === 'custom' ? 'primary-ghost' : 'neutral-contained'}
            className="h-9 w-fit min-w-[132px] justify-center px-3"
          >
            <Calendar className="size-4" />
            <span>{selectedLabel}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={8}
          className="border-border bg-background w-screen max-w-92 rounded border p-2 shadow-lg"
        >
          {dateRangeOptions.map((option) => {
            const isSelected = selected === option.value;
            return (
              <DropdownMenuItem
                variant="default"
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={cn(
                  'text-body-large-regular flex w-full cursor-pointer items-center justify-between rounded px-3 py-3 outline-none',
                  'focus:bg-muted data-[highlighted]:bg-muted',
                  isSelected && 'data-[highlighted]:bg-primary-50',
                )}
              >
                <span className={cn('text-foreground', isSelected && 'text-primary-500')}>
                  {option.value === 'last_3_days'
                    ? t('transactionHistory.last3Days')
                    : option.value === 'last_7_days'
                      ? t('transactionHistory.last7Days')
                      : option.value === 'last_30_days'
                        ? t('transactionHistory.last30Days')
                        : option.value === 'last_3_months'
                          ? t('transactionHistory.last3Months')
                          : t('transactionHistory.customDate')}
                </span>
                {isSelected ? (
                  <Check className="text-primary-500 size-4" />
                ) : 'hasChevron' in option && option.hasChevron ? (
                  <ChevronRight className="text-foreground size-4" />
                ) : null}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <CustomDatePicker
        ref={customDatePickerRef}
        buttonRef={btnRef}
        onApply={handleCustomDateApply}
      />
    </>
  );
};

export default DateRangePicker;

