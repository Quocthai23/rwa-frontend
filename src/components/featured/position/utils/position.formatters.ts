import { ORDER_TYPES, OrderStatus } from '@/types/orders';
import Decimal from 'decimal.js';

export function formatDecimal(
  value: string | number | null | undefined,
  fallback: string = '-',
  fixed?: number,
): string {
  if (value === null || value === undefined || value === '') return fallback;

  try {
    const decimal = new Decimal(value.toString());

    if (fixed !== undefined) {
      return decimal.toFixed(fixed);
    }

    return decimal.toFixed();
  } catch {
    return fallback;
  }
}

export function formatOrderValue(value: string | number | null | undefined): string {
  return formatDecimal(value, '');
}

export function getOrderStatusLabel(status: string | number, t: (key: string) => string): string {
  if (status === OrderStatus.PENDING || status === 'PENDING') return t('position.modal.orderStatusPlaced');
  if (status === OrderStatus.OPEN || status === 'OPEN') return t('position.modal.orderStatusPlaced');
  if (status === OrderStatus.PARTIALLY_FILLED || status === 'PARTIALLY_FILLED')
    return t('position.modal.orderStatusPartiallyFilled');
  if (status === OrderStatus.FILLED || status === 'FILLED') return t('position.modal.orderStatusFilled');
  if (status === OrderStatus.CANCELLED || status === 'CANCELLED') return t('position.modal.orderStatusCancelled');
  if (status === OrderStatus.REJECTED || status === 'REJECTED') return t('position.modal.orderStatusRejected');
  return t('position.modal.unknown');
}

export function getOrderTypeLabel(orderType: number | string, t: (key: string) => string): string {
  if (orderType === ORDER_TYPES.MARKET || orderType === 'MARKET') return t('position.modal.orderTypeMarket');
  if (orderType === ORDER_TYPES.LIMIT || orderType === 'LIMIT') return t('position.modal.orderTypeLimit');
  // Stop orders deprecated
  return t('position.modal.orderTypeMarket');
}
