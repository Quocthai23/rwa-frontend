'use client';

import { useState, useEffect } from 'react';

import { Button } from '@/components/shared/atoms/button';
import { Sheet, SheetContent } from '@/components/shared/atoms/sheet';
import { ACCOUNT_TYPES_ID } from '@/constants/account';
import { cn } from '@/lib/utils';
import type { Account } from '@/types/account';
import { useTranslation } from 'react-i18next';

type Props = {
  onApply?: (filters: FilterState) => void;
  accounts: Account[];
  selectedAccountId: string;
  isOpen: boolean;
  onClose: () => void;
};

type FilterState = {
  type: string[];
  status: string[];
  accountId: string;
};

const transactionTypes: Array<{ id: string | 'all'; translationKey: string }> = [
  { id: 'all', translationKey: 'transactionHistory.all' },
  { id: 'DEPOSIT', translationKey: 'transactionHistory.deposit' },
  { id: 'WITHDRAW', translationKey: 'transactionHistory.withdrawal' },
  { id: 'TRANSFER', translationKey: 'transactionHistory.transfer' },
];

const statuses: Array<{ id: string | 'all'; translationKey: string }> = [
  { id: 'all', translationKey: 'transactionHistory.all' },
  { id: 'PENDING', translationKey: 'transactionHistory.pending' },
  { id: 'COMPLETED', translationKey: 'transactionHistory.completed' },
  { id: 'FAILED', translationKey: 'transactionHistory.failed' },
  { id: 'CANCELLED', translationKey: 'transactionHistory.cancelled' },
];

const FilterTransaction = ({ onApply, accounts, selectedAccountId, isOpen, onClose }: Props) => {
  const { t } = useTranslation();
  const [selectedTypes, setSelectedTypes] = useState<(string | 'all')[]>(['all']);
  const [selectedStatuses, setSelectedStatuses] = useState<(string | 'all')[]>(['all']);
  const [selectedAccount, setSelectedAccount] = useState<string>(selectedAccountId);

  useEffect(() => {
    setSelectedAccount(selectedAccountId);
  }, [selectedAccountId]);

  const handleSelectType = (typeId: string | 'all') => {
    if (typeId === 'all') {
      setSelectedTypes(['all']);
    } else {
      const newTypes = selectedTypes.includes(typeId)
        ? selectedTypes.filter((t) => t !== typeId)
        : [...selectedTypes.filter((t) => t !== 'all'), typeId];
      setSelectedTypes(newTypes.length === 0 ? ['all'] : newTypes);
    }
  };

  const handleSelectStatus = (statusId: string | 'all') => {
    if (statusId === 'all') {
      setSelectedStatuses(['all']);
    } else {
      const newStatuses = selectedStatuses.includes(statusId)
        ? selectedStatuses.filter((s) => s !== statusId)
        : [...selectedStatuses.filter((s) => s !== 'all'), statusId];
      setSelectedStatuses(newStatuses.length === 0 ? ['all'] : newStatuses);
    }
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
    const typeFilter = selectedTypes.includes('all')
      ? []
      : (selectedTypes.filter((t) => t !== 'all') as string[]);
    const statusFilter = selectedStatuses.includes('all')
      ? []
      : (selectedStatuses.filter((s) => s !== 'all') as string[]);

    onApply?.({
      type: typeFilter,
      status: statusFilter,
      accountId: selectedAccount,
    });
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="mx-auto h-[60vh] w-full max-w-3xl p-0"
      >
        <div className="bg-background flex h-full flex-col">
          {/* Header */}
          <div className="border-border border-b px-4 py-3">
            <h3 className="text-foreground text-lg font-semibold">
              {t('transactionHistory.filter')}
            </h3>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {/* Transaction Types */}
            <div className="mb-6">
              <div className="text-foreground mb-3 text-sm font-semibold">
                {t('transactionHistory.transactionTypes')}
              </div>
              <div className="flex flex-row flex-wrap gap-2">
                {transactionTypes.map((type) => {
                  const isSelected = selectedTypes.includes(type.id);
                  return (
                    <Button
                      key={`${type.id}`}
                      variant={isSelected ? 'primary-ghost' : 'neutral-contained'}
                      className={cn(
                         'h-auto rounded px-4 py-2 text-sm transition-colors',
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

            {/* Status */}
            <div className="mb-6">
              <div className="text-foreground mb-3 text-sm font-semibold">
                {t('transactionHistory.status')}
              </div>
              <div className="flex flex-row flex-wrap gap-2">
                {statuses.map((status) => {
                  const isSelected = selectedStatuses.includes(status.id);
                  return (
                    <Button
                      key={`${status.id}`}
                      variant={isSelected ? 'primary-ghost' : 'neutral-contained'}
                      className={cn(
                        'h-auto rounded px-4 py-2 text-sm transition-colors',
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

            {/* Account Selection */}
            <div className="mb-6">
              <div className="text-foreground mb-3 text-sm font-semibold">
                {t('transactionHistory.account')}
              </div>
              <div className="flex flex-row flex-wrap gap-2">
                {accounts
                  .filter((account) => account.accountTypeId !== ACCOUNT_TYPES_ID.DEMO)
                  .map((account) => {
                    const isSelected = selectedAccount === account.id;
                    return (
                      <Button
                        key={account.id}
                        variant={isSelected ? 'primary-ghost' : 'neutral-contained'}
                        className={cn(
                          'h-auto rounded px-4 py-2 text-sm transition-colors',
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

          {/* Footer */}
          <div className="flex flex-row gap-2 px-4 py-4 pb-8">
            <Button variant="neutral-ghost" className="h-12 flex-1 py-2.5" onClick={handleReset}>
              {t('transactionHistory.reset')}
            </Button>
            <Button
              variant="primary-contained"
              className="h-12 flex-1 py-2.5"
              onClick={handleApply}
            >
              {t('transactionHistory.apply')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default FilterTransaction;

