import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export { generateUUID, isValidUUID } from './uuid';
export { toISOStringWithCorrectDate, toStartOfDayISO, toEndOfDayISO } from './dateUtils';
