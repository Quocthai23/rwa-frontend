/**
 * Economic Calendar Types
 * Type definitions for economic calendar API
 */

/**
 * Impact level for economic events
 */
export type EventImpact = 'high' | 'low' | 'medium';

/**
 * Economic calendar event
 */
export type EconomicEvent = {
  actual?: string;
  country: string;
  countryCode: string;
  event: string;
  forecast?: string;
  id: string;
  impact: EventImpact;
  previous?: string;
  time: string;
};

/**
 * Economic calendar API response
 */
export type EconomicCalendarResponse = {
  date: string;
  events: EconomicEvent[];
  total: number;
};

/**
 * Calendar Event from new API
 */
export type CalendarEvent = {
  actual: string | null;
  currency: string;
  date: string;
  forecast: string;
  id: string;
  impact: string;
  previous: string;
  title: string;
};

export type CalendarResponse = {
  data: CalendarEvent[];
  total: number;
};

/**
 * Calendar event type filter
 */
export type CalendarEventType = 'featured' | 'data' | 'event' | 'holiday';

/**
 * Get calendar events request parameters
 */
export type GetCalendarEventsRequest = {
  date?: string;
  skip?: number;
  take?: number;
  type?: CalendarEventType;
};
