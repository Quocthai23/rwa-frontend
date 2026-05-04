'use client';

import { Star01 } from '@untitledui/icons';
import { useTranslation } from 'react-i18next';

import { CountryFlag } from '@/components/shared/CountryFlag';
import { cn } from '@/utils';
import { formatTime } from '@/components/featured/home/CalendarList/components/calendarUtils';

type NewsCalendarEventItemProps = {
  event: {
    id: string;
    title?: string;
    date?: string;
    time?: string;
    impact?: string;
    currency?: string;
    country?: string;
    countryCode?: string;
    previous?: string | null;
    forecast?: string | null;
    actual?: string | null;
  };
};

const FALLBACK_VALUE = '---';

const impactCount = (impact?: string) => {
  const level = (impact || '').toLowerCase();
  if (level === 'high') return 3;
  if (level === 'medium') return 2;
  return 1;
};

const renderMetric = (label: string, value: string | null | undefined) => {
  const displayValue = value && value.trim() ? value : FALLBACK_VALUE;

  return (
    <div className="flex w-full flex-col items-start text-left md:flex-row md:items-center md:justify-start md:gap-2 md:text-left">
      <p className="text-body-small-regular text-muted-foreground">{label}</p>
      <p className="text-body-small-semibold text-foreground">{displayValue}</p>
    </div>
  );
};

export default function NewsCalendarEventItem({ event }: NewsCalendarEventItemProps) {
  const { t } = useTranslation();

  const displayTime = event.time || (event.date ? formatTime(event.date) : '--:--');
  const displayTitle = event.title || 'Unknown Event';
  const displayCurrency = event.currency || event.countryCode || '';
  const displayCountryCode = event.countryCode || event.currency || event.country || '';
  const activeStars = impactCount(event.impact);

  return (
    <article className="border-border/70 border-b py-3 last:border-b-0">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_222px_222px_222px] md:items-center md:gap-4">
        <div className="min-w-0">
          <div className="text-body-large-regular text-muted-foreground mb-1 flex items-center gap-2">
            <CountryFlag countryCode={displayCountryCode} className="text-body-large-regular" />
            <span className="whitespace-nowrap">
              {displayCurrency} {displayTime}
            </span>
            <div className="ml-1 flex items-center gap-0.5">
              {[1, 2, 3].map((star) => (
                <Star01
                  key={star}
                  size={14}
                  className={cn(
                    star <= activeStars
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground fill-transparent',
                  )}
                />
              ))}
            </div>
          </div>

          <p className="text-body-large-medium text-foreground line-clamp-2 leading-5">
            {displayTitle}
          </p>
        </div>
        <div className="hidden md:block">
          {renderMetric(t('common.pagination.previous'), event.previous)}
        </div>
        <div className="hidden md:block">
          {renderMetric(t('home.expected', { defaultValue: 'Expected' }), event.forecast)}
        </div>
        <div className="hidden md:block">
          {renderMetric(t('home.actual', { defaultValue: 'Actual' }), event.actual)}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2 md:hidden">
        {renderMetric(t('common.pagination.previous'), event.previous)}
        {renderMetric(t('home.expected', { defaultValue: 'Expected' }), event.forecast)}
        {renderMetric(t('home.actual', { defaultValue: 'Actual' }), event.actual)}
      </div>
    </article>
  );
}
