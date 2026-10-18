'use client';

import { Image03, CurrencyDollarCircle, X } from '@untitledui/icons';
import EmojiPicker, { Theme, type EmojiClickData } from 'emoji-picker-react';
import {
  type ChangeEvent,
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import { Button } from '@/components/shared/atoms/button';
import { Editor, type EditorHandle } from '@/components/shared/atoms/editor';
import { useGetData } from '@/context/GetdataContext';
import { useSymbols } from '@/hook/useSymbols';
import { useMarketSocketStore } from '@/store/marketSocketStore';
import { useTheme } from '@/theme';
import type { ComposerImage, ComposerLinkedAsset } from '../types';
import { DiscoverAssetSelectorContent } from '../../../../shared/DiscoverAssetSelectorContent';

type CreatePostComposerProps = {
  canPost: boolean;
  composerImages: ComposerImage[];
  composerLinkedAssets: ComposerLinkedAsset[];
  composerText: string;
  currentUserName: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  isPosting: boolean;
  isUploadingImages: boolean;
  onComposerImageChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onComposerTextChange: (value: string) => void;
  onCreatePost: () => void;
  onLinkedAssetPicked?: (assetId: string, symbol: string) => void;
  onToggleComposerAsset: (asset: ComposerLinkedAsset) => void;
  onRemoveComposerImage: (imageId: string) => void;
  onRemoveComposerAsset: (assetId: string) => void;
  textareaRef: RefObject<EditorHandle | null>;
  userAvatar: string;
  variant?: 'inline' | 'modal';
};

export function CreatePostComposer({
  canPost,
  composerImages,
  composerLinkedAssets,
  composerText,
  currentUserName,
  fileInputRef,
  isPosting,
  isUploadingImages,
  onComposerImageChange,
  onComposerTextChange,
  onCreatePost,
  onToggleComposerAsset,
  onRemoveComposerImage,
  onRemoveComposerAsset,
  textareaRef,
  userAvatar,
  variant = 'inline',
}: CreatePostComposerProps) {
  const { t } = useTranslation();
  const { assets } = useGetData();
  const rtBySymbol = useMarketSocketStore((state) => state.rtBySymbol);
  const { mode } = useTheme();
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isAssetPickerOpen, setIsAssetPickerOpen] = useState(false);
  const [assetSearchText, setAssetSearchText] = useState('');
  const [emojiPopoverStyle, setEmojiPopoverStyle] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const [assetPopoverStyle, setAssetPopoverStyle] = useState<{
    left: number;
    maxHeight: number;
    top: number;
    width: number;
  } | null>(null);
  const emojiPickerContainerRef = useRef<HTMLDivElement | null>(null);
  const assetPickerContainerRef = useRef<HTMLDivElement | null>(null);
  const emojiPopoverRef = useRef<HTMLDivElement | null>(null);
  const assetPopoverRef = useRef<HTMLDivElement | null>(null);
  const emojiTriggerButtonRef = useRef<HTMLButtonElement | null>(null);
  const assetTriggerButtonRef = useRef<HTMLButtonElement | null>(null);
  const emojiPickerTheme = mode === 'dark' ? Theme.DARK : Theme.LIGHT;
  const composerLinkedAssetIdSet = useMemo(
    () => new Set(composerLinkedAssets.map((asset) => asset.id)),
    [composerLinkedAssets],
  );
  const filteredAssets = useMemo(() => {
    const query = assetSearchText.trim().toLowerCase();
    const activeAssets = (assets ?? []).filter((asset) => asset.isActive);
    if (!query) {
      return activeAssets.slice(0, 50);
    }

    return activeAssets
      .filter((asset) => {
        const symbol = (asset.symbol || '').toLowerCase();
        const name = (asset.name || '').toLowerCase();
        return symbol.includes(query) || name.includes(query);
      })
      .slice(0, 50);
  }, [assetSearchText, assets]);
  const symbolsToSubscribe = useMemo(
    () => filteredAssets.map((asset) => asset.symbol).filter(Boolean),
    [filteredAssets],
  );
  useSymbols(symbolsToSubscribe, isAssetPickerOpen && symbolsToSubscribe.length > 0);

  useLayoutEffect(() => {
    if (!isAssetPickerOpen) {
      return;
    }

    const updateAssetPopoverPosition = () => {
      const trigger = assetTriggerButtonRef.current;
      if (!trigger) {
        return;
      }

      const rect = trigger.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const edgePadding = 12;
      const gap = 8;
      const width = Math.min(480, Math.max(280, viewportWidth - edgePadding * 2));
      const left = Math.max(edgePadding, Math.min(rect.left, viewportWidth - width - edgePadding));
      const availableBelow = viewportHeight - rect.bottom - gap - edgePadding;
      const availableAbove = rect.top - gap - edgePadding;
      const openUp = availableBelow < 220 && availableAbove > availableBelow;
      const maxHeight = Math.max(180, Math.min(420, openUp ? availableAbove : availableBelow));
      const preferredVisibleHeight = 250;
      const top = openUp
        ? Math.max(edgePadding, rect.top - gap - Math.min(preferredVisibleHeight, maxHeight))
        : Math.max(edgePadding, rect.bottom + gap);

      setAssetPopoverStyle({ left, maxHeight, top, width });
    };

    updateAssetPopoverPosition();
    window.addEventListener('resize', updateAssetPopoverPosition);
    window.addEventListener('scroll', updateAssetPopoverPosition, true);

    return () => {
      window.removeEventListener('resize', updateAssetPopoverPosition);
      window.removeEventListener('scroll', updateAssetPopoverPosition, true);
    };
  }, [isAssetPickerOpen]);

  useLayoutEffect(() => {
    if (!isEmojiPickerOpen) {
      return;
    }

    const updateEmojiPopoverPosition = () => {
      const trigger = emojiTriggerButtonRef.current;
      if (!trigger) {
        return;
      }

      const rect = trigger.getBoundingClientRect();
      const pickerWidth = 300;
      const pickerHeight = 300;
      const edgePadding = 12;
      const gap = 8;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const left = Math.max(
        edgePadding,
        Math.min(rect.left, viewportWidth - pickerWidth - edgePadding),
      );
      const openUp = rect.bottom + gap + pickerHeight > viewportHeight - edgePadding;
      const top = openUp
        ? Math.max(edgePadding, rect.top - gap - pickerHeight)
        : Math.max(edgePadding, rect.bottom + gap);

      setEmojiPopoverStyle({ left, top });
    };

    updateEmojiPopoverPosition();
    window.addEventListener('resize', updateEmojiPopoverPosition);
    window.addEventListener('scroll', updateEmojiPopoverPosition, true);

    return () => {
      window.removeEventListener('resize', updateEmojiPopoverPosition);
      window.removeEventListener('scroll', updateEmojiPopoverPosition, true);
    };
  }, [isEmojiPickerOpen]);

  const handleInsertEmoji = useCallback(
    (emoji: string) => {
      const editorHandle = textareaRef.current;
      if (!editorHandle) {
        onComposerTextChange(`${composerText}${emoji}`);
        return;
      }

      editorHandle.insertTextAtCursor(emoji);
    },
    [composerText, onComposerTextChange, textareaRef],
  );
  const handleEmojiSelect = useCallback(
    (emojiData: EmojiClickData) => {
      handleInsertEmoji(emojiData.emoji);
    },
    [handleInsertEmoji],
  );

  useEffect(() => {
    if (!isEmojiPickerOpen && !isAssetPickerOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const targetNode = event.target as Node;
      if (
        isEmojiPickerOpen &&
        !emojiPickerContainerRef.current?.contains(targetNode) &&
        !emojiPopoverRef.current?.contains(targetNode) &&
        !emojiTriggerButtonRef.current?.contains(targetNode)
      ) {
        setIsEmojiPickerOpen(false);
      }

      if (
        isAssetPickerOpen &&
        !assetPickerContainerRef.current?.contains(targetNode) &&
        !assetPopoverRef.current?.contains(targetNode) &&
        !assetTriggerButtonRef.current?.contains(targetNode)
      ) {
        setIsAssetPickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAssetPickerOpen, isEmojiPickerOpen]);
  const textareaClassName =
    variant === 'modal'
      ? 'caret-foreground scrollbar-neutral-slim bg-background placeholder:text-muted-foreground text-foreground inset-0 min-h-0 max-h-60 w-full resize-none overflow-y-auto rounded border-none border-transparent text-base shadow-none outline-none focus-visible:border-transparent focus-visible:shadow-none focus-visible:ring-0 focus-visible:ring-transparent'
      : 'caret-foreground placeholder:text-muted-foreground bg-background! text-foreground inset-0 min-h-0 w-full resize-none overflow-y-auto rounded border-none border-transparent text-base shadow-none outline-none focus-visible:border-transparent focus-visible:shadow-none focus-visible:ring-0 focus-visible:ring-transparent';
  const imageGridClassName =
    variant === 'modal'
      ? 'mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4'
      : 'mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4';
  const actionRowClassName =
    variant === 'modal'
      ? 'mt-auto flex flex-wrap items-center justify-between gap-2 pt-3 '
      : 'mt-2 flex flex-wrap items-center justify-between gap-3';
  const actionToolsClassName =
    variant === 'modal'
      ? 'flex items-center gap-1 relative left-[-55px]'
      : 'flex items-center gap-1 ';
  const toolButtonClassName =
    'hover:bg-primary-500/12 flex h-8 w-8 items-center justify-center rounded bg-transparent p-0';
  const emojiPopoverClassName =
    'absolute top-0 rounded border border-neutral-200 bg-background shadow-lg dark:border-neutral-700';
  const assetPopoverClassName =
    variant === 'modal'
      ? 'w-[min(30rem,calc(100vw-3rem))] rounded border border-neutral-200 bg-background p-2 shadow-lg dark:border-neutral-700'
      : 'w-[30rem] rounded border border-neutral-200 bg-background p-2 shadow-lg dark:border-neutral-700';

  return (
    <>
      <div
        className={
          variant === 'modal'
            ? 'flex h-full items-start gap-3 px-1 py-1'
            : 'border-border flex items-start gap-2 border-b px-4 pb-3'
        }
      >
        <Image
          width={40}
          height={40}
          src={userAvatar}
          alt={currentUserName}
          className="bg-muted h-10 w-10 rounded-full object-cover"
        />

        <div
          className={variant === 'modal' ? 'flex h-full min-h-[20vh] flex-1 flex-col' : 'flex-1'}
        >
          <div className="mt-1">
            <Editor
              ref={textareaRef}
              value={composerText}
              onChange={onComposerTextChange}
              placeholder={t('discover.web.shareInsights', 'Share your insights')}
              className={textareaClassName}
            />
          </div>

          {composerLinkedAssets.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {composerLinkedAssets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => onRemoveComposerAsset(asset.id)}
                  className="bg-muted text-foreground inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs"
                  aria-label={t('discover.web.removeTaggedAsset', 'Remove tagged asset')}
                >
                  <span>#{asset.symbol}</span>
                  <X className="size-3" />
                </button>
              ))}
            </div>
          ) : null}

          {composerImages.length > 0 ? (
            <div className={imageGridClassName}>
              {composerImages.map((image) => (
                <div key={image.id} className="bg-muted relative h-24 overflow-hidden rounded-lg">
                  <Image src={image.previewUrl} alt={image.id} fill className="object-cover" />
                  {image.status === 'uploading' ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                      <span className="text-xs font-medium text-white">
                        {t('discover.web.uploadingImage', 'Uploading...')}
                      </span>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onRemoveComposerImage(image.id)}
                    className="bg-background/90 hover:bg-background absolute top-1 right-1 rounded-full p-1"
                    aria-label={t('common.remove', 'Remove')}
                    disabled={image.status === 'uploading'}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <div className={actionRowClassName}>
            <div className={actionToolsClassName}>
              <div ref={assetPickerContainerRef} className="relative">
                <Button
                  ref={assetTriggerButtonRef}
                  type="button"
                  variant="white-contained"
                  className={toolButtonClassName}
                  onClick={() => {
                    setIsAssetPickerOpen((prev) => !prev);
                    setIsEmojiPickerOpen(false);
                  }}
                  aria-label={t('discover.web.tagAssets', 'Tag assets')}
                >
                  <CurrencyDollarCircle aria-hidden className="text-primary-500 size-4" />
                </Button>
                {isAssetPickerOpen && assetPopoverStyle && typeof document !== 'undefined'
                  ? createPortal(
                      <div
                        ref={assetPopoverRef}
                        className={assetPopoverClassName}
                        style={{
                          left: assetPopoverStyle.left,
                          maxHeight: assetPopoverStyle.maxHeight,
                          overflowY: 'auto',
                          position: 'fixed',
                          top: assetPopoverStyle.top,
                          width: assetPopoverStyle.width,
                          zIndex: 1200,
                        }}
                      >
                        <DiscoverAssetSelectorContent
                          assetSearchText={assetSearchText}
                          onAssetSearchTextChange={setAssetSearchText}
                          filteredAssets={filteredAssets}
                          linkedAssetIdSet={composerLinkedAssetIdSet}
                          onToggleLinkedAsset={onToggleComposerAsset}
                          rtBySymbol={rtBySymbol}
                          disabled={isUploadingImages}
                        />
                      </div>,
                      document.body,
                    )
                  : null}
              </div>

              <Button
                type="button"
                variant="white-contained"
                className={toolButtonClassName}
                onClick={() => fileInputRef.current?.click()}
                aria-label={t('discover.web.addImage', 'Add image')}
                disabled={isUploadingImages}
              >
                <Image03 aria-hidden className="text-primary-500 size-4" />
              </Button>
              <div ref={emojiPickerContainerRef} className="relative">
                <Button
                  ref={emojiTriggerButtonRef}
                  type="button"
                  variant="white-contained"
                  className={toolButtonClassName}
                  onClick={() => {
                    setIsEmojiPickerOpen((prev) => !prev);
                    setIsAssetPickerOpen(false);
                  }}
                  aria-label={t('discover.web.addEmoji', 'Add emoji')}
                >
                  <span aria-hidden className="text-primary-500 text-sm leading-none">
                    đŸ˜
                  </span>
                </Button>
                {isEmojiPickerOpen && emojiPopoverStyle && typeof document !== 'undefined'
                  ? createPortal(
                      <div
                        ref={emojiPopoverRef}
                        className={emojiPopoverClassName}
                        style={{
                          left: emojiPopoverStyle.left,
                          position: 'fixed',
                          top: emojiPopoverStyle.top,
                          zIndex: 1200,
                        }}
                      >
                        <EmojiPicker
                          className="emoji-picker-system-font"
                          height={300}
                          width={300}
                          open={isEmojiPickerOpen}
                          onEmojiClick={handleEmojiSelect}
                          autoFocusSearch={false}
                          lazyLoadEmojis
                          theme={emojiPickerTheme}
                          previewConfig={{ showPreview: false }}
                        />
                      </div>,
                      document.body,
                    )
                  : null}
              </div>
            </div>

            <Button
              type="button"
              variant="primary-contained"
              className="text-button-small-medium px-3 py-2"
              disabled={!canPost || isPosting || isUploadingImages}
              onClick={onCreatePost}
            >
              {isPosting
                ? t('discover.web.posting', 'Posting...')
                : isUploadingImages
                  ? t('discover.web.uploadingImage', 'Uploading...')
                  : t('discover.web.post', 'Post')}
            </Button>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        multiple
        onChange={onComposerImageChange}
      />
    </>
  );
}

