'use client';

import { Button } from '@/components/shared/atoms/button';
import { cn } from '@/lib/utils';

type NewsTab = {
  id: string;
  label: string;
};

type NewsWebHeaderProps = {
  tabs: NewsTab[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
};

export function NewsWebHeader({ tabs, activeTab, setActiveTab }: NewsWebHeaderProps) {
  return (
    <div className="bg-background sticky top-[72px] z-20 border-b border-neutral-200 px-6 dark:border-neutral-800">
      <div className="no-scrollbar flex h-14 flex-row items-center overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Button
              key={tab.id}
              type="button"
              variant="white-contained"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'mr-4 flex h-9 items-center justify-center rounded px-3 transition-colors',
                isActive && 'dark:bg-card dark:text-primary-500 bg-background text-primary-500',
              )}
            >
              <span
                className={cn(
                  'transition-colors',
                  isActive ? 'text-h3-semibold' : 'text-h3-regular',
                )}
              >
                {tab.label}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
