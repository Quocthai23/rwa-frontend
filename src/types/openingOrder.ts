import { OrderSide } from '@/types/orders';

// Trigger types for stop loss and take profit
export enum TriggerType {
  PRICE = 'price',
  PIPS = 'pips',
  CHANGE_PERCENT = 'changePercent',
}

export type TriggerTypeString = 'price' | 'pips' | 'changePercent';

// Editing field types
export type EditingFieldType = 'takeProfit' | 'stopLoss' | 'limitStopPrice' | null;

// Tab types for opening order
export type OpeningOrderTabType = 'close_position' | 'open_position' | 'modify_order';

// Trading position side
export type PositionSide = OrderSide;

// Constants for trigger types
export const TRIGGER_TYPE_OPTIONS = [
  {
    label: TriggerType.PRICE,
  },
  {
    label: TriggerType.PIPS,
  },
  {
    label: TriggerType.CHANGE_PERCENT,
  },
] as const;

// Constants for trigger type labels and units
export const TRIGGER_TYPE_UNITS: Record<TriggerTypeString, string> = {
  [TriggerType.PRICE]: '',
  [TriggerType.PIPS]: 'Pips',
  [TriggerType.CHANGE_PERCENT]: '%',
};

// Validation constants
export const MAX_CHANGE_PERCENT_THRESHOLD = 50;
export const DECIMAL_PLACES = {
  PERCENT: 4,
  PIPS: 0,
  PRICE: 4,
} as const;
