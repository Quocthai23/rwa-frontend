export const DEFAULT_ACCOUNT_LEVERAGE = 100;
export const MAX_ACCOUNT_LEVERAGE = 200;
export const ACCOUNT_LEVERAGE_OPTIONS = [10, 20, 50, 100, 200] as const;

const toPositiveInteger = (value: unknown): number | null => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const normalizeLeverage = (
  preferredLeverage: unknown,
  maxLeverage?: unknown,
  fallbackLeverage = DEFAULT_ACCOUNT_LEVERAGE,
): number => {
  const parsedPreferred = toPositiveInteger(preferredLeverage) ?? fallbackLeverage;
  const parsedMax = toPositiveInteger(maxLeverage) ?? MAX_ACCOUNT_LEVERAGE;
  const leverage = Math.min(parsedPreferred, parsedMax);

  return leverage;
};
