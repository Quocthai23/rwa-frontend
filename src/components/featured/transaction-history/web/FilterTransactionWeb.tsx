'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/shared/atoms/button';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/shared/atoms/web/sheet';
import { ACCOUNT_TYPES_ID } from '@/constants/account';
import { STATUS_HISTORY_ID, TYPE_HISTORY_ID } from '@/constants/payment';
import { cn } from '@/lib/utils';
import type { Account } from '@/types/account';

type FilterState = {
  type: number[];
  status: number[];
  accountId: string;
};

type Props = {
  onApply?: (filters: FilterState) => void;
  accounts: Account[];
  selectedAccountId: string;
  isOpen: boolean;
  onClose: () => void;
};

const transactionTypes: Array<{ id: number | 'all'; translationKey: string }> = [
  { id: 'all', translationKey: 'transactionHistory.all' },
  { id: TYPE_HISTORY_ID.DEPOSIT, translationKey: 'transactionHistory.deposit' },
  { id: TYPE_HISTORY_ID.WITHDRAWAL, translationKey: 'transactionHistory.withdrawal' },
  { id: 2, translationKey: 'transactionHistory.transfer' },
];

const statuses: Array<{ id: number | 'all'; translationKey: string }> = [
  { id: 'all', translationKey: 'transactionHistory.all' },
  { id: STATUS_HISTORY_ID.PENDING, translationKey: 'transactionHistory.pending' },
  { id: STATUS_HISTORY_ID.APPROVED, translationKey: 'transactionHistory.approved' },
  { id: STATUS_HISTORY_ID.PROCESSING, translationKey: 'transactionHistory.processing' },
  { id: STATUS_HISTORY_ID.COMPLETED, translationKey: 'transactionHistory.completed' },
  { id: STATUS_HISTORY_ID.FAILED, translationKey: 'transactionHistory.failed' },
  { id: STATUS_HISTORY_ID.REJECTED, translationKey: 'transactionHistory.rejected' },
  { id: STATUS_HISTORY_ID.CANCELLED, translationKey: 'transactionHistory.cancelled' },
];

export default function FilterTransactionWeb({
  onApply,
  accounts,
  selectedAccountId,
  isOpen,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const [selectedTypes, setSelectedTypes] = useState<(number | 'all')[]>(['all']);
  const [selectedStatuses, setSelectedStatuses] = useState<(number | 'all')[]>(['all']);
  const [selectedAccount, setSelectedAccount] = useState<string>(selectedAccountId);

  useEffect(() => {
    setSelectedAccount(selectedAccountId);
  }, [selectedAccountId]);

  const handleSelectType = (typeId: number | 'all') => {
    if (typeId === 'all') {
      setSelectedTypes(['all']);
      return;
    }
    const next = selectedTypes.includes(typeId)
      ? selectedTypes.filter((t) => t !== typeId)
      : [...selectedTypes.filter((t) => t !== 'all'), typeId];
    setSelectedTypes(next.length === 0 ? ['all'] : next);
  };

  const handleSelectStatus = (statusId: number | 'all') => {
    if (statusId === 'all') {
      setSelectedStatuses(['all']);
      return;
    }
    const next = selectedStatuses.includes(statusId)
      ? selectedStatuses.filter((s) => s !== statusId)
      : [...selectedStatuses.filter((s) => s !== 'all'), statusId];
    setSelectedStatuses(next.length === 0 ? ['all'] : next);
  };

  const handleReset = () => {
    setSelectedTypes(['all']);
    setSelectedStatuses(['all']);
    setSelectedAccount(selectedAccountId);
    onApply?.({
      type: [],
      status: [],
      accountId: selectedAccountId,
    });
    onClose();
  };

  const handleApply = () => {
    onApply?.({
      type: selectedTypes.includes('all') ? [] : (selectedTypes as number[]),
      status: selectedStatuses.includes('all') ? [] : (selectedStatuses as number[]),
      accountId: selectedAccount,
    });
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="center"
        showCloseButton={false}
        className="bg-background border-border scrollbar-neutral-slim mx-auto flex h-[76dvh] w-full max-w-[760px] flex-col border p-0"
      >
        <SheetHeader className="border-border border-b px-4 py-3">
          <SheetTitle>{t('transactionHistory.filter')}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="mb-6">
            <div className="text-foreground mb-3 text-sm font-semibold">
              {t('transactionHistory.transactionTypes')}
            </div>
            <div className="flex flex-wrap gap-2">
              {transactionTypes.map((type) => {
                const isSelected = selectedTypes.includes(type.id);
                return (
                  <Button
                    key={`${type.id}`}
                    variant={isSelected ? 'primary-ghost' : 'neutral-contained'}
                    className={cn(
                      'h-auto rounded px-4 py-2 text-sm',
                      isSelected ? 'font-medium' : '!text-muted-foreground font-normal',
                    )}
                    onClick={() => handleSelectType(type.id)}
                  >
                    {t(type.translationKey)}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="mb-6">
            <div className="text-foreground mb-3 text-sm font-semibold">
              {t('transactionHistory.status')}
            </div>
            <div className="flex flex-wrap gap-2">
              {statuses.map((status) => {
                const isSelected = selectedStatuses.includes(status.id);
                return (
                  <Button
                    key={`${status.id}`}
                    variant={isSelected ? 'primary-ghost' : 'neutral-contained'}
                    className={cn(
                      'h-auto rounded px-4 py-2 text-sm',
                      isSelected ? 'font-medium' : '!text-muted-foreground font-normal',
                    )}
                    onClick={() => handleSelectStatus(status.id)}
                  >
                    {t(status.translationKey)}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="mb-2">
            <div className="text-foreground mb-3 text-sm font-semibold">
              {t('transactionHistory.account')}
            </div>
            <div className="flex flex-wrap gap-2">
              {accounts
                .filter((account) => account.accountTypeId !== ACCOUNT_TYPES_ID.DEMO)
                .map((account) => {
                  const isSelected = selectedAccount === account.id;
                  return (
                    <Button
                      key={account.id}
                      variant={isSelected ? 'primary-ghost' : 'neutral-contained'}
                      className={cn(
                        'h-auto rounded px-4 py-2 text-sm',
                        isSelected ? 'font-medium' : '!text-muted-foreground font-normal',
                      )}
                      onClick={() => setSelectedAccount(account.id)}
                    >
                      {account.name}
                    </Button>
                  );
                })}
            </div>
          </div>
        </div>

        <SheetFooter className="flex-row gap-2 px-4 py-4">
          <Button variant="neutral-ghost" className="h-12 flex-1" onClick={handleReset}>
            {t('transactionHistory.reset')}
          </Button>
          <Button variant="primary-contained" className="h-12 flex-1" onClick={handleApply}>
            {t('transactionHistory.apply')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
