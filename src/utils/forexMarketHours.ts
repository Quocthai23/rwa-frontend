/**
 * Global spot Forex (OTC) weekly session — **UTC only**.
 *
 * There is a single worldwide schedule: your local clock differs, but the market
 * opens/closes at the same instant everywhere. This uses the common interbank
 * convention (Sun open / Fri close around **21:00 UTC**), not any one country’s timezone.
 *
 * Call sites may treat this as the weekly “market closed” window for **non-crypto**
 * instruments (Forex, metals, indices, etc.); **crypto** is usually excluded (24/7).
 *
 * Not covered here (broker / server must validate):
 * - National or regional bank holidays (vary by currency and country)
 * - Broker maintenance, symbol-specific sessions (exact metal/index hours may differ)
 */
export const FOREX_UTC_WEEKLY_BOUNDARY_HOUR = 21;

export function isForexMarketOpen(date: Date = new Date()): boolean {
  const utcDay = date.getUTCDay();
  const utcHour = date.getUTCHours();
  const h = FOREX_UTC_WEEKLY_BOUNDARY_HOUR;

  if (utcDay === 0 && utcHour < h) return false;
  if (utcDay === 5 && utcHour >= h) return false;
  if (utcDay === 6) return false;

  return true;
}
