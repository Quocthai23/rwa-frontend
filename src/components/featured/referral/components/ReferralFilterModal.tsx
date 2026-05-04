import dayjs from 'dayjs';
import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/shared/atoms/button';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/shared/atoms/sheet';
import CustomDatePicker, {
  type CustomDatePickerHandle,
} from '@/components/featured/transaction-history/components/CustomDatePicker';

interface ReferralFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (fromDate: string, toDate: string, period: string) => void;
  selectedPeriod: string;
  fromDate?: string;
  toDate?: string;
}

export const ReferralFilterModal = ({
  visible,
  onClose,
  onApply,
  selectedPeriod: initialPeriod,
  fromDate: initialFromDate,
  toDate: initialToDate,
}: ReferralFilterModalProps) => {
  const { t } = useTranslation();
  const today = dayjs().format('YYYY-MM-DD');

  const periods = [
    t('common.periods.oneWeek'),
    t('common.periods.oneMonth'),
    t('common.periods.threeMonths'),
    t('common.periods.sixMonths'),
    t('common.periods.oneYear'),
    t('common.periods.custom'),
  ];

  const [tempPeriod, setTempPeriod] = React.useState(initialPeriod);
  const [customFromDate, setCustomFromDate] = React.useState(initialFromDate || today);
  const [customToDate, setCustomToDate] = React.useState(initialToDate || today);
  const [pendingCustomOpen, setPendingCustomOpen] = React.useState<{
    start?: Date;
    end?: Date;
  } | null>(null);

  const customDatePickerRef = useRef<CustomDatePickerHandle>(null);

  React.useEffect(() => {
    if (visible) {
      setTempPeriod(initialPeriod);
      setCustomFromDate(initialFromDate || today);
      setCustomToDate(initialToDate || today);
    }
  }, [visible, initialPeriod, initialFromDate, initialToDate, today]);

  React.useEffect(() => {
    if (!visible && pendingCustomOpen) {
      const timer = window.setTimeout(() => {
        customDatePickerRef.current?.open(pendingCustomOpen.start, pendingCustomOpen.end);
        setPendingCustomOpen(null);
      }, 320);
      return () => window.clearTimeout(timer);
    }
  }, [visible, pendingCustomOpen]);

  const handleApply = () => {
    let fromDate = customFromDate;
    let toDate = customToDate;

    if (tempPeriod !== t('common.periods.custom')) {
      const now = dayjs();
      toDate = now.format('YYYY-MM-DD');

      switch (tempPeriod) {
        case t('common.periods.oneWeek'):
          fromDate = now.subtract(1, 'week').format('YYYY-MM-DD');
          break;
        case t('common.periods.oneMonth'):
          fromDate = now.subtract(1, 'month').format('YYYY-MM-DD');
          break;
        case t('common.periods.threeMonths'):
          fromDate = now.subtract(3, 'month').format('YYYY-MM-DD');
          break;
        case t('common.periods.sixMonths'):
          fromDate = now.subtract(6, 'month').format('YYYY-MM-DD');
          break;
        case t('common.periods.oneYear'):
          fromDate = now.subtract(1, 'year').format('YYYY-MM-DD');
          break;
      }
    }

    onApply(fromDate, toDate, tempPeriod);
  };

  const handleCustomDateApply = (start: Date, end: Date) => {
    const newFrom = dayjs(start).format('YYYY-MM-DD');
    const newTo = dayjs(end).format('YYYY-MM-DD');
    setCustomFromDate(newFrom);
    setCustomToDate(newTo);
    onApply(newFrom, newTo, t('common.periods.custom'));
  };

  return (
    <>
      <Sheet open={visible} onOpenChange={(open) => (!open ? onClose() : undefined)}>
        <SheetContent
          side="bottom"
          className="bg-background dark:bg-card border-border rounded-t p-4 pb-6"
          showCloseButton={false}
        >
          <SheetHeader className="border-border border-b p-4 px-0 text-left">
            <SheetTitle className="text-h3-semibold text-foreground text-lg">
              {t('common.filter')}
            </SheetTitle>
          </SheetHeader>

          <div>
            <p className="text-body-large-semibold text-foreground mb-4">{t('common.period')}</p>
            <div className="flex flex-wrap justify-between gap-y-3">
              {periods.map((period) => {
                const isSelected = tempPeriod === period;
                return (
                  <button
                    key={period}
                    type="button"
                    onClick={() => {
                      setTempPeriod(period);
                      if (period === t('common.periods.custom')) {
                        setPendingCustomOpen({
                          start: customFromDate ? new Date(customFromDate) : undefined,
                          end: customToDate ? new Date(customToDate) : undefined,
                        });
                        onClose();
                      }
                    }}
                    className={`text-body-small-regular h-12 w-[48%] rounded border text-center ${
                      isSelected
                        ? 'border-primary-100 bg-primary-50 text-primary-500 dark:border-primary-500 dark:bg-primary-500 dark:text-white'
                        : 'border-border bg-muted text-muted-foreground dark:bg-neutral-800'
                    }`}
                  >
                    {period}
                  </button>
                );
              })}
            </div>
          </div>

          <SheetFooter className="mt-4 flex-row gap-3 p-0 sm:justify-between">
            <Button variant="neutral-contained" className="h-14 flex-1" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button className="h-14 flex-1" onClick={handleApply}>
              {t('common.apply')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <CustomDatePicker ref={customDatePickerRef} centered onApply={handleCustomDateApply} />
    </>
  );
};
