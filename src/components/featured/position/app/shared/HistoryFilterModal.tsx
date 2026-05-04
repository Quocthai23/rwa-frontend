import { useState, useRef } from 'react';

import type {
  HistoryFilter,
  HistoryFilterDirection,
  HistoryFilterPeriod,
} from '@/store/positionSortStore';
import { Sheet, SheetContent } from '@/components/shared/atoms/sheet';
import { toISODateString } from '@/utils/dateUtils';
import { useTranslation } from 'react-i18next';
import CustomDatePicker, {
  type CustomDatePickerHandle,
} from '@/components/featured/position/app/shared/CustomDateFilter';

function parseYyyyMmDd(value: string): Date | undefined {
  const [year, month, day] = value.split('-').map((part) => Number(part));
  if (!year || !month || !day) return undefined;

  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

type HistoryFilterModalProps = {
  readonly historyFilter: HistoryFilter;
  readonly onClose: () => void;
  readonly onApply: (filter: HistoryFilter) => void;
};

const periodOptions: HistoryFilterPeriod[] = [
  '1 week',
  '1 month',
  '3 months',
  '6 months',
  '1 year',
  'Custom',
];

const directionOptions: HistoryFilterDirection[] = ['All', 'Buy', 'Sell'];
type CustomPickerMode = 'range' | 'start' | 'end';

const getDefaultStartDate = (): string => {
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  return toISODateString(fiveYearsAgo);
};

export function HistoryFilterModal({ historyFilter, onClose, onApply }: HistoryFilterModalProps) {
  const { t } = useTranslation();
  const [selectedPeriod, setSelectedPeriod] = useState<HistoryFilterPeriod>(historyFilter.period);
  const [selectedDirection, setSelectedDirection] = useState<HistoryFilterDirection>(
    historyFilter.direction,
  );
  const [customStartDate, setCustomStartDate] = useState(
    historyFilter.customStartDate || getDefaultStartDate(),
  );
  const [customEndDate, setCustomEndDate] = useState(historyFilter.customEndDate);
  const [customPickerMode, setCustomPickerMode] = useState<CustomPickerMode>('range');

  const customDatePickerRef = useRef<CustomDatePickerHandle>(null);

  const handleCustomDateApply = (start: Date, end: Date) => {
    const startIso = toISODateString(start);
    const endIso = toISODateString(end);
    const isRange = startIso !== endIso;

    if (isRange) {
      setCustomStartDate(startIso);
      setCustomEndDate(endIso);
      return;
    }

    if (customPickerMode === 'start') {
      setCustomStartDate(startIso);
      return;
    }
    if (customPickerMode === 'end') {
      setCustomEndDate(endIso);
      return;
    }
    setCustomStartDate(startIso);
    setCustomEndDate(endIso);
  };

  return (
    <>
      <Sheet
        open
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <SheetContent
          side="bottom"
          showCloseButton={false}
          title={t('position.filter.title')}
          className="bg-background text-foreground mx-auto w-full max-w-192 rounded-t-lg p-0"
        >
          <div className="border-border border-b p-4">
            <h3 className="text-h3-semibold text-foreground">{t('position.filter.title')}</h3>
          </div>

          <div className="max-h-[min(500px,60dvh)] overflow-y-auto">
            <div className="px-4 py-4">
              <p className="text-body-large-medium text-foreground pb-4">
                {t('position.filter.period')}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {periodOptions.map((option) => (
                  <button
                    type="button"
                    key={option}
                    className={`rounded border px-4 py-2 ${
                      selectedPeriod === option
                        ? 'bg-primary-50 border-primary-500'
                        : 'border-border bg-muted'
                    }`}
                    onClick={() => {
                      setSelectedPeriod(option);
                      if (option === 'Custom') {
                        setCustomPickerMode('range');
                      }
                    }}
                  >
                    <span
                      className={`text-body-small-medium block text-center ${
                        selectedPeriod === option ? 'text-primary-500' : 'text-muted-foreground'
                      }`}
                    >
                      {option === '1 week'
                        ? t('position.periods.oneWeek')
                        : option === '1 month'
                          ? t('position.periods.oneMonth')
                          : option === '3 months'
                            ? t('position.periods.threeMonths')
                            : option === '6 months'
                              ? t('position.periods.sixMonths')
                              : option === '1 year'
                                ? t('position.periods.oneYear')
                                : t('position.periods.custom')}
                    </span>
                  </button>
                ))}
              </div>

              {selectedPeriod === 'Custom' && (
                <div className="mt-3 flex flex-row items-center gap-2">
                  <button
                    type="button"
                    className="bg-muted flex-1 rounded px-3 py-2.5"
                    onClick={() => {
                      setCustomPickerMode('start');
                      customDatePickerRef.current?.open(
                        parseYyyyMmDd(customStartDate),
                        parseYyyyMmDd(customEndDate),
                        'start',
                      );
                    }}
                  >
                    <p className="text-body-small-medium text-muted-foreground text-center">
                      {customStartDate}
                    </p>
                  </button>
                  <div className="px-2">
                    <div className="h-0.5 w-3 bg-neutral-500" />
                  </div>
                  <button
                    type="button"
                    className="bg-muted flex-1 rounded px-3 py-2.5"
                    onClick={() => {
                      setCustomPickerMode('end');
                      customDatePickerRef.current?.open(
                        parseYyyyMmDd(customStartDate),
                        parseYyyyMmDd(customEndDate),
                        'end',
                      );
                    }}
                  >
                    <p className="text-body-small-medium text-muted-foreground text-center">
                      {customEndDate}
                    </p>
                  </button>
                </div>
              )}
            </div>

            <div className="px-4 py-4">
              <p className="text-body-large-medium text-foreground mb-3">
                {t('position.filter.direction')}
              </p>
              <div className="flex flex-row flex-wrap gap-2">
                {directionOptions.map((option) => (
                  <button
                    type="button"
                    key={option}
                    className={`flex-1 rounded border px-4 py-2 ${
                      selectedDirection === option
                        ? 'bg-primary-50 border-primary-500'
                        : 'border-border bg-muted'
                    }`}
                    onClick={() => {
                      setSelectedDirection(option);
                    }}
                  >
                    <span
                      className={`text-body-small-medium ${
                        selectedDirection === option ? 'text-primary-500' : 'text-foreground'
                      }`}
                    >
                      {option === 'All'
                        ? t('position.filter.all')
                        : option === 'Buy'
                          ? t('position.filter.buy')
                          : t('position.filter.sell')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="border-border flex flex-row gap-3 border-t px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            <button type="button" className="bg-muted flex-1 rounded py-3" onClick={onClose}>
              <span className="text-button-large-medium text-foreground block text-center">
                {t('position.modal.cancel')}
              </span>
            </button>
            <button
              type="button"
              className="bg-primary-500 flex-1 rounded py-3"
              onClick={() => {
                onApply({
                  period: selectedPeriod,
                  direction: selectedDirection,
                  customStartDate,
                  customEndDate,
                });
                onClose();
              }}
            >
              <span className="text-button-large-medium block text-center text-white">
                {t('position.filter.apply')}
              </span>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <CustomDatePicker ref={customDatePickerRef} centered onApply={handleCustomDateApply} />
    </>
  );
}
