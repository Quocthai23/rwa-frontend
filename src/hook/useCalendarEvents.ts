/**
 * Calendar Events React Query Hook
 * Custom hook for fetching calendar events from new API
 */

import { useQuery } from '@tanstack/react-query';

import { CACHE_TIMES } from '@/constants/api';
import { getCalendarEvents } from '@/services/calendarService';
import type { CalendarResponse, GetCalendarEventsRequest } from '@/types/calendar';

export const calendarQueryKeys = {
  all: ['calendar'] as const,
  events: (params?: GetCalendarEventsRequest) =>
    [...calendarQueryKeys.all, 'events', params] as const,
};

export function useCalendarEvents(parameters?: GetCalendarEventsRequest) {
  return useQuery<CalendarResponse>({
    queryFn: () => getCalendarEvents(parameters),
    queryKey: calendarQueryKeys.events(parameters),
    staleTime: CACHE_TIMES.CALENDAR,
  });
}
