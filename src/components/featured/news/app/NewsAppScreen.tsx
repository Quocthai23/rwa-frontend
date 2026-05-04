'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { NewsHeader } from '../components/NewsHeader';
import { HomeStrategy } from '../../home/HomeStrategy';
import HomeCalendar from '../../home/HomeCalendar';
import { HomeNews } from '../../home/HomeNews';

type NewsTabId = 'strategy' | 'calendar' | 'news';
const VALID_TABS: NewsTabId[] = ['strategy', 'calendar', 'news'];

export default function NewsAppScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<NewsTabId>('strategy');

  useEffect(() => {
    if (tabParam) {
      const normalized = tabParam.toLowerCase() as NewsTabId;
      const matchedTab = VALID_TABS.find((tab) => tab === normalized);
      if (matchedTab) {
        window.setTimeout(() => setActiveTab(matchedTab), 0);
      }
    }
  }, [tabParam]);

  const handleTabChange = (tab: NewsTabId) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'strategy':
        return (
          <div className="mt-4 px-4 pb-8">
            <HomeStrategy />
          </div>
        );
      case 'calendar':
        return (
          <div className="mt-4 flex-1 px-4">
            <HomeCalendar scrollableList />
          </div>
        );
      case 'news':
        return (
          <div className="mt-4 flex-1 px-4">
            <HomeNews scrollableList separateTopicContainer />
          </div>
        );
      default:
        return (
          <div className="mt-4 px-4 pb-8">
            <HomeStrategy />
          </div>
        );
    }
  };

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <NewsHeader
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
  );
}
