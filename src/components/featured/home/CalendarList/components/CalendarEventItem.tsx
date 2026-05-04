'use client';

import React from 'react';
import { Star01 } from '@untitledui/icons';

import { CountryFlag } from '@/components/shared/CountryFlag';
import { formatTime } from './calendarUtils';
export interface CalendarEventItemProps {
  event: {
    id: string;
    title?: string;
    event?: string;
    date?: string;
    time?: string;
    impact: string;
    currency?: string;
    country?: string;
    countryCode?: string;
    previous?: string | null;
    forecast?: string | null;
    actual?: string | null;
  };
}

const CalendarEventItemComponent = ({ event }: CalendarEventItemProps) => {
  const displayTime = event.time || (event.date ? formatTime(event.date) : '--:--');
  const displayTitle = event.title || event.event || 'Unknown Event';
  const displayCurrency = event.currency || event.countryCode || '';
  const renderValue = (value: string | null | undefined) => {
    if (!value || value.trim() === '') {
      return (
        <span className="text-foreground flex items-center justify-center tracking-widest">
          —·—
        </span>
      );
    }
    return value;
  };
  const renderImpactStars = (impact: string) => {
    const level = (impact || '').toLowerCase();
    const activeStars = level === 'high' ? 3 : level === 'medium' ? 2 : 1;

    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3].map((star) => (
          <Star01
            key={star}
            size={16}
            className={
              star <= activeStars
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground fill-transparent'
            }
          />
        ))}
      </div>
    );
  };

  return (
    <div className="bg-background border-border hover:bg-accent relative w-full cursor-pointer border-b text-left transition-colors">
      <div className="flex flex-row items-center justify-between">
        <div className="flex flex-row items-center gap-2">
          <CountryFlag
            countryCode={event.countryCode || event.currency || event.country || ''}
            className="text-body-large-regular"
          />

          <span className="text-body-large-regular text-foreground">
            {displayCurrency} {displayTime}
          </span>
        </div>

        {renderImpactStars(event.impact)}
      </div>
      <div className="mb-3">
        <p className="text-body-large-medium text-foreground line-clamp-2">{displayTitle}</p>
      </div>

      <div className="flex flex-row items-center justify-between">
        <div className="flex w-1/3 flex-col items-start">
          <span className="text-body-small-regular text-muted-foreground mb-1">Previous</span>
          <span className="text-body-small-semibold text-foreground">
            {renderValue(event.previous)}
          </span>
        </div>
        <div className="flex w-1/3 flex-col items-center text-center">
          <span className="text-body-small-regular text-muted-foreground mb-1">Expected</span>
          <span className="text-body-small-semibold text-foreground">
            {renderValue(event.forecast)}
          </span>
        </div>
        <div className="flex w-1/3 flex-col items-end text-right">
          <span className="text-body-small-regular text-muted-foreground mb-1">Actual</span>
          <span className="text-body-small-semibold text-foreground">
            {renderValue(event.actual)}
          </span>
        </div>
      </div>
    </div>
  );
};

export const CalendarEventItem = React.memo(CalendarEventItemComponent);
