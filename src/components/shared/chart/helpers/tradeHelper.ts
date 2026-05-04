import { type UnitType } from '../types/types';

export const LOT_MIN = 0.01;
export const LOT_STEP = 0.01;
export const LOT_MAX_UI = 10;

export const clamp = (x: number, min: number, max: number) => Math.min(max, Math.max(min, x));

export const parseNum = (s: string, fallback: number) => {
  const n = Number(String(s).replace(',', '.'));

  return Number.isFinite(n) ? n : fallback;
};

export const formatByUnit = (n: number, unit: UnitType) => {
  if (!Number.isFinite(n)) return unit === 'LOTS' ? LOT_MIN.toFixed(2) : '0';

  return unit === 'LOTS' ? n.toFixed(2) : n.toFixed(2);
};

export const floorToStep = (x: number, step: number) => Math.floor(x / step) * step;

export const ceilToStep = (x: number, step: number) => Math.ceil(x / step) * step;

export const TABS = [
  'Market Execution',
  'Buy Limit',
  'Sell Limit',
  'Buy Stop',
  'Sell Stop',
  'Buy Stop Limit',
  'Sell Stop Limit',
];
export const colorActiveMap: Record<number, string> = {
  0: '#0158FF',
  1: '#12B76A',
  2: '#F04438',
  3: '#12B76A',
  4: '#F04438',
  5: '#12B76A',
  6: '#F04438',
};
