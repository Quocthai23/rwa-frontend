/* SegmentedPagerTabs.tsx (web) */
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '@/theme';

export type SegmentedTabItem = {
  badge?: number;
  disabled?: boolean;
  key: string;
  render: () => React.ReactNode;
  title: string;
};

type Props = {
  readonly initialIndex?: number;
  readonly tabs: SegmentedTabItem[];

  readonly swipeEnabled?: boolean;

  readonly onIndexChange?: (index: number) => void;

  // style
  readonly containerStyle?: React.CSSProperties;
  readonly contentStyle?: React.CSSProperties;
  readonly indicatorStyle?: React.CSSProperties;
  readonly tabBarStyle?: React.CSSProperties;
  readonly tabTextActiveStyle?: React.CSSProperties;
  readonly tabTextStyle?: React.CSSProperties;

  readonly activeBgColor?: string;
  readonly activeTextColor?: string;
  readonly borderColor?: string;
  readonly inactiveTextColor?: string;
};

export default function SegmentedPagerTabs({
  activeBgColor,
  activeTextColor,
  borderColor,
  containerStyle,

  contentStyle,
  inactiveTextColor,
  indicatorStyle,
  initialIndex = 0,
  onIndexChange,
  swipeEnabled = false,

  tabBarStyle,
  tabs,
  tabTextActiveStyle,
  tabTextStyle,
}: Props) {
  const { colors } = useTheme();
  const activeBgColorResolved = activeBgColor ?? colors.primary500;
  const activeTextColorResolved = activeTextColor ?? colors.neutral0;
  const borderColorResolved = borderColor ?? colors.neutral200;
  const inactiveTextColorResolved = inactiveTextColor ?? colors.neutral700;

  const [activeIndex, setActiveIndex] = useState(() =>
    clamp(initialIndex, 0, Math.max(0, tabs.length - 1)),
  );

  const barRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [barWidth, setBarWidth] = useState(0);

  const itemWidth = useMemo(() => {
    if (!barWidth || tabs.length === 0) return 0;
    return barWidth / tabs.length;
  }, [barWidth, tabs.length]);

  const setIndex = (index: number) => {
    const next = clamp(index, 0, tabs.length - 1);
    if (tabs[next]?.disabled) return;
    setActiveIndex(next);
    onIndexChange?.(next);
  };

  const scrollToIndex = useCallback(
    (index: number) => {
      if (!swipeEnabled) return;
      const el = contentRef.current;
      if (!el) return;
      const w = el.clientWidth;
      el.scrollTo({ left: index * w, behavior: 'smooth' });
    },
    [swipeEnabled],
  );

  useEffect(() => {
    scrollToIndex(activeIndex);
  }, [activeIndex, scrollToIndex]);

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBarWidth(el.clientWidth));
    ro.observe(el);
    setBarWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const onContentScroll = useCallback(() => {
    if (!swipeEnabled) return;
    const el = contentRef.current;
    if (!el) return;
    const w = el.clientWidth;
    if (!w) return;
    const index = Math.round(el.scrollLeft / w);
    if (index !== activeIndex) {
      setActiveIndex(index);
      onIndexChange?.(index);
    }
  }, [activeIndex, onIndexChange, swipeEnabled]);

  if (!tabs?.length) return null;

  return (
    <div style={{ display: 'flex', flex: 1, flexDirection: 'column', ...(containerStyle ?? {}) }}>
      <div
        ref={barRef}
        style={{
          backgroundColor: '#F9FAFB',
          border: `1px solid ${borderColorResolved}`,
          borderRadius: 12,
          display: 'flex',
          height: 44,
          overflow: 'hidden',
          position: 'relative',
          ...(tabBarStyle ?? {}),
        }}
      >
        <div
          style={{
            backgroundColor: activeBgColorResolved,
            bottom: 0,
            left: 0,
            position: 'absolute',
            top: 0,
            transform: `translateX(${activeIndex * itemWidth}px)`,
            transition: 'transform 220ms ease',
            width: itemWidth,
            ...(indicatorStyle ?? {}),
          }}
        />

        {tabs.map((t, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={t.key}
              type="button"
              disabled={t.disabled}
              onClick={() => setIndex(index)}
              style={{
                alignItems: 'center',
                background: 'transparent',
                border: 0,
                cursor: t.disabled ? 'not-allowed' : 'pointer',
                display: 'flex',
                flex: 1,
                justifyContent: 'center',
                padding: 0,
              }}
            >
              <div
                style={{
                  alignItems: 'center',
                  display: 'flex',
                  flexDirection: 'row',
                  gap: 6,
                  padding: '0 8px',
                  whiteSpace: 'nowrap',
                }}
              >
                <span
                  style={{
                    color: isActive ? activeTextColorResolved : inactiveTextColorResolved,
                    fontSize: 13,
                    fontWeight: 700,
                    opacity: t.disabled ? 0.4 : 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    ...(tabTextStyle ?? {}),
                    ...(isActive ? (tabTextActiveStyle ?? {}) : {}),
                  }}
                >
                  {t.title}
                </span>

                {typeof t.badge === 'number' && t.badge > 0 && (
                  <span
                    style={{
                      alignItems: 'center',
                      backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : '#E5E7EB',
                      borderRadius: 9,
                      color: isActive ? '#fff' : '#111827',
                      display: 'inline-flex',
                      fontSize: 11,
                      fontWeight: 700,
                      height: 18,
                      justifyContent: 'center',
                      minWidth: 18,
                      padding: '0 6px',
                    }}
                  >
                    {t.badge > 99 ? '99+' : String(t.badge)}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {swipeEnabled ? (
        <div
          ref={contentRef}
          onScroll={onContentScroll}
          style={{
            display: 'flex',
            flex: 1,
            marginTop: 10,
            overflowX: 'auto',
            overflowY: 'hidden',
            scrollSnapType: 'x mandatory',
            ...(contentStyle ?? {}),
          }}
        >
          {tabs.map((t) => (
            <div key={t.key} style={{ flex: '0 0 100%', scrollSnapAlign: 'start' }}>
              {t.render()}
            </div>
          ))}
        </div>
      ) : (
        <div style={{ flex: 1, marginTop: 10, ...(contentStyle ?? {}) }}>
          {tabs[activeIndex]?.render()}
        </div>
      )}
    </div>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
