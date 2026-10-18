import { Sheet, SheetContent } from '@/components/shared/atoms/sheet';
import { Check } from '@untitledui/icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Fav from './Fav';
import Popular from './Popular';
import AssetListTab from './AssetListTab';
import { useAssetCategories } from '../../../../../hook/useAssets';
import { Button } from '@/components/shared/atoms/button';
import { Skeleton } from '@/components/shared/atoms/skeleton';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';

const STATIC_TABS = [
  { id: 'fav', labelKey: 'market.tabs.fav' },
  { id: 'popular', labelKey: 'market.tabs.popular' },
  { id: 'rental', labelKey: 'market.tabs.rental' },
  { id: 'buyout', labelKey: 'market.tabs.buyout' },
] as const;
const DEFAULT_INDEX = STATIC_TABS.findIndex((tab) => tab.id === 'popular');
type TabLayout = { x: number; width: number };
type AssetCategory = { name: string; code?: string };

const isRealEstateCategory = (category: AssetCategory) => {
  const normalized = `${category.code ?? ''} ${category.name ?? ''}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase();
  return normalized.includes('real estate') || normalized.includes('bat dong san');
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

// Skeleton loader for tabs
const TabHeaderSkeleton = () => (
  <div className="flex items-center">
    <div className="flex flex-1 flex-row items-center justify-between overflow-hidden">
      <div
        className="no-scrollbar flex-1 overflow-x-auto whitespace-nowrap"
        style={{ scrollbarWidth: 'none' }}
      >
        <div className="border-border relative inline-flex w-max flex-row border-b pr-7 dark:border-neutral-800">
          {[...Array(5)].map((_, i) => (
            <div key={`tab-skeleton-${i}`} className="relative px-4 py-2">
              <Skeleton className="h-5 w-16 rounded" />
            </div>
          ))}
        </div>
      </div>
      <div className="px-2">
        <Skeleton className="h-5 w-5 rounded" />
      </div>
    </div>
  </div>
);

export default function MarketTabs() {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const { data: categories } = useAssetCategories();
  const categoryList = useMemo(
    () =>
      Array.isArray(categories)
        ? (categories as AssetCategory[]).filter((category) => !isRealEstateCategory(category))
        : [],
    [categories],
  );

  const tabs = useMemo(
    () => {
      void language;
      return [
        ...STATIC_TABS.map((tab) => ({ id: tab.id, label: t(tab.labelKey) })),
        ...categoryList.map((category) => {
          const key = (category.code ?? category.name ?? '').toString().toLowerCase();
          const label = t(`market.categoryOptions.${key}`, { defaultValue: category.name });
          return { id: category.name, label };
        }),
      ];
    },
    // Important: `t` reference can stay stable across language changes,
    // so we must explicitly include `i18n.language` to refresh tab labels.
    [categoryList, language, t],
  );

  const [activeTab, setActiveTab] = useState<string>(STATIC_TABS[DEFAULT_INDEX].id);
  const [visitedIndexes, setVisitedIndexes] = useState<Set<number>>(() => new Set([DEFAULT_INDEX]));
  const markVisited = useCallback((index: number) => {
    setVisitedIndexes((prev) => {
      if (prev.has(index)) return prev;
      const next = new Set(prev);
      next.add(index);
      return next;
    });
  }, []);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const headerViewportRef = useRef<HTMLDivElement>(null);
  const headerContentRef = useRef<HTMLDivElement>(null);
  const tabButtonRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const [tabLayouts, setTabLayouts] = useState<Record<number, TabLayout>>({});
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const skipHeaderAutoScrollRef = useRef(false);

  const scrollHeaderToCenter = useCallback(
    (index: number, animated = true) => {
      const layout = tabLayouts[index];
      const viewportW = headerViewportRef.current?.clientWidth ?? 0;
      const contentW = headerContentRef.current?.scrollWidth ?? 0;

      if (!layout || !viewportW || !contentW) return;

      const tabCenter = layout.x + layout.width / 2;

      const maxScrollX = Math.max(0, contentW - viewportW);

      const idealX = tabCenter - viewportW / 2;
      const minVisibleX = layout.x + layout.width - viewportW;
      const maxVisibleX = layout.x;

      const lowerBound = clamp(minVisibleX, 0, maxScrollX);
      const upperBound = clamp(maxVisibleX, 0, maxScrollX);

      const targetX = clamp(idealX, lowerBound, upperBound);

      headerScrollRef.current?.scrollTo({
        left: targetX,
        behavior: animated ? 'smooth' : 'auto',
      });
    },
    [tabLayouts],
  );

  const isPressingTabRef = useRef(false);
  const handleTabChange = (tabId: string) => {
    const index = tabs.findIndex((tab) => tab.id === tabId);
    if (index < 0) return;

    isPressingTabRef.current = true;

    setActiveTab(tabId);
    skipHeaderAutoScrollRef.current = true;

    markVisited(index);
    scrollHeaderToCenter(index);

    requestAnimationFrame(() => {
      isPressingTabRef.current = false;
    });
  };

  const measureTabLayouts = useCallback(() => {
    const nextLayouts: Record<number, TabLayout> = {};
    tabs.forEach((__, index) => {
      const el = tabButtonRefs.current[index];
      if (!el) return;

      const computedStyle = window.getComputedStyle(el);
      const marginLeft = Number.parseFloat(computedStyle.marginLeft) || 0;
      const marginRight = Number.parseFloat(computedStyle.marginRight) || 0;

      nextLayouts[index] = {
        x: el.offsetLeft - marginLeft,
        width: el.offsetWidth + marginLeft + marginRight,
      };
    });
    setTabLayouts(nextLayouts);
  }, [tabs]);

  useEffect(() => {
    const id = requestAnimationFrame(measureTabLayouts);
    const handleResize = () => {
      measureTabLayouts();
    };
    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('resize', handleResize);
    };
  }, [measureTabLayouts]);

  const activeIndex = tabs.findIndex((tab) => tab.id === activeTab);
  const resolvedActiveIndex = activeIndex === -1 ? DEFAULT_INDEX : activeIndex;
  const resolvedActiveTabId =
    activeIndex === -1
      ? STATIC_TABS[DEFAULT_INDEX].id
      : (tabs[resolvedActiveIndex]?.id ?? STATIC_TABS[DEFAULT_INDEX].id);

  useEffect(() => {
    if (skipHeaderAutoScrollRef.current) {
      skipHeaderAutoScrollRef.current = false;
      return;
    }
    scrollHeaderToCenter(resolvedActiveIndex, false);
  }, [resolvedActiveIndex, scrollHeaderToCenter]);

  const renderTabContent = (tabId: string) => {
    if (tabId === 'fav') return <Fav />;
    if (tabId === 'popular') return <Popular />;
    if (tabId === 'rental') return <AssetListTab />;
    if (tabId === 'buyout') return <AssetListTab buyoutOnly />;

    const category = categoryList.find((c) => c.name === tabId);
    if (!category)
      return <p className="text-muted-foreground">{t('market.noDataFor', { tab: tabId })}</p>;

    return <AssetListTab categoryCode={category.code} />;
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="px-4 pt-2">
        {categoryList.length > 0 ? (
          <div className="flex items-center">
            <div
              ref={headerViewportRef}
              className="flex flex-1 flex-row items-center justify-between overflow-hidden"
            >
              <div
                ref={headerScrollRef}
                className="no-scrollbar flex-1 overflow-x-auto whitespace-nowrap"
                style={{ scrollbarWidth: 'none' }}
              >
                <div
                  ref={headerContentRef}
                  className="border-border relative inline-flex w-max flex-row border-b pr-7 dark:border-neutral-800"
                >
                  {tabs.map((tab, i) => (
                    <Button
                      variant="white-contained"
                      key={tab.id}
                      ref={(el) => {
                        tabButtonRefs.current[i] = el;
                      }}
                      onClick={() => handleTabChange(tab.id)}
                      className="relative rounded-none px-4 py-2"
                    >
                      <span
                        className={` ${
                          activeTab === tab.id
                            ? 'text-primary-500 text-body-large-semibold'
                            : 'text-body-large-regular text-muted-foreground'
                        }`}
                      >
                        {tab.label}
                      </span>
                      {activeTab === tab.id && (
                        <div className="bg-primary-500 absolute right-0 bottom-0 left-0 h-0.5" />
                      )}
                    </Button>
                  ))}
                </div>
              </div>
              <Button
                variant="white-contained"
                onClick={() => setIsSheetOpen(true)}
                className="px-2 py-2"
              >
                <Image src="/icons/list.svg" alt={t('market.list')} width={21.6} height={21.6} />
              </Button>
            </div>
          </div>
        ) : (
          <TabHeaderSkeleton />
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {tabs.map((tab, index) => {
          if (!visitedIndexes.has(index) && index !== resolvedActiveIndex) return null;

          return (
            <div
              key={tab.id}
              className={`${index === resolvedActiveIndex ? 'flex' : 'hidden'} flex-1 flex-col`}
            >
              <div className="flex-1 overflow-y-auto p-4">{renderTabContent(tab.id)}</div>
            </div>
          );
        })}
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent
          side="bottom"
          className="bg-sheet max-h-[80vh] overflow-y-auto rounded-t-md p-0"
        >
          <TabSelectionContent
            tabs={tabs}
            activeTab={resolvedActiveTabId}
            onTabSelect={(tabId) => {
              handleTabChange(tabId);
              setIsSheetOpen(false);
            }}
            title={t('market.manageGroups')}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

const TabSelectionContent = React.memo(
  ({
    tabs,
    activeTab,
    onTabSelect,
    title,
  }: {
    tabs: Array<{ id: string; label: string }>;
    activeTab: string;
    onTabSelect: (tabId: string) => void;
    title: string;
  }) => {
    return (
      <div className="pt-2">
        <h3 className="text-h3-semibold text-foreground border-b border-neutral-200 px-4 py-4 dark:border-neutral-900">
          {title}
        </h3>

        <div className="mt-2 px-4 pb-4">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => onTabSelect(tab.id)}
                className="mb-1 w-full text-left"
              >
                <div className={`flex flex-row items-center justify-between rounded-xl px-0 py-2`}>
                  <span
                    className={`text-body-large-regular ${
                      isActive ? 'text-primary-500' : 'text-foreground'
                    }`}
                  >
                    {tab.label}
                  </span>
                  {isActive && <Check size={24} className="text-primary-500" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  },
);
TabSelectionContent.displayName = 'TabSelectionContent';
