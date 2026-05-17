'use client';

import {
  X,
  Copy01,
  Clock,
  DotsVertical,
  ArrowCircleBrokenUpRight,
  ArrowCircleBrokenDownLeft,
  SwitchHorizontal01,
  Check,
} from '@untitledui/icons';
import Image from 'next/image';
import React from 'react';

import { Dialog, DialogContent, DialogTitle } from '@/components/shared/atoms/dialog';
import { cn } from '@/lib/utils';
import type { PaymentHistoryItem } from '@/types/payment';
import { useTranslation } from 'react-i18next';
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

// BE now uses string enums for type and status
const STATUS_COLOR_MAP: Record<string, { bg: string; text: string }> = {
  COMPLETED: { bg: 'bg-green-50', text: 'text-green-500' },
  PENDING: { bg: 'bg-yellow-50', text: 'text-yellow-500' },
  FAILED: { bg: 'bg-red-50', text: 'text-red-500' },
  CANCELLED: { bg: 'bg-red-50', text: 'text-red-500' },
};

const STATUS_DISPLAY: Record<string, string> = {
  COMPLETED: 'Completed',
  PENDING: 'Pending',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};

const TYPE_DISPLAY: Record<string, string> = {
  DEPOSIT: 'Deposit',
  WITHDRAW: 'Withdrawal',
  TRANSFER: 'Transfer',
  DIVIDEND_CLAIM: 'Dividend',
};

const TransactionCardDetails = ({ transaction, isVisible, onClose }: Props) => {
  const { t } = useTranslation();

  const getStatusStyle = () => {
    if (!transaction) return { bg: 'bg-muted', text: 'text-muted-foreground' };
    return STATUS_COLOR_MAP[transaction.status] ?? { bg: 'bg-muted', text: 'text-muted-foreground' };
  };

  const statusColor = getStatusStyle();

  const isDeposit = transaction?.type === 'DEPOSIT';
  const isTransfer = transaction?.type === 'TRANSFER';
  const isWithdrawal = transaction?.type === 'WITHDRAW';

  const typeName = TYPE_DISPLAY[transaction?.type ?? ''] ?? t('transactionHistory.unknown');
  const statusName = STATUS_DISPLAY[transaction?.status ?? ''] ?? t('transactionHistory.unknown');

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
    if (!transaction) return `0 ${t('transactionHistory.usd')}`;
    const amount = parseFloat(transaction.amount);
    const sign = isDeposit ? '+' : '-';
    return `${sign}${Math.abs(amount).toFixed(2)} ${t('transactionHistory.usd')}`;
  };

  const [isCopied, setIsCopied] = React.useState(false);
  const handleCopy = (text: string) => {
    copyText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const isCompleted = transaction?.status === 'COMPLETED';

  return (
    <Dialog open={isVisible} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="border-border bg-background w-[90vw] max-w-[400px] gap-0 overflow-hidden rounded-xl border p-0 shadow-lg"
      >
        <DialogTitle className="sr-only">{t('transactionHistory.transactionDetails')}</DialogTitle>

        {transaction ? (
          <div className="max-h-[85vh] overflow-y-auto">
            <div className="flex flex-col gap-4 p-4">
              {/* Header */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-row items-start justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-row items-center gap-2">
                      {isDeposit ? (
                        <ArrowCircleBrokenDownLeft className={cn('size-6', statusColor.text)} />
                      ) : isTransfer ? (
                        <SwitchHorizontal01 className={cn('size-6', statusColor.text)} />
                      ) : (
                        <ArrowCircleBrokenUpRight className={cn('size-6', statusColor.text)} />
                      )}
                      <div className="flex flex-row items-center gap-1">
                        <span className="text-h3-medium text-foreground">{typeName}</span>
                        <div
                          className={cn('border-border rounded border px-1 py-1', statusColor.bg)}
                        >
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

                  <button
                    onClick={onClose}
                    className="hover:bg-muted flex size-7 items-center justify-center rounded-full transition-colors"
                  >
                    <X className="text-foreground size-5" />
                  </button>
                </div>

                <div className="flex flex-row items-center justify-between">
                  <div className="flex flex-row items-center gap-1">
                    <span className="text-body-small-regular text-muted-foreground">
                      {t('transactionHistory.txh')}
                    </span>
                    <span className="text-body-small-regular text-primary-500">
                      {transaction.txHash?.slice(-12) ?? transaction.id.slice(-12)}
                    </span>
                    <button
                      onClick={() => handleCopy(transaction.txHash ?? transaction.id)}
                      className="ml-1 flex items-center justify-center hover:opacity-70"
                    >
                      {isCopied ? (
                        <Check className="size-4 text-green-500" />
                      ) : (
                        <Copy01 className="text-foreground size-4" />
                      )}
                    </button>
                  </div>
                  <span className="text-h2-semibold text-foreground">{formatAmount()}</span>
                </div>
              </div>

              {/* Stepper */}
              <div className="flex flex-col gap-2">
                <div className="flex flex-row gap-2">
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

                <div className="flex flex-row gap-2">
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

                <div className="flex flex-row gap-2">
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
                    {isCompleted && (
                      <span className="text-caption-regular text-muted-foreground">
                        {formatDate(transaction.updatedAt || transaction.createdAt || new Date().toISOString())}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Info Message */}
              <div className="border-primary-400 bg-primary-50 rounded border p-3">
                <p className="text-body-small-regular text-primary-500 m-0">
                  {t('transactionHistory.infoProcessed')}
                </p>
              </div>

              {/* From/To Section */}
              <div className="flex flex-col gap-4">
                <div className="bg-border h-px w-full" />

                <div className="flex flex-col gap-3">
                  {/* From */}
                  <div className="flex flex-row items-center justify-between gap-1">
                    <span className="text-body-small-regular text-muted-foreground">
                      {t('transactionHistory.from')}
                    </span>
                    <div className="flex flex-row items-center gap-2">
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

                  {/* To: Withdrawal address */}
                  {isWithdrawal && transaction.txHash && (
                    <div className="flex w-full flex-row items-center justify-between gap-1">
                      <span className="text-body-small-regular text-muted-foreground">
                        {t('transactionHistory.to')}
                      </span>
                      <div className="flex flex-row items-center gap-2">
                        <Image
                          src={chainIconMap['56'] ?? '/assets/images/97.png'}
                          alt="Chain"
                          width={24}
                          height={24}
                          className="size-6"
                        />
                        <span className="text-body-large-medium text-foreground max-w-[150px] truncate md:max-w-[200px]">
                          {transaction.txHash}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-border h-px w-full" />

                {/* Amounts */}
                <div className="flex flex-col gap-3 pb-4">
                  <div className="flex flex-row justify-between">
                    <span className="text-body-small-regular text-muted-foreground">
                      {t('transactionHistory.commission')}
                    </span>
                    <span className="text-body-large-medium text-foreground">
                      {transaction.fee ?? '0'} {t('transactionHistory.usd')}
                    </span>
                  </div>
                  <div className="flex flex-row justify-between">
                    <span className="text-body-small-regular text-muted-foreground">
                      {t('transactionHistory.grossAmount')}
                    </span>
                    <span className="text-body-large-medium text-foreground">
                      {transaction.amount} {t('transactionHistory.usd')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center">
            <span className="text-body-large-medium text-foreground">
              {t('transactionHistory.loadingTransactionDetails')}
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TransactionCardDetails;
