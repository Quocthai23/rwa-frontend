'use client';

import {
  ArrowCircleRight,
  ArrowRight,
  ArrowCircleBrokenUpRight,
  ArrowCircleBrokenDownLeft,
  SwitchHorizontal01
} from '@untitledui/icons';
import Image from 'next/image';

import {
  STATUS_HISTORY_ID,
  STATUS_HISTORY_NAME,
  TYPE_HISTORY_ID,
  TYPE_HISTORY_NAME,
} from '@/constants/payment';
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
  const getStatusColor = () => {
    switch (transaction.status) {
      case STATUS_HISTORY_ID.COMPLETED: // Completed
        return { bg: 'bg-green-50 dark:bg-green-900', text: 'text-green-500 dark:text-green-200' };
      case STATUS_HISTORY_ID.PENDING: // Pending
        return { bg: 'bg-green-50 dark:bg-green-900', text: 'text-green-500 dark:text-green-200' };
      case STATUS_HISTORY_ID.APPROVED: // Approved
        return { bg: 'bg-green-50 dark:bg-green-900', text: 'text-green-500 dark:text-green-200' };
      case STATUS_HISTORY_ID.PROCESSING: // Processing
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-900',
          text: 'text-yellow-500 dark:text-yellow-200',
        };
      case STATUS_HISTORY_ID.FAILED: // Failed
        return { bg: 'bg-red-50 dark:bg-red-900', text: 'text-red-500 dark:text-red-200' };
      case STATUS_HISTORY_ID.REJECTED: // Rejected
        return { bg: 'bg-red-50 dark:bg-red-900', text: 'text-red-500 dark:text-red-200' };
      case STATUS_HISTORY_ID.CANCELLED: // Cancelled
        return { bg: 'bg-red-50 dark:bg-red-900', text: 'text-red-500 dark:text-red-200' };
      default:
        return { bg: 'bg-muted', text: 'text-muted-foreground' };
    }
  };

  const statusColor = getStatusColor();
  const isTransfer = transaction.type === TYPE_HISTORY_ID.WITHDRAWAL && !!transaction?.withdrawalMetadata?.toAccountId;
  const isWithdrawal = transaction.type === TYPE_HISTORY_ID.WITHDRAWAL && !isTransfer;

  const typeName = isTransfer
    ? t('transactionHistory.transfer')
    : TYPE_HISTORY_NAME[transaction.type as keyof typeof TYPE_HISTORY_NAME] || t('transactionHistory.unknown');

  const statusName =
    STATUS_HISTORY_NAME[transaction.status as keyof typeof STATUS_HISTORY_NAME] ||
    t('transactionHistory.unknown');

  // Format date
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

  // Format amount with sign
  const formatAmount = () => {
    const amount = parseFloat(transaction.netAmount);
    const sign = transaction.type === 1 ? '-' : '+'; // Withdrawal is negative
    return `${sign}${Math.abs(amount)} ${t('transactionHistory.usd')}`;
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

      {/* Details: From -> To */}
      {isWithdrawal && transaction.withdrawalMetadata?.address && (
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
                {transaction.accountId}
              </span>
            </div>

            <ArrowRight className="text-muted-foreground size-4 shrink-0" />

            <div className="flex flex-1 flex-row items-center gap-2 overflow-hidden">
              <Image
                src={
                  chainIconMap[String(transaction.withdrawalMetadata.chainId)] ??
                  '/assets/images/97.png'
                }
                alt="Chain"
                width={24}
                height={24}
                className="size-6 shrink-0"
              />
              <span className="text-body-small-regular text-foreground flex-1 truncate">
                {transaction.withdrawalMetadata.address}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Details */}
      {isTransfer && transaction.withdrawalMetadata?.toAccountId && (
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
                {transaction.accountId}
              </span>
            </div>

            <ArrowRight className="text-muted-foreground size-4 shrink-0" />

            <div className="flex flex-1 flex-row items-center gap-2 overflow-hidden">
              <Image
                src="/assets/images/transaction-history/icon.png"
                alt="Icon"
                width={24}
                height={24}
                className="size-6 shrink-0"
              />
              <span className="text-body-small-regular text-foreground flex-1 truncate">
                {transaction.withdrawalMetadata.toAccountId}
              </span>
            </div>
          </div>
        </div>
      )}
    </button>
  );
};

export default TransactionHistoryCard;
