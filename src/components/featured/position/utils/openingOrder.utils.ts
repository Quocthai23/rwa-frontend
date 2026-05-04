export const toPositiveNumber = (
  value: string | number | null | undefined,
  fallback: number,
): number => {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value ?? '');
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const toNullablePositiveNumber = (
  value: string | number | null | undefined,
): number | null => {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(value ?? '');
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const toNullableNumber = (value: string | null | undefined): number | null => {
  const parsed = Number.parseFloat(value ?? '');
  return Number.isFinite(parsed) ? parsed : null;
};
