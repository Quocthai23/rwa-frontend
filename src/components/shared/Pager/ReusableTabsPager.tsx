/* ReusableTabsPager.tsx (web) */
'use client';
/* eslint-disable react-hooks/refs */

import { useMarketSocketStore } from '@/store/marketSocketStore';
import { useTheme } from '@/theme';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type TabLayout = { width: number; x: number };

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export type TabItem = {
  key: string; // unique
  label: string; // text on header
  render: (() => React.ReactNode) | React.ReactNode; // component/render fn
  // optional: override label render
  renderLabel?: (isActive: boolean) => React.ReactNode;
};

type Props = {
  readonly defaultIndex?: number;
  readonly ohlc: { close: number; high: number; low: number; open: number };
  readonly tabs: readonly TabItem[];
  readonly currentSymbol: string;
  // lazy mount
  readonly lazy?: boolean;
  readonly placeholder?: React.ReactNode;

  readonly swipeEnabled?: boolean;

  // style options
  readonly activeColor?: string;
  readonly containerStyle?: React.CSSProperties;
  readonly headerBorderColor?: string;
  readonly inactiveColor?: string;
  readonly underlineColor?: string;

  readonly equalWidth?: boolean;

  // right icon/action in header (list/filter...)
  readonly rightAction?: React.ReactNode;

  // callback
  readonly onIndexChange?: (index: number, tab: TabItem) => void;
};

export default function ReusableTabsPager({
  ohlc,
  currentSymbol,
  activeColor,
  containerStyle,
  defaultIndex = 0,
  equalWidth = false,
  inactiveColor,
  lazy = true,
  onIndexChange,
  placeholder,
  rightAction,
  swipeEnabled = true,
  tabs,
  underlineColor,
}: Props) {
  const { colors } = useTheme();

  const underlineColorResolved = underlineColor ?? colors.primary600;
  const EMPTY_SESSION_STATS = useMemo(() => ({ high: 0, low: 0, open: 0, prevClose: 0 }), []);

  const rawSessionStats = useMarketSocketStore((s) => s.rtBySymbol?.[currentSymbol]?.sessionStats);

  const safeDefaultIndex = useMemo(() => {
    if (tabs.length === 0) return 0;

    return Math.max(0, Math.min(defaultIndex, tabs.length - 1));
  }, [defaultIndex, tabs.length]);

  const [activeIndex, setActiveIndex] = useState(safeDefaultIndex);
  const [activeKey, setActiveKey] = useState(tabs[safeDefaultIndex]?.key);

  // visited logic
  const visitedReference = useRef<Set<number>>(new Set([safeDefaultIndex]));
  const [, force] = useState(0);
  const markVisited = useCallback((index: number) => {
    if (!visitedReference.current.has(index)) {
      visitedReference.current.add(index);
      force((x) => x + 1);
    }
  }, []);

  const headerScrollRef = useRef<HTMLDivElement | null>(null);
  const headerViewportRef = useRef<HTMLDivElement | null>(null);
  const contentScrollRef = useRef<HTMLDivElement | null>(null);

  const tabLayoutsReference = useRef<Record<number, TabLayout>>({});
  const [containerW, setContainerW] = useState(0);

  const underlineX = useMemo(() => {
    return tabLayoutsReference.current[activeIndex]?.x ?? 0;
  }, [activeIndex]);

  const underlineW = useMemo(() => {
    return tabLayoutsReference.current[activeIndex]?.width ?? 0;
  }, [activeIndex]);

  const scrollHeaderToCenter = useCallback((index: number) => {
    const layout = tabLayoutsReference.current[index];
    const viewport = headerViewportRef.current;
    const scroller = headerScrollRef.current;
    if (!layout || !viewport || !scroller) return;

    const viewportW = viewport.clientWidth;
    const contentW = scroller.scrollWidth;
    if (!viewportW || !contentW) return;

    const tabCenter = layout.x + layout.width / 2;
    const maxScrollX = Math.max(0, contentW - viewportW);
    const targetX = clamp(tabCenter - viewportW / 2, 0, maxScrollX);
    scroller.scrollTo({ left: targetX, behavior: 'smooth' });
  }, []);

  const isPressingTabReference = useRef(false);

  const setIndexInternal = useCallback(
    (index: number, fromUserSwipe: boolean) => {
      const tab = tabs[index];
      if (!tab) return;
      setActiveIndex(index);
      setActiveKey(tab.key);
      markVisited(index);
      scrollHeaderToCenter(index);
      onIndexChange?.(index, tab);

      if (!fromUserSwipe) {
        const el = contentScrollRef.current;
        if (el && containerW) {
          el.scrollTo({ left: index * containerW, behavior: 'smooth' });
        }
      }
    },
    [tabs, markVisited, scrollHeaderToCenter, onIndexChange, containerW],
  );

  const handlePressTab = useCallback(
    (index: number) => {
      if (!tabs[index]) return;

      isPressingTabReference.current = true;
      setIndexInternal(index, false);

      requestAnimationFrame(() => {
        isPressingTabReference.current = false;
      });
    },
    [tabs, setIndexInternal],
  );

  const defaultPlaceholder = (
    <div
      style={{
        alignItems: 'center',
        display: 'flex',
        justifyContent: 'center',
        marginTop: 12,
        padding: 12,
      }}
    >
      <div
        className="animate-spin"
        style={{
          width: 20,
          height: 20,
          borderRadius: 9999,
          border: '2px solid rgba(0,0,0,0.15)',
          borderTopColor: 'rgba(0,0,0,0.55)',
        }}
      />
      <div style={{ color: colors.neutral400, marginTop: 8 }}>Loading...</div>
    </div>
  );

  const renderTabContent = (tab: TabItem) => {
    if (typeof tab.render === 'function') return tab.render();

    return tab.render;
  };

  // Track content viewport width for paging.
  useEffect(() => {
    const el = contentScrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerW(el.clientWidth));
    ro.observe(el);
    setContainerW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  if (tabs.length === 0) {
    return <div style={{ flex: 1, ...(containerStyle ?? {}) }} />;
  }

  return (
    <div style={{ display: 'flex', flex: 1, flexDirection: 'column', ...(containerStyle ?? {}) }}>
      {/* Header */}
      <div className="w-full">
        <div className="flex items-center">
          {equalWidth ? (
            // Equal width mode - tabs fill container equally
            <div style={{ flex: 1, position: 'relative' }}>
              <div className="flex flex-row">
                {tabs.map((tab, index) => {
                  const isActive = tab.key === activeKey;

                  return (
                    <button
                      key={tab.key}
                      className={`mx-4 w-full border-b py-2 transition-all duration-200 ${isActive ? 'text-primary-500 text-body-large-semibold border-primary-500' : 'text-body-large-regular text-muted-foreground border-transparent'}`}
                      ref={(el) => {
                        if (!el) return;
                        const r = el.getBoundingClientRect();
                        const parent = el.parentElement?.getBoundingClientRect();
                        if (!parent) return;
                        tabLayoutsReference.current[index] = {
                          width: r.width,
                          x: r.left - parent.left,
                        };
                      }}
                      onClick={() => handlePressTab(index)}
                    >
                      {tab.renderLabel ? tab.renderLabel(isActive) : <span>{tab.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            // Scrollable mode - original behavior
            <div
              ref={headerViewportRef}
              className="w-full flex-1"
              style={{ flex: 1, width: '100%' }}
            >
              <div
                ref={headerScrollRef}
                style={{ overflowX: 'auto', overflowY: 'hidden', padding: '0 16px' }}
              >
                <div
                  className="flex-row"
                  style={{ display: 'flex', position: 'relative', minWidth: '80%' }}
                >
                  {tabs.map((tab, index) => {
                    const isActive = tab.key === activeKey;

                    return (
                      <button
                        key={tab.key}
                        className="py-2"
                        style={{
                          flex: 1,
                          alignItems: 'center',
                          background: 'transparent',
                          border: 0,
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'center',
                          padding: '8px 0',
                        }}
                        ref={(el) => {
                          if (!el) return;
                          const r = el.getBoundingClientRect();
                          const parent = el.parentElement?.getBoundingClientRect();
                          if (!parent) return;
                          tabLayoutsReference.current[index] = {
                            width: r.width,
                            x: r.left - parent.left,
                          };
                          // setLayoutsVersion((v) => v + 1)
                        }}
                        onClick={() => handlePressTab(index)}
                      >
                        {tab.renderLabel ? (
                          tab.renderLabel(isActive)
                        ) : (
                          <span
                            className={`${isActive ? 'text-primary-500 text-body-large-semibold' : 'text-secondary-500 text-body-large-regular'}`}
                          >
                            {tab.label}
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {/* Underline */}
                  <div
                    style={{
                      backgroundColor: underlineColorResolved,
                      bottom: 0,
                      height: 2,
                      position: 'absolute',
                      transform: `translateX(${underlineX}px)`,
                      transition: 'transform 180ms ease, width 180ms ease',
                      width: underlineW,
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {rightAction ? <div style={{ padding: '0 12px' }}>{rightAction}</div> : null}
        </div>
      </div>
      {/* Content */}
      <div
        ref={contentScrollRef}
        onScroll={() => {
          if (!swipeEnabled) return;
          if (isPressingTabReference.current) return;
          const el = contentScrollRef.current;
          if (!el || !containerW) return;
          const index = Math.round(el.scrollLeft / containerW);
          if (tabs[index]) setIndexInternal(index, true);
        }}
        style={{
          display: 'flex',
          flex: 1,
          overflowX: swipeEnabled ? 'auto' : 'hidden',
          overflowY: 'hidden',
          scrollSnapType: swipeEnabled ? 'x mandatory' : undefined,
        }}
      >
        {tabs.map((tab, index) => {
          const shouldRender =
            !lazy || visitedReference.current.has(index) || index === activeIndex;
          return (
            <div
              key={tab.key}
              style={{
                flex: '0 0 100%',
                scrollSnapAlign: 'start',
                width: containerW ? `${containerW}px` : '100%',
              }}
            >
              {shouldRender ? renderTabContent(tab) : (placeholder ?? defaultPlaceholder)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

