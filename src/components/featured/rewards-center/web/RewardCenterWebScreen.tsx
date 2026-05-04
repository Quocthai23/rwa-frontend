'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

import { Button } from '@/components/shared/atoms/button';
import ReferralWebForm from '../components/ReferralWebForm';
import { RewardsCenterContent } from '../components/Reward';
import { cn } from '@/lib/utils';

type RewardCenterTab = 'referral' | 'rewardCenter';

const rewardCenterTabs = [
  { id: 'rewardCenter', label: 'Rewards center' },
  { id: 'referral', label: 'Referral' },
];

export default function RewardCenterWebScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabFromUrl = searchParams.get('tab') as RewardCenterTab;
  const initialTab = rewardCenterTabs.some((t) => t.id === tabFromUrl)
    ? tabFromUrl
    : 'rewardCenter';

  const [activeTab, setActiveTab] = useState<RewardCenterTab>(initialTab);

  useEffect(() => {
    const currentTab = rewardCenterTabs.some((t) => t.id === tabFromUrl)
      ? tabFromUrl
      : 'rewardCenter';
    setActiveTab(currentTab);
  }, [tabFromUrl]);

  const handleTabChange = (tabId: RewardCenterTab) => {
    setActiveTab(tabId);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tabId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="bg-background flex min-h-dvh flex-col">
      <div className="bg-background sticky top-[72px] z-20 border-neutral-200 px-6 dark:border-neutral-800">
        <div className="no-scrollbar flex h-14 flex-row items-center overflow-x-auto">
          {rewardCenterTabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <Button
                key={tab.id}
                type="button"
                variant="white-contained"
                onClick={() => handleTabChange(tab.id as RewardCenterTab)}
                className={cn(
                  'mr-6 flex h-9 items-center justify-center rounded-none text-neutral-500 transition-colors',
                  isActive && 'bg-background text-primary-500 border-b-primary-500 border-b-3',
                )}
              >
                <span
                  className={cn(
                    'transition-colors',
                    isActive
                      ? '!text-body-large-semibold text-primary-500'
                      : '!text-body-large-regular',
                  )}
                >
                  {t(`rewardsCenter.tabs.${tab.id}`, tab.label)}
                </span>
              </Button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {activeTab === 'rewardCenter' ? <RewardsCenterContent /> : <ReferralWebForm />}
      </div>
    </div>
  );
}
