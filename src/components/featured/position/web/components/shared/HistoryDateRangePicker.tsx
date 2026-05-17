'use client';

import { useMemo, useRef } from 'react';

import CustomDatePicker, {
  type CustomDatePickerHandle,
} from '@/components/featured/transaction-history/components/CustomDatePicker';
import { toISODateString } from '@/utils/dateUtils';
import { Calendar } from '@untitledui/icons';

export type HistoryRangeValue = {
  fromDate: string;
  toDate: string;
};

type HistoryDateRangePickerProps = {
  onRangeChange: (value: HistoryRangeValue) => void;
  value?: HistoryRangeValue;
};

export function getDefaultHistoryRange() {
  const end = new Date();
  const start = new Date(end);
  start.setMonth(end.getMonth() - 1);

  return { start, end };
}

const formatDisplayDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

function parseIsoDate(value?: string) {
  if (!value) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return undefined;

  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function HistoryDateRangePicker({ onRangeChange, value }: HistoryDateRangePickerProps) {
  const defaultRange = useMemo(() => getDefaultHistoryRange(), []);
  const pickerRef = useRef<CustomDatePickerHandle>(null);

  const selectedStart = parseIsoDate(value?.fromDate) ?? defaultRange.start;
  const selectedEnd = parseIsoDate(value?.toDate) ?? defaultRange.end;

  const displayFrom = selectedStart;
  const displayTo = selectedEnd;

  const displayLabel = `${formatDisplayDate(displayFrom)} - ${formatDisplayDate(displayTo)}`;

  const handleApply = (startDate: Date, endDate: Date) => {
    onRangeChange({
      fromDate: toISODateString(startDate),
      toDate: toISODateString(endDate),
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => pickerRef.current?.open(selectedStart, selectedEnd)}
        className="dark:bg-card text-foreground flex items-center gap-3 rounded-sm bg-neutral-100 px-4 py-2 transition-colors hover:bg-neutral-200 dark:text-white dark:hover:bg-neutral-600"
      >
        <Calendar className="text-muted-foreground size-5" />
        <span className="text-body-small-medium leading-none">{displayLabel}</span>
      </button>

      <CustomDatePicker ref={pickerRef} centered onApply={handleApply} />
    </>
  );
}

export default HistoryDateRangePicker;
