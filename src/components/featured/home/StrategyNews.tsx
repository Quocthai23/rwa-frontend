'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { HomeStrategy } from './HomeStrategy';
import { HomeNews } from './HomeNews';
import HomeCalendar from './HomeCalendar';
import { useTranslation } from 'react-i18next';

export interface StrategyNewsProps {
  scrollableList?: boolean;
}

export default function StrategyNews({ scrollableList = false }: StrategyNewsProps = {}) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<'calendar' | 'news' | 'strategy'>('strategy');

  const tabs = [
    { id: 'strategy', label: t('home.strategyTab') },
    { id: 'calendar', label: t('home.calendarTab') },
    { id: 'news', label: t('home.newsTab') },
  ] as const;

  const isScrollable = scrollableList || pathname?.includes('/discover') || false;

  return (
    <div className="mt-4">
      {/* Tabs */}
      <div className="bg-background pt-safe sticky top-0 z-20 px-4 pb-1">
        <div className="no-scrollscrollbar flex items-center gap-x-3 overflow-x-auto p-2 pb-5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}>
                <span
                  className={`${
                    isActive
                      ? 'text-h3-semibold text-foreground'
                      : 'text-h3-regular text-muted-foreground'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px] px-4">
        {activeTab === 'strategy' && <HomeStrategy scrollableList={isScrollable} />}

        {activeTab === 'calendar' && <HomeCalendar scrollableList={isScrollable} />}

        {activeTab === 'news' && <HomeNews scrollableList={isScrollable} />}
      </div>
    </div>
  );
}

