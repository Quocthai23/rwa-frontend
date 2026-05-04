'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Textarea } from '@/components/shared/atoms/textarea';
import { useGetData } from '@/context/GetdataContext';
import { cn } from '@/lib/utils';

function getTextareaCaretCoordinates(textarea: HTMLTextAreaElement, position: number) {
  const style = window.getComputedStyle(textarea);
  const mirror = document.createElement('div');
  mirror.style.position = 'absolute';
  mirror.style.visibility = 'hidden';
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.wordBreak = 'break-word';
  mirror.style.overflowWrap = 'break-word';
  mirror.style.boxSizing = style.boxSizing;
  mirror.style.width = `${textarea.clientWidth}px`;
  mirror.style.fontFamily = style.fontFamily;
  mirror.style.fontSize = style.fontSize;
  mirror.style.fontWeight = style.fontWeight;
  mirror.style.fontStyle = style.fontStyle;
  mirror.style.letterSpacing = style.letterSpacing;
  mirror.style.lineHeight = style.lineHeight;
  mirror.style.padding = style.padding;
  mirror.style.border = style.border;
  mirror.style.textTransform = style.textTransform;
  mirror.style.textIndent = style.textIndent;

  const before = textarea.value.slice(0, position);
  mirror.textContent = before;

  const marker = document.createElement('span');
  marker.textContent = '\u200b';
  mirror.append(marker);
  document.body.append(mirror);

  const top = marker.offsetTop - textarea.scrollTop;
  const left = marker.offsetLeft - textarea.scrollLeft;
  mirror.remove();

  return { left, top };
}

export type DiscoverInlineHashTextareaProps = {
  className?: string;
  onChange: (value: string) => void;
  /** Optional: e.g. composer records linked asset when user picks from # menu */
  onLinkedAssetPicked?: (assetId: string, symbol: string) => void;
  placeholder?: string;
  value: string;
};

export const DiscoverInlineHashTextarea = forwardRef<
  HTMLTextAreaElement,
  DiscoverInlineHashTextareaProps
>(function DiscoverInlineHashTextarea(
  { value, onChange, placeholder, className, onLinkedAssetPicked },
  forwardedRef,
) {
  const { t } = useTranslation();
  const { assets, isLoadingAssets } = useGetData();
  const internalRef = useRef<HTMLTextAreaElement | null>(null);

  const setTextareaRef = useCallback(
    (node: HTMLTextAreaElement | null) => {
      internalRef.current = node;
      if (typeof forwardedRef === 'function') {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    },
    [forwardedRef],
  );

  const [cursor, setCursor] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [menuPosition, setMenuPosition] = useState<{ left: number; top: number } | null>(null);
  const [activeAssetIndex, setActiveAssetIndex] = useState(0);
  const assetButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const wasMenuOpenRef = useRef(false);

  const inlineHashContext = useMemo(() => {
    const safeCursor = Math.min(Math.max(cursor, 0), value.length);
    const beforeCursor = value.slice(0, safeCursor);
    const hashStart = beforeCursor.lastIndexOf('#');
    if (hashStart < 0) {
      return null;
    }
    if (hashStart > 0 && /\S/.test(beforeCursor[hashStart - 1])) {
      return null;
    }
    const query = beforeCursor.slice(hashStart + 1);
    if (/[#\s]/.test(query)) {
      return null;
    }
    return { hashStart, query };
  }, [value, cursor]);

  const inlineHashAssets = useMemo(() => {
    if (!inlineHashContext) {
      return [];
    }
    const q = inlineHashContext.query.trim().toLowerCase();
    const list = assets?.filter((asset) => asset.isActive) ?? [];
    return list.filter((asset) => {
      const symbol = asset.symbol.toLowerCase();
      const name = asset.name.toLowerCase();
      return !q || symbol.includes(q) || name.includes(q);
    });
  }, [assets, inlineHashContext]);

  useEffect(() => {
    if (!inlineHashContext || inlineHashAssets.length === 0) {
      wasMenuOpenRef.current = false;
      setActiveAssetIndex(0);
      return;
    }

    if (!wasMenuOpenRef.current) {
      wasMenuOpenRef.current = true;
      setActiveAssetIndex(0);
      requestAnimationFrame(() => {
        assetButtonRefs.current[0]?.focus();
      });
    }
  }, [inlineHashAssets.length, inlineHashContext]);

  useEffect(() => {
    if (!inlineHashContext || inlineHashAssets.length === 0) {
      return;
    }
    assetButtonRefs.current[activeAssetIndex]?.focus();
  }, [activeAssetIndex, inlineHashAssets.length, inlineHashContext]);

  useLayoutEffect(() => {
    if (!inlineHashContext || !internalRef.current) {
      setMenuPosition(null);
      return;
    }

    const textarea = internalRef.current;
    const lineHeight = Number.parseFloat(window.getComputedStyle(textarea).lineHeight) || 20;
    const hashCoordinates = getTextareaCaretCoordinates(textarea, inlineHashContext.hashStart + 1);
    const left = Math.max(8, Math.min(hashCoordinates.left, textarea.clientWidth - 240));
    const top = Math.max(0, hashCoordinates.top + lineHeight + 6);

    setMenuPosition({ left, top });
  }, [value, scrollTop, inlineHashContext]);

  const handleSelectAsset = (assetId: string, symbol: string) => {
    if (!inlineHashContext) {
      return;
    }

    const safeCursor = Math.min(Math.max(cursor, 0), value.length);
    const before = value.slice(0, inlineHashContext.hashStart);
    const after = value.slice(safeCursor);
    const insertion = `#${symbol} `;
    const nextValue = `${before}${insertion}${after}`;
    const nextCursor = before.length + insertion.length;

    onChange(nextValue);
    onLinkedAssetPicked?.(assetId, symbol);
    setCursor(nextCursor);

    requestAnimationFrame(() => {
      const el = internalRef.current;
      if (!el) {
        return;
      }
      el.focus();
      el.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const handleAssetKeyNavigation = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
    assetId: string,
    symbol: string,
  ) => {
    if (inlineHashAssets.length === 0) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveAssetIndex((index + 1) % inlineHashAssets.length);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveAssetIndex((index - 1 + inlineHashAssets.length) % inlineHashAssets.length);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      setActiveAssetIndex(0);
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      setActiveAssetIndex(inlineHashAssets.length - 1);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      handleSelectAsset(assetId, symbol);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      internalRef.current?.focus();
      return;
    }

    // Keep editing fluid even when menu item has focus.
    if (event.key === 'Backspace') {
      event.preventDefault();
      const nextCursor = Math.max(0, cursor - 1);
      const nextValue = `${value.slice(0, nextCursor)}${value.slice(cursor)}`;
      onChange(nextValue);
      setCursor(nextCursor);
      requestAnimationFrame(() => {
        const el = internalRef.current;
        if (!el) {
          return;
        }
        el.focus();
        el.setSelectionRange(nextCursor, nextCursor);
      });
      return;
    }

    if (event.key === 'Delete') {
      event.preventDefault();
      const nextValue = `${value.slice(0, cursor)}${value.slice(cursor + 1)}`;
      onChange(nextValue);
      requestAnimationFrame(() => {
        const el = internalRef.current;
        if (!el) {
          return;
        }
        el.focus();
        el.setSelectionRange(cursor, cursor);
      });
      return;
    }

    if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      const insertion = event.key;
      const nextValue = `${value.slice(0, cursor)}${insertion}${value.slice(cursor)}`;
      const nextCursor = cursor + insertion.length;
      onChange(nextValue);
      setCursor(nextCursor);
      requestAnimationFrame(() => {
        const el = internalRef.current;
        if (!el) {
          return;
        }
        el.focus();
        el.setSelectionRange(nextCursor, nextCursor);
      });
    }
  };

  return (
    <div className="relative">
      <Textarea
        ref={setTextareaRef}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setCursor(event.target.selectionStart ?? event.target.value.length);
        }}
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
        onClick={(event) => setCursor(event.currentTarget.selectionStart ?? 0)}
        onKeyUp={(event) => setCursor(event.currentTarget.selectionStart ?? 0)}
        placeholder={placeholder}
        className={cn('whitespace-pre-wrap', className)}
      />

      {inlineHashContext ? (
        <div
          className="border-border bg-background absolute z-40 max-h-32 w-[min(100%,260px)] overflow-y-auto rounded border p-1 shadow-md"
          style={{
            left: menuPosition ? `${menuPosition.left}px` : '0px',
            top: menuPosition ? `${menuPosition.top}px` : 'calc(100% + 4px)',
          }}
        >
          {isLoadingAssets ? (
            <p className="text-muted-foreground px-2 py-2 text-sm">
              {t('discover.web.loadingAssets', 'Loading assets...')}
            </p>
          ) : inlineHashAssets.length === 0 ? (
            <p className="text-muted-foreground px-2 py-2 text-sm">
              {t('discover.web.noAssetsFound', 'No assets found.')}
            </p>
          ) : (
            inlineHashAssets.map((asset, index) => (
              <button
                key={asset.id}
                type="button"
                ref={(node) => {
                  assetButtonRefs.current = assetButtonRefs.current.slice(
                    0,
                    inlineHashAssets.length,
                  );
                  assetButtonRefs.current[index] = node;
                }}
                className="hover:bg-muted focus:bg-muted flex w-full items-center justify-between rounded px-2 py-1.5 text-left outline-none"
                onMouseDown={(event) => {
                  event.preventDefault();
                  handleSelectAsset(asset.id, asset.symbol);
                }}
                onFocus={() => setActiveAssetIndex(index)}
                onKeyDown={(event) =>
                  handleAssetKeyNavigation(event, index, asset.id, asset.symbol)
                }
              >
                <span className="text-foreground text-sm font-medium">#{asset.symbol}</span>
                <span className="text-muted-foreground max-w-40 truncate text-xs">
                  {asset.name}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
});
