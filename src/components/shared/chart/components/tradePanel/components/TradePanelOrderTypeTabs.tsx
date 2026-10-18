import { TABS } from '../utils/tradePanelUtils';

type Tab = (typeof TABS)[number];

type TradePanelOrderTypeTabsProps = {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  getTabLabel: (tab: Tab) => string;
};

export function TradePanelOrderTypeTabs({
  activeTab,
  onTabChange,
  getTabLabel,
}: TradePanelOrderTypeTabsProps) {
  return (
    <div className="mb-4 px-4">
      <div className="flex gap-2">
        {TABS.map((item) => {
          const isActive = activeTab === item;
          return (
            <button
              key={item}
              type="button"
              className={`flex-1 rounded py-2 text-center ${
                isActive
                  ? 'bg-primary-50 dark:bg-primary-900 text-primary-500 dark:text-primary-200 text-body-large-semibold shadow-sm'
                  : 'text-body-large-regular text-muted-foreground bg-neutral-100 dark:bg-neutral-900'
              }`}
              onClick={() => {
                onTabChange(item);
              }}
            >
              {getTabLabel(item)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

