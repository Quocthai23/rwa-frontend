'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/shared/atoms/button';
import { cn } from '@/lib/utils';
import type { StrategyResultItem } from '@/types/strategy';
import { usePositionStats } from '@/hook/usePosition';
import { useAccountStore } from '@/store/useAccountStore';
import AnalysisDataSection from './AnalysisDataSection';
import AnalysisTab from './AnalysisTab';
import InfoTab from './InfoTab';
import PositionWebScreen from '../../../position/web/PositionWebScreen';
import { useTheme } from '@/theme';

const ChartCommon = dynamic(() => import('@/components/chart/ChartCommon'), {
  ssr: false,
  loading: () => <div className="bg-muted h-90 w-full animate-pulse" />,
});

type MainTabId = 'chart' | 'strategy' | 'analysis' | 'info';
type PositionPanelTab = 'positions' | 'orders' | 'position-history' | 'order-history';

const MAIN_TAB_IDS: MainTabId[] = ['chart', 'strategy', 'analysis', 'info'];
const POSITION_PANEL_TAB_IDS: PositionPanelTab[] = [
  'positions',
  'orders',
  'position-history',
  'order-history',
];

/** Below this viewport height the positions panel stays collapsed to leave room for the chart. */
const POSITION_PANEL_COLLAPSE_MAX_VIEWPORT_HEIGHT_PX = 790;

type TradeWebMainContentProps = {
  tradeShareCaptureRef: RefObject<HTMLElement | null>;
  isMarketPanelExpanded: boolean;
  setIsMarketPanelExpanded: Dispatch<SetStateAction<boolean>>;
  isOrderPanelExpanded: boolean;
  setIsOrderPanelExpanded: Dispatch<SetStateAction<boolean>>;
  isPositionPanelExpanded: boolean;
  setIsPositionPanelExpanded: Dispatch<SetStateAction<boolean>>;
  toggleAsideLimitMode: () => void;
  isAsideLimitMode: boolean;
  isOneClickEnabled: boolean;
  isAcceptedTerms: boolean;
  onOneClickHeaderPress: () => void;
  currentSymbol: string;
  onSymbolSelect: (symbol: string) => void;
  strategyItem?: StrategyResultItem;
  symbolAssetId?: string;
  openPositionsCount: number;
};

export function TradeWebMainContent({
  tradeShareCaptureRef,
  isMarketPanelExpanded,
  setIsMarketPanelExpanded,
  isOrderPanelExpanded,
  setIsOrderPanelExpanded,
  isPositionPanelExpanded,
  setIsPositionPanelExpanded,
  toggleAsideLimitMode,
  isAsideLimitMode,
  isOneClickEnabled,
  isAcceptedTerms,
  onOneClickHeaderPress,
  currentSymbol,
  onSymbolSelect,
  strategyItem,
  symbolAssetId,
  openPositionsCount,
}: TradeWebMainContentProps) {
  const { t } = useTranslation();
  const [activeMainTab, setActiveMainTab] = useState<MainTabId>('chart');
  const [positionPanelTab, setPositionPanelTab] = useState<PositionPanelTab>('positions');
  const { mode } = useTheme();
  const isDarkMode = mode === 'dark';
  const wasShortViewportRef = useRef(false);

  useEffect(() => {
    const syncViewport = () => {
      const isShort = window.innerHeight <= POSITION_PANEL_COLLAPSE_MAX_VIEWPORT_HEIGHT_PX;
      if (isShort && !wasShortViewportRef.current) {
        setIsPositionPanelExpanded(false);
      }
      if (!isShort && wasShortViewportRef.current) {
        setIsPositionPanelExpanded(true);
      }
      wasShortViewportRef.current = isShort;
    };

    window.addEventListener('resize', syncViewport);
    window.visualViewport?.addEventListener('resize', syncViewport);
    const raf = requestAnimationFrame(syncViewport);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', syncViewport);
      window.visualViewport?.removeEventListener('resize', syncViewport);
    };
  }, []);

  const applyPositionPanelExpanded = useCallback((update: SetStateAction<boolean>) => {
    setIsPositionPanelExpanded((prev) => (typeof update === 'function' ? update(prev) : update));
  }, []);
  const selectedAccount = useAccountStore((state) => state.selectedAccount);
  const accountId = selectedAccount?.id || '';
  const { data: stats } = usePositionStats({ accountId });

  return (
    <main
      ref={tradeShareCaptureRef}
      className="bg-background flex min-h-0 flex-col overflow-hidden"
    >
      <div className="border-border flex items-center justify-between border-b px-4 pt-3 pb-2">
        <div className="flex w-full flex-col items-start gap-2">
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center justify-start gap-2">
              <Button
                type="button"
                variant="white-contained"
                onClick={() => setIsMarketPanelExpanded((prev) => !prev)}
                aria-label={
                  isMarketPanelExpanded
                    ? t('trade.web.mainContent.collapseMarketPanel')
                    : t('trade.web.mainContent.expandMarketPanel')
                }
                title={
                  isMarketPanelExpanded
                    ? t('trade.web.mainContent.collapseMarketPanel')
                    : t('trade.web.mainContent.expandMarketPanel')
                }
                className="text-muted-foreground hover:bg-muted hover:text-foreground rounded p-1 transition-colors"
              >
                <Image
                  src="/web/svg/35962143.svg"
                  alt={t('trade.web.mainContent.toggleMarketPanel')}
                  width={20}
                  height={20}
                  className={cn('rotate-180', !isMarketPanelExpanded && 'rotate-0')}
                />
              </Button>
              <p className="text-body-large-semibold text-foreground">{currentSymbol}</p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="white-contained"
                className="p-0"
                type="button"
                onClick={toggleAsideLimitMode}
                aria-pressed={isAsideLimitMode}
              >
                <Image
                  src={
                    isAsideLimitMode || !isOneClickEnabled
                      ? '/assets/icons/chart/limitOrder.svg'
                      : isDarkMode
                        ? '/icons/Limitorder.svg'
                        : '/assets/icons/chart/Limit-order-disable.svg'
                  }
                  alt={t('trade.a11y.limitOrder')}
                  width={24}
                  height={24}
                />
              </Button>

              <Button
                variant="white-contained"
                className="p-0"
                type="button"
                onClick={onOneClickHeaderPress}
              >
                {isAcceptedTerms && isOneClickEnabled ? (
                  <Image
                    src="/assets/icons/chart/oneClick.svg"
                    alt={t('trade.a11y.oneClickTrading')}
                    width={24}
                    height={24}
                  />
                ) : (
                  <Image
                    src={
                      isDarkMode
                        ? '/icons/One-click.svg'
                        : '/assets/icons/chart/One-Click-disable.svg'
                    }
                    alt={t('trade.a11y.oneClickTrading')}
                    width={24}
                    height={24}
                    className="opacity-70"
                  />
                )}
              </Button>
              <Button
                type="button"
                variant="white-contained"
                onClick={() => setIsOrderPanelExpanded((prev) => !prev)}
                aria-label={
                  isOrderPanelExpanded
                    ? t('trade.web.mainContent.collapseOrderPanel')
                    : t('trade.web.mainContent.expandOrderPanel')
                }
                title={
                  isOrderPanelExpanded
                    ? t('trade.web.mainContent.collapseOrderPanel')
                    : t('trade.web.mainContent.expandOrderPanel')
                }
                className="text-muted-foreground hover:bg-muted hover:text-foreground rounded p-1 transition-colors"
              >
                <Image
                  src="/web/svg/35962143.svg"
                  alt={t('trade.web.mainContent.toggleOrderPanel')}
                  width={20}
                  height={20}
                  className={cn('rotate-180', !isOrderPanelExpanded && 'rotate-0')}
                />
              </Button>
            </div>
          </div>
          <div className="flex gap-4">
            {MAIN_TAB_IDS.map((tabId) => (
              <Button
                key={tabId}
                type="button"
                variant="white-contained"
                className="h-auto bg-transparent p-0 hover:bg-transparent"
                onClick={() => setActiveMainTab(tabId)}
              >
                <p
                  className={` ${activeMainTab === tabId ? 'text-body-large-semibold! text-primary-500' : 'text-body-large-medium! text-muted-foreground'} `}
                >
                  {t(`trade.web.mainTabs.${tabId}`)}
                </p>
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative isolate h-[calc(100%)] min-h-0 flex-1 overflow-hidden">
        <div
          className={cn(
            'bg-background absolute inset-0 flex min-h-0 flex-col',
            activeMainTab === 'chart' ? 'z-1' : 'pointer-events-none invisible z-0 opacity-0',
          )}
          aria-hidden={activeMainTab !== 'chart'}
        >
          <div
            className={cn(
              'bg-background min-h-0 overflow-hidden transition-all duration-300',
              isPositionPanelExpanded ? 'border-border flex-3' : 'h-full border-b-0',
            )}
          >
            <ChartCommon
              isPositionPanelExpanded={isPositionPanelExpanded}
              setSymbol={onSymbolSelect}
              symbol={currentSymbol}
            />
          </div>

          <div
            className={cn(
              'min-h-0 transition-all duration-300',
              isPositionPanelExpanded ? 'flex-2' : 'h-0 overflow-hidden px-0 py-0',
            )}
          >
            <PositionWebScreen
              setIsPositionPanelExpanded={applyPositionPanelExpanded}
              activeTab={positionPanelTab}
              onTabChange={setPositionPanelTab}
            />
          </div>
          {!isPositionPanelExpanded ? (
            <div className="bg-background border-border flex h-10 items-center gap-5 border-t px-4">
              <Button
                type="button"
                variant="white-contained"
                onClick={() => applyPositionPanelExpanded(true)}
                aria-label={t('trade.web.mainContent.expandPositionsPanel')}
                title={t('trade.web.mainContent.expandPositionsPanel')}
                className="text-muted-foreground hover:bg-muted hover:text-foreground rounded transition-colors"
              >
                <Image
                  src="/web/svg/35962143.svg"
                  alt={t('trade.web.mainContent.expandPositionsPanel')}
                  width={20}
                  height={20}
                  className="rotate-270"
                />
              </Button>
              <div className="flex items-center gap-4">
                {POSITION_PANEL_TAB_IDS.map((tabId) => {
                  const getTabLabel = () => {
                    switch (tabId) {
                      case 'positions':
                        return `${t('position.tabs.positions', { defaultValue: 'Positions' })}(${stats?.openPositions ?? openPositionsCount})`;
                      case 'orders':
                        return `${t('position.tabs.orders', { defaultValue: 'Orders' })}(${stats?.openOrders ?? 0})`;
                      case 'position-history':
                        return t('position.tabs.positionHistory', {
                          defaultValue: 'Position History',
                        });
                      default:
                        return t('position.tabs.orderHistory', { defaultValue: 'Order History' });
                    }
                  };

                  return (
                    <Button
                      key={tabId}
                      variant="white-contained"
                      onClick={() => setPositionPanelTab(tabId)}
                      className={cn(
                        'shrink-0 whitespace-nowrap transition-colors',
                        positionPanelTab === tabId
                          ? 'text-primary-500 dark:text-primary-500 text-body-large-medium!'
                          : 'text-body-large-medium! text-muted-foreground hover:text-primary-500',
                      )}
                    >
                      {getTabLabel()}
                    </Button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div
          className={cn(
            'bg-background scrollbar-neutral-slim absolute inset-0 min-h-full overflow-auto px-4 py-3',
            activeMainTab === 'chart' ? 'pointer-events-none invisible z-0 opacity-0' : 'z-2',
          )}
          aria-hidden={activeMainTab === 'chart'}
        >
          {activeMainTab === 'strategy' ? <AnalysisTab strategy={strategyItem} /> : null}
          {activeMainTab === 'analysis' ? <AnalysisDataSection symbol={currentSymbol} /> : null}
          {activeMainTab === 'info' ? <InfoTab assetId={symbolAssetId} /> : null}
        </div>
      </div>
    </main>
  );
}
