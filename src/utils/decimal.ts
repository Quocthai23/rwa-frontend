import Decimal from 'decimal.js';

export type DecimalInput = Decimal.Value | null | undefined;

export const toDecimal = (value: DecimalInput): Decimal | null => {
  if (value == null) return null;

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    return new Decimal(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      const parsed = new Decimal(trimmed);
      return parsed.isFinite() ? parsed : null;
    } catch {
      return null;
    }
  }

  try {
    const parsed = new Decimal(value);
    return parsed.isFinite() ? parsed : null;
  } catch {
    return null;
  }
};
