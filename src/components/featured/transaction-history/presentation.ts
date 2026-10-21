import Decimal from 'decimal.js';
import type { PaymentHistoryItem } from '@/types/payment';
const labels: Record<string, [string, string]> = {
  DEPOSIT: ['Nạp tiền', 'Deposit'],
  WITHDRAW: ['Rút tiền', 'Withdrawal'],
  TRANSFER: ['Chuyển tiền', 'Transfer'],
  TRADE_BUY: ['Mua token', 'Token purchase'],
  TRADE_SELL: ['Bán token', 'Token sale'],
  DIVIDEND: ['Chia lợi tức', 'Dividend'],
  FEE: ['Phí giao dịch', 'Fee'],
  MINT: ['Phát hành token', 'Token mint'],
  BURN: ['Thu hồi token', 'Token burn'],
  DIVIDEND_CLAIM: ['Nhận lợi tức', 'Dividend claim'],
  COMMISSION: ['Hoa hồng', 'Commission'],
  RENTAL_PAYMENT: ['Thanh toán tiền thuê', 'Rent payment'],
  RENTAL_WALLET_DEPOSIT: ['Nạp ví hợp đồng thuê', 'Rental wallet funding'],
  RENTAL_INCOME_CLAIM: ['Nhận tiền thuê', 'Rental income claim'],
  BUYOUT_INSTALLMENT: ['Thanh toán kỳ thâu tóm', 'Buyout installment'],
  BUYOUT_PROCEEDS_CLAIM: ['Nhận tiền thâu tóm', 'Buyout proceeds claim'],
};
export const transactionTypeLabel = (type: string, language: string) =>
  labels[type]?.[language.startsWith('vi') ? 0 : 1] ?? type;
export const transactionStatusLabel = (status: string, language: string) =>
  (
    ({
      COMPLETED: ['Hoàn tất', 'Completed'],
      PENDING: ['Đang chờ', 'Pending'],
      PROCESSING: ['Đang xử lý', 'Processing'],
      FAILED: ['Thất bại', 'Failed'],
      CANCELLED: ['Đã hủy', 'Cancelled'],
    }) as Record<string, string[]>
  )[status]?.[language.startsWith('vi') ? 0 : 1] ?? status;
export function transactionSign(tx: PaymentHistoryItem) {
  if (['RECEIVED', 'CREDIT', 'IN'].includes(tx.direction ?? '')) return '+';
  if (['SENT', 'DEBIT', 'OUT'].includes(tx.direction ?? '')) return '-';
  if (tx.type === 'TRANSFER') return '';
  return [
    'DEPOSIT',
    'TRADE_SELL',
    'DIVIDEND',
    'DIVIDEND_CLAIM',
    'COMMISSION',
    'RENTAL_INCOME_CLAIM',
    'BUYOUT_PROCEEDS_CLAIM',
    'MINT',
  ].includes(tx.type)
    ? '+'
    : '-';
}
export function formatTransactionMoney(amount: string, currency = 'VND', language = 'vi') {
  try {
    const value = new Decimal(amount).abs().toFixed(currency === 'VND' ? 0 : 2);
    const [integer, fraction] = value.split('.');
    const vi = language.startsWith('vi');
    return (
      integer.replace(/\B(?=(\d{3})+(?!\d))/g, vi ? '.' : ',') +
      (fraction ? (vi ? ',' : '.') + fraction : '') +
      ' ' +
      currency
    );
  } catch {
    return '—';
  }
}
export function transactionAmount(tx: PaymentHistoryItem, language: string) {
  return transactionSign(tx) + formatTransactionMoney(tx.amount, tx.currency || 'VND', language);
}
