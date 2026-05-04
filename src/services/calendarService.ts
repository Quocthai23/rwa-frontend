import { CALENDAR_ENDPOINTS, COUNTRY_FLAGS } from '@/constants/api';
import type { CalendarResponse, GetCalendarEventsRequest } from '@/types/calendar';

import { apiClient } from './apiClient';

const CURRENCY_TO_COUNTRY: Record<string, string> = {
  USD: 'US',
  EUR: 'EU',
  GBP: 'GB',
  JPY: 'JP',
  CAD: 'CA',
  AUD: 'AU',
  CHF: 'CH',
  CNY: 'CN',
  NZD: 'NZ',
  SGD: 'SG',
  HKD: 'HK',
  KRW: 'KR',
  INR: 'IN',
  MXN: 'MX',
  BRL: 'BR',
  ZAR: 'ZA',
  TRY: 'TR',
  RUB: 'RU',
  NOK: 'NO',
  SEK: 'SE',
  DKK: 'DK',
};

export const getCountryFlag = (codeOrCurrency: string): string => {
  if (!codeOrCurrency) return '🌍';
  const upper = codeOrCurrency.toUpperCase();
  const countryCode = CURRENCY_TO_COUNTRY[upper] ?? upper.slice(0, 2);
  return COUNTRY_FLAGS[countryCode] ?? '🌍';
};

export { COUNTRY_FLAGS as countryFlags } from '@/constants/api';

export const getCalendarEvents = async (
  parameters?: GetCalendarEventsRequest,
): Promise<CalendarResponse> => {
  try {
    const queryParams = new URLSearchParams();

    if (parameters?.take !== undefined) {
      queryParams.append('take', parameters.take.toString());
    }
    if (parameters?.skip !== undefined) {
      queryParams.append('skip', parameters.skip.toString());
    }
    if (parameters?.date) {
      queryParams.append('dates', parameters.date);
    }
    if (parameters?.type) {
      queryParams.append('type', parameters.type);
      queryParams.append('type', parameters.type.toString());
    }

    const response = await fetch(`/api/calendar?${queryParams.toString()}`);

    if (!response.ok) {
      throw new Error('Failed to fetch calendar events');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw error;
  }
};

/**
 * Fetches calendar events from the external API.
 * This function is intended to be used on the server-side (e.g., in API Routes).
 */
export const getCalendarEventsAPI = async (
  parameters?: GetCalendarEventsRequest,
): Promise<CalendarResponse> => {
  try {
    const searchParameters: Record<string, string> = {};
    if (parameters?.take !== undefined) {
      searchParameters.take = parameters.take.toString();
    }
    if (parameters?.skip !== undefined) {
      searchParameters.skip = parameters.skip.toString();
    }
    if (parameters?.date) {
      // The external API expects 'dates'
      searchParameters.dates = parameters.date;
    }
    if (parameters?.type) {
      searchParameters.type = parameters.type;
      searchParameters.type = parameters.type.toString();
    }

    const response = await apiClient.get<CalendarResponse>(
      CALENDAR_ENDPOINTS.LIST,
      searchParameters,
      { skipAuth: true }, // Assuming no auth is needed, similar to news
      true, // haveTotal is true, because the response is { data: [], total: number }
    );
    return response;
  } catch (error) {
    console.error('Error fetching external calendar events:', error);
    throw error;
  }
};
