import { CLOSED_BY } from '@/types/orders';
import { TFunction } from 'i18next';

export const getClosedByMap = (t: TFunction): Record<number, string> => ({
  [CLOSED_BY.TAKE_PROFIT]: t('position.modal.closedAtTakeProfit'),
  [CLOSED_BY.STOP_LOSS]: t('position.modal.closedAtStopLoss'),
  [CLOSED_BY.LIQUIDATION]: t('position.modal.closedByLiquidation'),
});
