// 'use client';

// import { useCallback, useEffect, useState } from 'react';
// import { useRouter, useSearchParams } from 'next/navigation';
// import { HomeStrategy } from '../../home/HomeStrategy';
// import HomeCalendar from '../../home/HomeCalendar';
// import { HomeNews } from '../../home/HomeNews';
// import { cn } from '@/lib/utils';

// type DiscoverTabId = 'strategy' | 'calendar' | 'news';
// const VALID_TABS: DiscoverTabId[] = ['strategy', 'calendar', 'news'];

// interface TabConfig {
//   id: DiscoverTabId;
//   label: string;
// }

// const TAB_CONFIGS: TabConfig[] = [
//   { id: 'strategy', label: 'Strategy' },
//   { id: 'calendar', label: 'Calendar' },
//   { id: 'news', label: 'News' },
// ];

// export default function DiscoverAppScreen() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const tabParam = searchParams.get('tab');
//   const [activeTab, setActiveTab] = useState<DiscoverTabId>('strategy');

//   useEffect(() => {
//     if (tabParam) {
//       const normalized = tabParam.toLowerCase() as DiscoverTabId;
//       const matchedTab = VALID_TABS.find((tab) => tab === normalized);
//       if (matchedTab) {
//         window.setTimeout(() => setActiveTab(matchedTab), 0);
//       }
//     }
//   }, [tabParam]);

//   const handleTabChange = useCallback(
//     (tab: DiscoverTabId) => {
//       setActiveTab(tab);
//       const params = new URLSearchParams(searchParams.toString());
//       params.set('tab', tab);
//       router.push(`?${params.toString()}`);
//     },
//     [searchParams, router],
//   );

//   const renderContent = () => {
//     switch (activeTab) {
//       case 'strategy':
//         return (
//           <div className="mt-4 px-4 pb-8">
//             <HomeStrategy />
//           </div>
//         );
//       case 'calendar':
//         return (
//           <div className="mt-4 flex-1 px-4">
//             <HomeCalendar scrollableList />
//           </div>
//         );
//       case 'news':
//         return (
//           <div className="mt-4 flex-1 px-4">
//             <HomeNews scrollableList separateTopicContainer />
//           </div>
//         );
//       default:
//         return (
//           <div className="mt-4 px-4 pb-8">
//             <HomeStrategy />
//           </div>
//         );
//     }
//   };

//   return (
//     <div className="bg-background flex min-h-screen flex-col">
//       {/* Tab Header */}
//       <div className="sticky top-0 z-10 bg-background px-4 pt-4">
//         <div className="flex gap-2">
//           {TAB_CONFIGS.map((tab) => (
//             <button
//               key={tab.id}
//               onClick={() => handleTabChange(tab.id)}
//               className={cn(
//                 'flex-1 py-2 px-3 transition-colors',
//                 activeTab === tab.id
//                   ? 'text-h3-semibold bg-neutral-100 text-foreground'
//                   : 'text-h3-regular hover:bg-muted-foreground/20',
//               )}
//             >
//               {tab.label}
//             </button>
//           ))}
//         </div>
//       </div>

//       {/* Content */}
//       {renderContent()}
//     </div>
//   );
// }
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { NewsHeader } from '../../news/components/NewsHeader';
import { HomeFeed } from '../../home/HomeFeed';
import { HomeNews } from '../../home/HomeNews';
import { CreatePostScreen } from './CreatePostScreen';

type NewsTabId = 'feed' | 'news';
const VALID_TABS: NewsTabId[] = ['feed', 'news'];

export default function NewsAppScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const composerParam = searchParams.get('composer');
  const [activeTab, setActiveTab] = useState<NewsTabId>('feed');

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
      case 'feed':
        return (
          <div className="px-4 pb-4">
            <HomeFeed />
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
          <div className="px-4 pb-4">
            <HomeFeed />
          </div>
        );
    }
  };

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <NewsHeader
        tabs={[
          { id: 'feed', label: t('home.feedTab') },
          { id: 'news', label: t('home.newsTab') },
        ]}
        activeTab={activeTab}
        setActiveTab={(tab) => handleTabChange(tab as NewsTabId)}
      />
      {renderContent()}
      {composerParam === 'create' ? <CreatePostScreen /> : null}
    </div>
  );
}
