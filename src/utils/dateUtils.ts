/**
 * Date Utilities
 * Common date formatting functions using dayjs
 */

import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

/**
 * Format date to relative time string (e.g., "5 min ago")
 */
export function formatTimeAgo(dateString: string): string {
  return dayjs(dateString).fromNow();
}

/**
 * Format time to 12-hour display format (e.g., "01:00" -> "1:00 AM")
 */
export function formatTimeTo12Hour(time: string): string {
  const parsed = dayjs(`2000-01-01 ${time}`);
  if (!parsed.isValid()) return time;

  return parsed.format('h:mm A');
}

/**
 * Format date to ISO date string (YYYY-MM-DD)
 */
export function toISODateString(date: Date): string {
  return dayjs(date).format('YYYY-MM-DD');
}

/**
 * Convert date to ISO string with correct date (avoiding timezone shift)
 * Returns ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ
 * The time is set to midnight UTC to preserve the date value
 */
export function toISOStringWithCorrectDate(date: Date): string {
  const dateStr = dayjs(date).format('YYYY-MM-DD');
  return `${dateStr}T00:00:00.000Z`;
}

/**
 * Convert date to ISO string at start of day in local timezone
 * Returns ISO 8601 format with time set to 00:00:00 local time
 */
export function toStartOfDayISO(date: Date): string {
  const localDate = new Date(date);
  localDate.setHours(0, 0, 0, 0);
  return localDate.toISOString();
}

/**
 * Convert date to ISO string at end of day in local timezone
 * Returns ISO 8601 format with time set to 23:59:59 local time
 */
export function toEndOfDayISO(date: Date): string {
  const localDate = new Date(date);
  localDate.setHours(23, 59, 59, 999);
  return localDate.toISOString();
}

/**
 * Parse MM-DD string to Date object for current year
 */
export function parseMMDDToDate(mmdd: string): Date {
  const [month, day] = mmdd.split('-').map(Number);

  return dayjs()
    .month(month - 1)
    .date(day)
    .toDate();
}

/**
 * Format date to MM-DD string
 */
export function formatToMMDD(date: Date): string {
  return dayjs(date).format('MM-DD');
}

/**
 * Format date to DD.MM.YYYY HH:mm:ss format
 * Used for position history timestamps
 */
export function formatPositionDateTime(dateString: string): string {
  return new Date(dateString)
    .toLocaleString('en-US', {
      day: '2-digit',
      hour: '2-digit',
      hour12: false,
      minute: '2-digit',
      month: '2-digit',
      second: '2-digit',
      year: 'numeric',
    })
    .replace(/(\d+)\/(\d+)\/(\d+),/, 'VNĐ3.VNĐ1.VNĐ2');
}

