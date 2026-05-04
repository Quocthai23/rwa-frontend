'use client';

import { useTranslation } from 'react-i18next';

import type { CalendarEventType } from '@/types/calendar';
import { cn } from '@/utils';

interface CalendarSubTabsProps {
  activeSubTab: CalendarEventType;
  onSubTabChange: (subTab: CalendarEventType) => void;
}

export const CalendarSubTabs = ({ activeSubTab, onSubTabChange }: CalendarSubTabsProps) => {
  const { t } = useTranslation();
  const subTabs: Array<{ id: CalendarEventType; label: string }> = [
    { id: 'featured', label: t('home.calendarFeatured') },
    { id: 'data', label: t('home.calendarData') },
    { id: 'event', label: t('home.calendarEvent') },
    { id: 'holiday', label: t('home.calendarHoliday') },
  ];
  return (
    <div
      className="bg-background sticky top-0 z-10 -mx-4 mb-2 overflow-x-auto pb-2"
      style={{ display: 'flex' }}
    >
      <div className="flex flex-row items-center gap-1 px-4">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              onSubTabChange(tab.id);
            }}
            className={cn(
              'typo-body-regular text-muted-foreground cursor-pointer border-b-2 border-transparent px-3 py-1',
              activeSubTab === tab.id
                ? 'typo-body-medium text-primary-500 border-primary-500'
                : 'hover:border-primary-500 transition-colors',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};
