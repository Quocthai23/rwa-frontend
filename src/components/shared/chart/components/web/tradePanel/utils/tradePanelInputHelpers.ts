import Decimal from 'decimal.js';

import type { DecimalValue, NullableDecimalValue } from '@/types/decimal';

export type TriggerType = 'price' | 'pips' | 'changePercent';

export const normalizeDecimalInput = (text: string) => text.replace(',', '.');

export const toFiniteNumberFromNumberish = (value: NullableDecimalValue): number | undefined => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string') {
    const normalized = normalizeDecimalInput(value.trim());
    if (!normalized) return undefined;
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

export const toPositiveAssetNumber = (value: NullableDecimalValue, fallback: number): number => {
  const parsed = toFiniteNumberFromNumberish(value);
  return parsed != null && parsed > 0 ? parsed : fallback;
};

export const snapQuantityToVolumeStep = (rawQty: number, step: number): number => {
  const s = new Decimal(step > 0 ? step : 0.01);
  return new Decimal(rawQty).div(s).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).mul(s).toNumber();
};

export const PIPS_MAX_INPUT = 999999;
export const CHANGE_PERCENT_MIN = 0.0001;
export const CHANGE_PERCENT_MAX = 99.9999;

export const getDecimalPlaces = (num: number) => {
  if (!Number.isFinite(num)) return 0;
  const s = num.toString().toLowerCase();
  if (s.includes('e-')) {
    const [, exp = '0'] = s.split('e-');
    return Number.parseInt(exp, 10) || 0;
  }
  const decimalPart = s.split('.')[1];
  return decimalPart?.length ?? 0;
};

export const getTriggerInputStep = (triggerType: TriggerType, symbolDigit: number) => {
  if (triggerType === 'price') {
    const digit = symbolDigit;
    return 10 ** -digit;
  }
  if (triggerType === 'pips') return 1;
  return 0.1;
};

export const clampChangePercentNumberForInput = (n: number) => {
  if (!Number.isFinite(n)) return n;
  if (n <= 0) return 0;
  return Math.min(CHANGE_PERCENT_MAX, Math.max(CHANGE_PERCENT_MIN, n));
};

export const formatChangePercentNumber = (n: number) => {
  if (!Number.isFinite(n)) return '';
  if (n === 0) return '0';
  const clamped = clampChangePercentNumberForInput(n);
  return clamped.toFixed(4).replace(/\.?0+$/, '');
};

export const formatTriggerInputOnBlur = (
  triggerType: TriggerType,
  v: string,
  countLimitPrice: number,
) => {
  const n = Number.parseFloat(normalizeDecimalInput(v));
  if (!Number.isFinite(n)) return '';
  if (triggerType === 'pips') {
    const pipsInt = Math.trunc(n);
    const clamped = Math.min(PIPS_MAX_INPUT, Math.max(0, pipsInt));
    return clamped.toString();
  }
  if (triggerType === 'changePercent') {
    return formatChangePercentNumber(n);
  }
  return n.toFixed(countLimitPrice);
};

const handleIncrement = (
  triggerType: TriggerType,
  setter: (value: string) => void,
  value: string,
  step = 0.01,
) => {
  const normalized = normalizeDecimalInput(value);
  const numberValue = Number.parseFloat(normalized) || 0;
  const countLimitPrice = normalized.split('.')[1]?.length ?? 0;
  if (triggerType === 'pips') {
    const nextInt = Math.trunc(numberValue + step);
    const clamped = Math.min(PIPS_MAX_INPUT, Math.max(0, nextInt));
    setter(clamped.toString());
    return;
  }
  const decimalPlaces = Math.max(countLimitPrice, getDecimalPlaces(step));
  setter((numberValue + step).toFixed(decimalPlaces));
};

const handleDecrement = (
  triggerType: TriggerType,
  setter: (value: string) => void,
  value: string,
  step = 0.01,
  options?: { clearWhenMin?: boolean },
) => {
  const normalized = normalizeDecimalInput(value);
  const numberValue = Number.parseFloat(normalized) || 0;
  const countLimitPrice = normalized.split('.')[1]?.length ?? 0;
  const shouldClearWhenMin = options?.clearWhenMin ?? false;
  if (triggerType === 'pips') {
    if (numberValue > step) {
      const nextInt = Math.trunc(numberValue - step);
      const clamped = Math.max(0, nextInt);
      setter(clamped.toString());
    } else if (shouldClearWhenMin && numberValue > 0) {
      setter('');
    }
    return;
  }
  if (numberValue > step) {
    const decimalPlaces = Math.max(countLimitPrice, getDecimalPlaces(step));
    setter((numberValue - step).toFixed(decimalPlaces));
  } else if (shouldClearWhenMin && numberValue > 0) {
    setter('');
  }
};

export const applyLimitPriceTextChange = (
  setter: (value: string) => void,
  text: string,
  symbolDigit: number,
) => {
  const normalized = normalizeDecimalInput(text);
  if (!/^\d*\.?\d*$/.test(normalized)) return;
  const integerPart = normalized.split('.')[0] ?? '';
  if (integerPart.length > 6) return;
  const digit = symbolDigit;
  const decimals = normalized.split('.')[1] ?? '';
  if (decimals.length > digit) return;
  setter(normalized);
};

export const applyLimitPriceBlur = (
  value: string,
  setLimitPrice: (v: string) => void,
  symbolDigit: number,
) => {
  if (!value) return;
  const num = Number.parseFloat(normalizeDecimalInput(value));
  if (!Number.isFinite(num) || num <= 0) {
    setLimitPrice('');
    return;
  }
  setLimitPrice(num.toFixed(symbolDigit));
};

export const adjustLimitPriceByStep = (
  direction: 1 | -1,
  limitPrice: string,
  setLimitPrice: (v: string) => void,
  symbolDigit: number,
  transactionType: 'buy' | 'sell',
  sellPrice: DecimalValue,
  buyPrice: DecimalValue,
  priceStep?: DecimalValue,
) => {
  const currentMarketPrice = transactionType === 'sell' ? sellPrice : buyPrice;
  const normalized = normalizeDecimalInput(limitPrice);
  const parsed = Number.parseFloat(normalized);
  const fallbackMarketPrice = toFiniteNumberFromNumberish(currentMarketPrice) ?? 0;
  const basePrice = Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackMarketPrice;

  if (!Number.isFinite(basePrice) || basePrice <= 0) return;

  const parsedStep = toFiniteNumberFromNumberish(priceStep);
  const step = parsedStep && parsedStep > 0 ? parsedStep : 1 / 10 ** symbolDigit;
  const baseTicks = Math.round(basePrice / step);
  const nextTicks = baseTicks + direction;
  if (nextTicks <= 0) {
    setLimitPrice('');
    return;
  }

  const nextPrice = nextTicks * step;
  setLimitPrice(nextPrice.toFixed(symbolDigit));
};

export const applyTriggerFieldChange = (
  setter: (value: string) => void,
  text: string,
  triggerType: TriggerType,
  symbolDigit: number,
) => {
  const normalized = normalizeDecimalInput(text);

  if (triggerType === 'pips') {
    if (!/^\d*$/.test(normalized)) return;
    if (normalized.length > 6) return;
    setter(normalized);
    return;
  }

  if (triggerType === 'price') {
    if (!/^\d*\.?\d*$/.test(normalized)) return;
    const integerPart = normalized.split('.')[0] ?? '';
    if (integerPart.length > 6) return;
    const decimals = normalized.split('.')[1] ?? '';
    if (decimals.length > symbolDigit) return;
    setter(normalized);
    return;
  }

  if (!/^\d{0,2}(\.\d{0,4})?$/.test(normalized)) return;

  const n = Number.parseFloat(normalized);
  if (Number.isFinite(n) && n > CHANGE_PERCENT_MAX) return;

  setter(normalized);
};

export const stepTpSlMinus = (
  setValue: (v: string) => void,
  value: string,
  triggerType: TriggerType,
  symbolDigit: number,
  transactionType: 'buy' | 'sell',
  sellPrice: DecimalValue,
  buyPrice: DecimalValue,
) => {
  if (!value) {
    if (triggerType === 'price') {
      const currentPrice = toFiniteNumberFromNumberish(
        transactionType === 'sell' ? sellPrice : buyPrice,
      );
      if (currentPrice != null && currentPrice > 0) {
        setValue(currentPrice.toFixed(symbolDigit));
      }
    } else if (triggerType === 'changePercent') {
      setValue(formatChangePercentNumber(getTriggerInputStep(triggerType, symbolDigit)));
    } else {
      setValue('1');
    }
  } else if (triggerType === 'changePercent') {
    const step = getTriggerInputStep(triggerType, symbolDigit);
    const n = Number.parseFloat(normalizeDecimalInput(value)) || 0;
    const nextN = n - step;
    setValue(formatChangePercentNumber(nextN));
  } else {
    handleDecrement(triggerType, setValue, value, getTriggerInputStep(triggerType, symbolDigit), {
      clearWhenMin: true,
    });
  }
};

export const stepTpSlPlus = (
  setValue: (v: string) => void,
  value: string,
  triggerType: TriggerType,
  symbolDigit: number,
  transactionType: 'buy' | 'sell',
  sellPrice: DecimalValue,
  buyPrice: DecimalValue,
) => {
  if (!value) {
    if (triggerType === 'price') {
      const currentPrice = toFiniteNumberFromNumberish(
        transactionType === 'sell' ? sellPrice : buyPrice,
      );
      if (currentPrice != null && currentPrice > 0) {
        setValue(currentPrice.toFixed(symbolDigit));
      }
    } else if (triggerType === 'changePercent') {
      setValue(formatChangePercentNumber(getTriggerInputStep(triggerType, symbolDigit)));
    } else {
      setValue('1');
    }
  } else if (triggerType === 'changePercent') {
    const step = getTriggerInputStep(triggerType, symbolDigit);
    const n = Number.parseFloat(normalizeDecimalInput(value)) || 0;
    const nextN = n + step;
    setValue(formatChangePercentNumber(nextN));
  } else {
    handleIncrement(triggerType, setValue, value, getTriggerInputStep(triggerType, symbolDigit));
  }
};

export const applyQuantityBlur = (
  value: string,
  setQuantity: (v: string) => void,
  min: number,
  max: number,
  step: number,
) => {
  if (!value) {
    setQuantity(min.toFixed(2));
    return;
  }

  let num = Number.parseFloat(normalizeDecimalInput(value));

  if (!Number.isFinite(num)) {
    return;
  }

  if (num < min) {
    return;
  }

  if (num > max) {
    return;
  }

  num = Math.round(num / step) * step;
  setQuantity(num.toFixed(2));
};

export const applyQuantityChange = (
  value: string,
  setQuantity: (v: string) => void,
  setIsQuantityTouched: (v: boolean) => void,
) => {
  const normalized = normalizeDecimalInput(value);
  if (!/^\d*\.?\d*$/.test(normalized)) return;
  setIsQuantityTouched(true);
  setQuantity(normalized);
};

export const adjustQuantityByDelta = (
  delta: number,
  quantity: string,
  setQuantity: (v: string) => void,
  setIsQuantityTouched: (v: boolean) => void,
  min: number,
  max: number,
  step: number,
) => {
  const current = Number.parseFloat(quantity);
  const base = Number.isFinite(current) ? current : min;
  let next = Math.min(max, Math.max(min, base + delta));
  next = Math.round(next / step) * step;
  setIsQuantityTouched(true);
  setQuantity(next.toFixed(2));
};
