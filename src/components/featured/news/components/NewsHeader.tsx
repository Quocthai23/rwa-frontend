'use client';

import { cn } from '@/lib/utils';

type NewsTab = {
  id: string;
  label: string;
};

interface NewsHeaderProps {
  tabs: NewsTab[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function NewsHeader({ tabs, activeTab, setActiveTab }: NewsHeaderProps) {
  return (
    <div className="bg-background pt-safe sticky top-0 z-20 px-5">
      <div className="no-scrollbar mt-2 flex h-16 flex-row items-center overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'text-body-large-semibold mr-2 flex h-9 items-center justify-center rounded px-2 transition-colors',
                isActive && 'bg-card',
              )}
            >
              <span
                className={cn(
                  'text-body-large-semibold transition-colors',
                  isActive
                    ? 'text-body-large-semibold text-foreground'
                    : 'text-body-large-semibold text-muted-foreground',
                )}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
