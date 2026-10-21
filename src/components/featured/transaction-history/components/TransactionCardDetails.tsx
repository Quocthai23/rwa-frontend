'use client';
import { useTranslation } from 'react-i18next';
import { X } from '@untitledui/icons';
import { TransactionDetailSheet } from '@/components/shared/components/TransactionDetailSheet';
import type { PaymentHistoryItem } from '@/types/payment';
import {
  transactionAmount,
  transactionTypeLabel,
  transactionStatusLabel,
  formatTransactionMoney,
} from '../presentation';
type Props = { transaction?: PaymentHistoryItem; isVisible: boolean; onClose: () => void };
export default function TransactionCardDetails({ transaction, isVisible, onClose }: Props) {
  const { i18n } = useTranslation();
  const vi = i18n.language.startsWith('vi');
  const text = (a: string, b: string) => (vi ? a : b);
  const tx = transaction;
  const currency = tx?.currency || 'VND';
  const date = (value: string) => new Date(value).toLocaleString(vi ? 'vi-VN' : 'en-GB');
  const rows = tx
    ? [
        [text('Mã giao dịch', 'Transaction ID'), tx.id],
        [text('Trạng thái', 'Status'), transactionStatusLabel(tx.status, i18n.language)],
        [text('Số tiền', 'Amount'), transactionAmount(tx, i18n.language)],
        [
          text('Phí', 'Fee'),
          tx.fee != null ? formatTransactionMoney(tx.fee, currency, i18n.language) : '—',
        ],
        [text('Đơn vị tiền', 'Currency'), currency],
        [text('Tài khoản', 'Account'), tx.accountId],
        [text('Mã tài sản', 'Asset ID'), tx.assetId],
        [
          text('Chiều giao dịch', 'Direction'),
          tx.direction
            ? ['CREDIT', 'RECEIVED', 'IN'].includes(tx.direction)
              ? text('Tiền vào', 'Incoming')
              : text('Tiền ra', 'Outgoing')
            : undefined,
        ],
        [text('Thời gian tạo', 'Created at'), date(tx.createdAt)],
        [text('Cập nhật lần cuối', 'Last updated'), tx.updatedAt ? date(tx.updatedAt) : undefined],
        [text('Mã chuyển tiền', 'Transfer ID'), tx.transferId],
        [text('Kênh thanh toán', 'Provider'), tx.provider],
        [text('Mã tham chiếu', 'Provider reference'), tx.providerReference],
        [text('Trạng thái nhà cung cấp', 'Provider status'), tx.providerStatus],
        [text('Mã giao dịch blockchain', 'Blockchain transaction hash'), tx.txHash],
        [
          text('Số xác nhận blockchain', 'Blockchain confirmations'),
          tx.txHash ? String(tx.confirmations ?? 0) : undefined,
        ],
        [
          text('Trạng thái hoàn tiền', 'Refund status'),
          tx.refundStatus && tx.refundStatus !== 'NONE' ? tx.refundStatus : undefined,
        ],
        [text('Mã hoàn tiền', 'Refund transaction hash'), tx.refundTxHash],
      ].filter(([, value]) => value != null && value !== '')
    : [];
  return (
    <TransactionDetailSheet open={isVisible} onOpenChange={(open) => !open && onClose()}>
      {tx && (
        <div className="scrollbar-neutral-slim max-h-[85dvh] overflow-y-auto p-5">
          <header className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">
                {transactionTypeLabel(tx.type, i18n.language)}
              </h2>
              <p className="mt-2 text-xl font-semibold">{transactionAmount(tx, i18n.language)}</p>
            </div>
            <button
              aria-label={text('Đóng', 'Close')}
              onClick={onClose}
              className="hover:bg-muted rounded p-2"
            >
              <X className="size-5" />
            </button>
          </header>
          <dl className="divide-border divide-y">
            {rows.map(([label, value]) => (
              <div
                key={label}
                className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-4 py-3 text-sm"
              >
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="text-right break-all select-text">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </TransactionDetailSheet>
  );
}
