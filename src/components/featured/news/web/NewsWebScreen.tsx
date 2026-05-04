'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import NewsCalendar from './components/NewsCalendar';
import NewsContent from './components/NewsContent';
import NewsStrategy from './components/NewsStrategy';
import { NewsWebHeader } from './components/NewsWebHeader';

type NewsTabId = 'strategy' | 'calendar' | 'news';
const VALID_TABS: NewsTabId[] = ['strategy', 'calendar', 'news'];

export default function NewsWebScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<NewsTabId>('strategy');

  useEffect(() => {
    if (!tabParam) return;
    const normalized = tabParam.toLowerCase() as NewsTabId;
    const matchedTab = VALID_TABS.find((tab) => tab === normalized);
    if (matchedTab) {
      window.setTimeout(() => setActiveTab(matchedTab), 0);
    }
  }, [tabParam]);

  const handleTabChange = (tab: NewsTabId) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`${pathname}?${params.toString()}`);
    window.scrollTo(0, 0);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'strategy':
        return (
          <div className="w-full px-4 py-5 xl:px-6">
            <NewsStrategy />
          </div>
        );
      case 'calendar':
        return (
          <div className="w-full px-4 py-5 xl:px-6">
            <NewsCalendar />
          </div>
        );
      case 'news':
        return (
          <div className="w-full px-4 py-5 xl:px-6">
            <NewsContent />
          </div>
        );
      default:
        return (
          <div className="w-full px-4 py-5 xl:px-6">
            <NewsStrategy />
          </div>
        );
    }
  };

  return (
    <div>
      <div className="bg-white dark:bg-neutral-950">
        <NewsWebHeader
          tabs={[
            { id: 'strategy', label: t('home.strategyTab') },
            { id: 'calendar', label: t('home.calendarTab') },
            { id: 'news', label: t('home.newsTab') },
          ]}
          activeTab={activeTab}
          setActiveTab={(tab) => handleTabChange(tab as NewsTabId)}
        />
        {renderContent()}
      </div>
    </div>
  );
}
