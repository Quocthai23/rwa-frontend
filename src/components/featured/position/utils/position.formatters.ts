import { ORDER_TYPE_CODES, OrderStatus } from '@/types/orders';
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

export function getOrderStatusLabel(status: number, t: (key: string) => string): string {
  if (status === OrderStatus.NEW) return t('position.modal.orderStatusPlaced');
  if (status === OrderStatus.PARTIALLY_FILLED)
    return t('position.modal.orderStatusPartiallyFilled');
  if (status === OrderStatus.FILLED) return t('position.modal.orderStatusFilled');
  if (status === OrderStatus.CANCELLED) return t('position.modal.orderStatusCancelled');
  if (status === OrderStatus.REJECTED) return t('position.modal.orderStatusRejected');
  return t('position.modal.unknown');
}

export function getOrderTypeLabel(orderType: number, t: (key: string) => string): string {
  if (orderType === ORDER_TYPE_CODES.MARKET) return t('position.modal.orderTypeMarket');
  if (orderType === ORDER_TYPE_CODES.LIMIT) return t('position.modal.orderTypeLimit');
  if (orderType === ORDER_TYPE_CODES.STOP) return t('position.modal.orderTypeStop');
  return t('position.modal.orderTypeMarket');
}
