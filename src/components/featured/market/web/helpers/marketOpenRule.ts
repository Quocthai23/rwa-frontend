import { CATEGORY_CODE } from '@/constants/category';

const OTC_WEEKEND_DAYS = new Set([0, 6]); // UTC: Sunday (0), Saturday (6)
const OTC_OPEN_CRYPTO_CODES = new Set([
  CATEGORY_CODE.CRYPTO.toLowerCase(),
  'assets-category-crypto',
  'real_estate',
  'real estate',
]);

function normalize(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

export function isOtcWeekend(date: Date = new Date()): boolean {
  return OTC_WEEKEND_DAYS.has(date.getUTCDay());
}

export function isCategoryOpenByOtcRule(
  categoryCode: string | undefined,
  date: Date = new Date(),
): boolean {
  if (!isOtcWeekend(date)) return true;
  return OTC_OPEN_CRYPTO_CODES.has(normalize(categoryCode));
}
