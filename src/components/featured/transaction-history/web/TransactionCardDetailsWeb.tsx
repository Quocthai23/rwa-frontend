'use client';

import {
  Check,
  Clock,
  Copy01,
  DotsVertical,
  ArrowCircleRight,
  ArrowCircleBrokenUpRight,
  ArrowCircleBrokenDownLeft,
  SwitchHorizontal01,
  X,
} from '@untitledui/icons';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/shared/atoms/button';
import { TransactionDetailSheet } from '@/components/shared/components/TransactionDetailSheet';
import { cn } from '@/lib/utils';
import type { PaymentHistoryItem } from '@/types/payment';
import { copyText } from '@/utils/copy';

type Props = {
  transaction?: PaymentHistoryItem;
  isVisible: boolean;
  onClose: () => void;
};

const chainIconMap: Record<string, string> = {
  '97': '/assets/images/97.png',
  '11155111': '/assets/images/11155111.png',
};

export default function TransactionCardDetailsWeb({ transaction, isVisible, onClose }: Props) {
  const { t } = useTranslation();
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      setIsCopied(false);
    }
  }, [isVisible]);

  const STATUS_COLOR_MAP: Record<string, { bg: string; text: string }> = {
    COMPLETED: { bg: 'bg-green-50', text: 'text-green-500' },
    PENDING: { bg: 'bg-green-50', text: 'text-green-500' },
    FAILED: { bg: 'bg-red-50', text: 'text-red-500' },
    CANCELLED: { bg: 'bg-red-50', text: 'text-red-500' },
  };
  const statusColor = transaction
    ? (STATUS_COLOR_MAP[transaction.status] ?? { bg: 'bg-muted', text: 'text-muted-foreground' })
    : { bg: 'bg-muted', text: 'text-muted-foreground' };

  const isDeposit = transaction?.type === 'DEPOSIT';
  const isTransfer = transaction?.type === 'TRANSFER';
  const isWithdrawal = transaction?.type === 'WITHDRAW';

  const TYPE_DISPLAY: Record<string, string> = {
    DEPOSIT: 'Deposit',
    WITHDRAW: 'Withdrawal',
    TRANSFER: 'Transfer',
    DIVIDEND_CLAIM: 'Dividend',
  };
  const STATUS_DISPLAY: Record<string, string> = {
    COMPLETED: 'Completed',
    PENDING: 'Pending',
    FAILED: 'Failed',
    CANCELLED: 'Cancelled',
  };

  const typeName = isTransfer
    ? t('transactionHistory.transfer')
    : transaction
      ? TYPE_DISPLAY[transaction.type] || t('transactionHistory.unknown')
      : t('transactionHistory.unknown');

  const statusName = transaction
    ? STATUS_DISPLAY[transaction.status] || t('transactionHistory.unknown')
    : t('transactionHistory.unknown');

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
    if (!transaction) return `0.00 ${t('transactionHistory.usd')}`;
    const amount = parseFloat(transaction.amount);
    const sign = isDeposit ? '+' : '-';
    return `${sign}${Math.abs(amount).toFixed(2)} ${t('transactionHistory.usd')}`;
  };

  const handleCopy = (text: string) => {
    copyText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const isCompleted = transaction?.status === 'COMPLETED';

  return (
    <TransactionDetailSheet open={isVisible} onOpenChange={(open) => !open && onClose()}>
      {transaction ? (
        <div>
          <div className="dark:bg-card flex flex-col gap-4 p-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    {isDeposit ? (
                      <ArrowCircleBrokenDownLeft className={cn('size-6', statusColor.text)} />
                    ) : isTransfer ? (
                      <SwitchHorizontal01 className={cn('size-6', statusColor.text)} />
                    ) : isWithdrawal ? (
                      <ArrowCircleBrokenUpRight className={cn('size-6', statusColor.text)} />
                    ) : (
                      <ArrowCircleRight className={cn('size-6', statusColor.text)} />
                    )}
                    <div className="flex items-center gap-1">
                      <span className="text-h3-medium text-foreground">{typeName}</span>
                      <div className={cn('border-border rounded border px-1 py-1', statusColor.bg)}>
                        <span className={cn('text-caption-medium text-sm', statusColor.text)}>
                          {statusName}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-body-small-regular text-muted-foreground">
                    {t('transactionHistory.invoiceId')} {transaction.id.slice(-10)}
                  </span>
                </div>

                <Button
                  variant="white-contained"
                  className="hover:bg-muted h-7 w-7 rounded-full p-0"
                  onClick={onClose}
                >
                  <X className="text-foreground size-5" />
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-body-small-regular text-muted-foreground">
                    {t('transactionHistory.txh')}
                  </span>
                  <span className="text-body-small-regular text-primary-500">
                    {transaction.id.slice(-12)}
                  </span>
                  <Button
                    variant="white-contained"
                    className="ml-1 h-6 w-6 p-0"
                    onClick={() => handleCopy(transaction.id)}
                  >
                    {isCopied ? (
                      <Check className="size-4 text-green-500" />
                    ) : (
                      <Copy01 className="text-foreground size-4" />
                    )}
                  </Button>
                </div>
                <span className="text-h2-semibold text-foreground">{formatAmount()}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <div className="bg-primary-100 flex size-8 shrink-0 items-center justify-center rounded-full">
                  <Check className="text-primary-500 size-4" />
                </div>
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="text-body-small-semibold text-foreground">
                    {t('transactionHistory.created')}
                  </span>
                  <span className="text-caption-regular text-muted-foreground">
                    {formatDate(transaction.createdAt || new Date().toISOString())}
                  </span>
                </div>
              </div>

              <DotsVertical className="text-primary-500 ml-1 size-6" />

              <div className="flex gap-2">
                <div className="bg-primary-100 flex size-8 shrink-0 items-center justify-center rounded-full">
                  <Check className="text-primary-500 size-4" />
                </div>
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="text-body-small-semibold text-foreground">
                    {t('transactionHistory.processedByMtx')}
                  </span>
                  <span className="text-caption-regular text-muted-foreground">
                    {formatDate(transaction.createdAt || new Date().toISOString())}
                  </span>
                </div>
              </div>

              <DotsVertical
                className={cn('ml-1 size-6', isCompleted ? 'text-primary-500' : 'text-muted')}
              />

              <div className="flex gap-2">
                <div
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-full',
                    isCompleted ? 'bg-primary-100' : 'bg-muted',
                  )}
                >
                  {isCompleted ? (
                    <Check className="text-primary-500 size-4" />
                  ) : (
                    <Clock className="text-muted-foreground size-4" />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-0.5">
                  <span className="text-body-small-semibold text-foreground">
                    {isDeposit
                      ? t('transactionHistory.creditingToAccount')
                      : t('transactionHistory.transferComplete')}
                  </span>
                  {isCompleted ? (
                    <span className="text-caption-regular text-muted-foreground">
                      {formatDate(transaction.createdAt || new Date().toISOString())}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="border-primary-400 bg-primary-50 dark:bg-card rounded border p-3">
              <p className="text-body-small-regular text-primary-500 m-0">
                {t('transactionHistory.infoProcessed')}
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="bg-border h-px w-full" />

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-body-small-regular text-muted-foreground">
                    {t('transactionHistory.from')}
                  </span>
                  <div className="flex items-center gap-2">
                    <Image
                      src="/assets/images/transaction-history/icon.png"
                      alt="Icon"
                      width={24}
                      height={24}
                      className="size-6"
                    />
                    <span className="text-body-large-medium text-foreground">
                      {transaction.userId}
                    </span>
                  </div>
                </div>

                {isWithdrawal && transaction.txHash ? (
                  <div className="flex w-full items-center justify-between gap-1">
                    <span className="text-body-small-regular text-muted-foreground">
                      {t('transactionHistory.to')}
                    </span>
                    <div className="flex items-center gap-2">
                      <Image
                        src="/assets/images/97.png"
                        alt="Chain"
                        width={24}
                        height={24}
                        className="size-6"
                      />
                      <span className="text-body-large-medium text-foreground max-w-[200px] truncate">
                        {transaction.txHash}
                      </span>
                    </div>
                  </div>
                ) : null}

                {isTransfer ? (
                  <div className="flex w-full items-center justify-between gap-1">
                    <span className="text-body-small-regular text-muted-foreground">
                      {t('transactionHistory.to')}
                    </span>
                    <div className="flex items-center gap-2">
                      <Image
                        src="/assets/images/transaction-history/icon.png"
                        alt="Icon"
                        width={24}
                        height={24}
                        className="size-6"
                      />
                      <span className="text-body-large-medium text-foreground">
                        {t('transactionHistory.transfer')}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </TransactionDetailSheet>
  );
}
