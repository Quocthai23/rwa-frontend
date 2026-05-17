'use client';

import {
  ArrowCircleRight,
  ArrowRight,
  ArrowCircleBrokenUpRight,
  ArrowCircleBrokenDownLeft,
  SwitchHorizontal01
} from '@untitledui/icons';
import Image from 'next/image';

import { cn } from '@/lib/utils';
import type { PaymentHistoryItem } from '@/types/payment';
import { useTranslation } from 'react-i18next';

type Props = {
  transaction: PaymentHistoryItem;
  onPress?: () => void;
};

const chainIconMap: Record<string, string> = {
  '97': '/assets/images/97.png',
  '11155111': '/assets/images/11155111.png',
};

const TransactionHistoryCard = ({ transaction, onPress }: Props) => {
  const { t } = useTranslation();
  const STATUS_COLOR_MAP: Record<string, { bg: string; text: string }> = {
    COMPLETED: { bg: 'bg-green-50 dark:bg-green-900', text: 'text-green-500 dark:text-green-200' },
    PENDING: { bg: 'bg-green-50 dark:bg-green-900', text: 'text-green-500 dark:text-green-200' },
    FAILED: { bg: 'bg-red-50 dark:bg-red-900', text: 'text-red-500 dark:text-red-200' },
    CANCELLED: { bg: 'bg-red-50 dark:bg-red-900', text: 'text-red-500 dark:text-red-200' },
  };

  const statusColor = STATUS_COLOR_MAP[transaction.status] ?? { bg: 'bg-muted', text: 'text-muted-foreground' };

  const TYPE_DISPLAY: Record<string, string> = {
    DEPOSIT: 'Deposit',
    WITHDRAW: 'Withdrawal',
    TRANSFER: 'Transfer',
    DIVIDEND_CLAIM: 'Dividend',
  };

  const isDeposit = transaction.type === 'DEPOSIT';
  const isTransfer = transaction.type === 'TRANSFER';
  const isWithdrawal = transaction.type === 'WITHDRAW';

  const typeName = isTransfer
    ? t('transactionHistory.transfer')
    : TYPE_DISPLAY[transaction.type] || t('transactionHistory.unknown');

  const STATUS_DISPLAY: Record<string, string> = {
    COMPLETED: 'Completed', PENDING: 'Pending', FAILED: 'Failed', CANCELLED: 'Cancelled',
  };
  const statusName = STATUS_DISPLAY[transaction.status] || t('transactionHistory.unknown');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const time = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return `${day} ${month}, ${time}`;
  };

  const formatAmount = () => {
    const amount = parseFloat(transaction.amount);
    const sign = isDeposit ? '+' : '-';
    return `${sign}${Math.abs(amount).toFixed(2)} ${t('transactionHistory.usd')}`;
  };

  return (
    <button
      type="button"
      onClick={onPress}
      className="border-border bg-background hover:bg-muted mb-3 flex w-full flex-col rounded-lg border px-4 py-3 text-left transition-colors"
    >
      {/* Main Content */}
      <div className="flex w-full flex-row items-start justify-between">
        {/* Left: Type and Status */}
        <div className="flex flex-1 flex-col">
          <div className="mb-2 flex flex-row items-center gap-2">
            {isDeposit ? (
              <ArrowCircleBrokenDownLeft className={cn('size-6', statusColor.text)} />
            ) : isTransfer ? (
              <SwitchHorizontal01 className={cn('size-6', statusColor.text)} />
            ) : isWithdrawal ? (
              <ArrowCircleBrokenUpRight className={cn('size-6', statusColor.text)} />
            ) : (
              <ArrowCircleRight className={cn('size-6', statusColor.text)} />
            )}

            <span className="text-body-large-medium text-foreground">{typeName}</span>

            <div className={cn('border-border rounded border px-2 py-1', statusColor.bg)}>
              <span className={cn('text-caption-medium text-sm', statusColor.text)}>
                {statusName}
              </span>
            </div>
          </div>
          <span className="text-body-small-regular text-muted-foreground">
            {t('transactionHistory.invoiceId')} {transaction.id.slice(-10)}
          </span>
        </div>

        {/* Right: Amount and Date */}
        <div className="flex flex-col items-end">
          <span className="text-body-large-semibold text-foreground mb-1">{formatAmount()}</span>
          <span className="text-body-small-regular text-muted-foreground">
            {formatDate(transaction.createdAt || new Date().toISOString())}
          </span>
        </div>
      </div>

      {/* Withdrawal details */}
      {isWithdrawal && transaction.txHash && (
        <div className="mt-3 w-full border-t border-transparent pt-3">
          <div className="flex flex-row items-center gap-3">
            <div className="flex w-1/3 flex-row items-center gap-2">
              <Image
                src="/assets/images/transaction-history/icon.png"
                alt="Icon"
                width={24}
                height={24}
                className="size-6 shrink-0"
              />
              <span className="text-body-small-regular text-foreground flex-1 truncate">
                {transaction.userId}
              </span>
            </div>

            <ArrowRight className="text-muted-foreground size-4 shrink-0" />

            <div className="flex flex-1 flex-row items-center gap-2 overflow-hidden">
              <Image
                src="/assets/images/97.png"
                alt="Chain"
                width={24}
                height={24}
                className="size-6 shrink-0"
              />
              <span className="text-body-small-regular text-foreground flex-1 truncate">
                {transaction.txHash}
              </span>
            </div>
          </div>
        </div>
      )}
    </button>
  );
};

export default TransactionHistoryCard;
