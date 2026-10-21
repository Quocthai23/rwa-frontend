import { describe, expect, it } from 'vitest';
import { transactionAmount, transactionTypeLabel } from './presentation';
import type { PaymentHistoryItem } from '@/types/payment';
const tx = (type: string, fields: Partial<PaymentHistoryItem> = {}) => ({
  id: 'id',
  type,
  amount: '25000000',
  accountId: 'a',
  userId: 'u',
  createdAt: '',
  updatedAt: '',
  status: 'COMPLETED',
  ...fields,
});
describe('VND transaction presentation', () => {
  it('formats VND with grouping and no USD fallback', () => {
    expect(transactionAmount(tx('RENTAL_WALLET_DEPOSIT'), 'vi')).toBe('-25.000.000 VND');
    expect(transactionAmount(tx('BUYOUT_PROCEEDS_CLAIM', { amount: '112000000' }), 'en')).toBe(
      '+112,000,000 VND',
    );
  });
  it('uses the transfer direction rather than assuming all transfers are debits', () => {
    expect(transactionAmount(tx('TRANSFER', { direction: 'RECEIVED' }), 'vi')).toBe(
      '+25.000.000 VND',
    );
    expect(transactionAmount(tx('TRANSFER', { direction: 'SENT' }), 'vi')).toBe('-25.000.000 VND');
    expect(transactionAmount(tx('TRANSFER'), 'vi')).toBe('25.000.000 VND');
  });
  it('does not lose precision for large decimal strings', () => {
    expect(transactionAmount(tx('DEPOSIT', { amount: '999999999999999999999' }), 'en')).toBe(
      '+999,999,999,999,999,999,999 VND',
    );
  });
  it('names buyout and rental operations and preserves unfamiliar types', () => {
    expect(transactionTypeLabel('BUYOUT_INSTALLMENT', 'en')).toBe('Buyout installment');
    expect(transactionTypeLabel('RENTAL_INCOME_CLAIM', 'en')).toBe('Rental income claim');
    expect(transactionTypeLabel('NEW_TYPE', 'vi')).toBe('NEW_TYPE');
  });
});
