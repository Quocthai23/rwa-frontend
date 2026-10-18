'use client';

import EmojiPicker, { Theme, type EmojiClickData } from 'emoji-picker-react';
import { ArrowLeft, CameraPlus, XClose, SearchLg } from '@untitledui/icons';
import Image from 'next/image';
import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/shared/atoms/button';
import { Editor, type EditorHandle } from '@/components/shared/atoms/editor';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/shared/atoms/dialog';
import { useTheme } from '@/theme';
import { useSymbols } from '@/hook/useSymbols';
import { useMarketSocketStore } from '@/store/marketSocketStore';
import { imageApi } from '@/services/imageService';
import { useToast } from '@/hook/useToast';
import { localizeApiError } from '@/i18n/apiErrors';
import { DISCOVER_MAX_COMPOSER_IMAGES } from '../hooks/constants';
import type { DiscoverPost } from './DiscoverPostCard';
import { DiscoverAssetSelectorContent } from '../../shared/DiscoverAssetSelectorContent';

type ComposerLinkedAsset = {
  id: string;
  symbol: string;
};

type DiscoverAsset = {
  ask?: number | string;
  bid?: number | string;
  digit?: number;
  id: string;
  isActive?: boolean;
  logo?: string;
  name?: string;
  symbol: string;
};

type PendingUploadImage = {
  id: string;
  previewUrl: string;
};

type EditPostSheetProps = {
  assets?: DiscoverAsset[];
  draft: string;
  onClose: () => void;
  onDraftChange: (value: string) => void;
  onImagesChange: (images: string[]) => void;
  onSubmit: () => Promise<void> | void;
  post: DiscoverPost | null;
};

export function EditPostSheet({
  assets = [],
  draft,
  onClose,
  onDraftChange,
  onImagesChange,
  onSubmit,
  post,
}: EditPostSheetProps) {
  const { t } = useTranslation();
  const { showError } = useToast();
  const { mode } = useTheme();
  const rtBySymbol = useMarketSocketStore((state) => state.rtBySymbol);
  const textareaRef = useRef<EditorHandle | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const emojiPickerContainerRef = useRef<HTMLDivElement | null>(null);
  const emojiToggleButtonRef = useRef<HTMLButtonElement | null>(null);
  const assetPickerContainerRef = useRef<HTMLDivElement | null>(null);
  const previewUrlRegistry = useRef<Set<string>>(new Set());

  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isAssetSheetOpen, setIsAssetSheetOpen] = useState(false);
  const [assetSearchText, setAssetSearchText] = useState('');
  const [pendingUploadImages, setPendingUploadImages] = useState<PendingUploadImage[]>([]);
  const [isConfirmDiscardOpen, setIsConfirmDiscardOpen] = useState(false);
  const [initialDraft, setInitialDraft] = useState('');
  const [initialImages, setInitialImages] = useState<string[]>([]);
  const [linkedAssets, setLinkedAssets] = useState<ComposerLinkedAsset[]>([]);

  const emojiPickerTheme = mode === 'dark' ? Theme.DARK : Theme.LIGHT;
  const isUploadingImages = pendingUploadImages.length > 0;
  const composerAssets = useMemo(() => (assets ?? []) as DiscoverAsset[], [assets]);
  const hasDraftChanged = draft !== initialDraft;
  const hasImagesChanged =
    post?.content.images.length !== initialImages.length ||
    post?.content.images.some((image, index) => image !== initialImages[index]);
  const hasUnsavedChanges = Boolean(post) && (hasDraftChanged || Boolean(hasImagesChanged));

  const filteredAssets = useMemo(() => {
    const query = assetSearchText.trim().toLowerCase();
    const activeAssets = composerAssets.filter((asset) => asset.isActive);
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
  }, [assetSearchText, composerAssets]);

  const linkedAssetIdSet = useMemo(
    () => new Set(linkedAssets.map((asset) => asset.id)),
    [linkedAssets],
  );

  const symbolsToSubscribe = useMemo(
    () => filteredAssets.map((asset) => asset.symbol).filter(Boolean),
    [filteredAssets],
  );

  useSymbols(symbolsToSubscribe, isAssetSheetOpen && symbolsToSubscribe.length > 0);

  useEffect(() => {
    const registry = previewUrlRegistry.current;
    return () => {
      registry.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      registry.clear();
    };
  }, []);

  useEffect(() => {
    if (!isEmojiPickerOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const targetNode = event.target as Node;
      const isInEmojiPicker = emojiPickerContainerRef.current?.contains(targetNode);
      const isInEmojiToggleButton = emojiToggleButtonRef.current?.contains(targetNode);
      if (isInEmojiPicker || isInEmojiToggleButton) {
        return;
      }
      setIsEmojiPickerOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEmojiPickerOpen]);

  useEffect(() => {
    if (!isAssetSheetOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const targetNode = event.target as Node;
      if (!assetPickerContainerRef.current?.contains(targetNode)) {
        setIsAssetSheetOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAssetSheetOpen]);

  useEffect(() => {
    if (!post) {
      setInitialDraft('');
      setInitialImages([]);
      setLinkedAssets([]);
      setIsConfirmDiscardOpen(false);
      return;
    }

    setInitialDraft(post.content.text);
    setInitialImages(post.content.images);
  }, [post?.id, post?.content.text, post?.content.images, post]);

  const handleInsertEmoji = useCallback(
    (emoji: string) => {
      const editorHandle = textareaRef.current;
      if (!editorHandle) {
        onDraftChange(`${draft}${emoji}`);
        return;
      }

      editorHandle.insertTextAtCursor(emoji);
    },
    [draft, onDraftChange],
  );

  const handleEmojiSelect = useCallback(
    (emojiData: EmojiClickData) => {
      handleInsertEmoji(emojiData.emoji);
    },
    [handleInsertEmoji],
  );

  const handleToggleLinkedAsset = useCallback((asset: ComposerLinkedAsset) => {
    setLinkedAssets((prev) => {
      const exists = prev.some((item) => item.id === asset.id);

      if (exists) {
        return prev.filter((item) => item.id !== asset.id);
      }

      return [...prev, asset];
    });
  }, []);

  const handleRemoveLinkedAsset = useCallback((assetId: string) => {
    setLinkedAssets((prev) => prev.filter((asset) => asset.id !== assetId));
  }, []);

  const handleRemoveImage = useCallback(
    (targetIndex: number) => {
      if (!post) {
        return;
      }
      onImagesChange(post.content.images.filter((_, index) => index !== targetIndex));
    },
    [onImagesChange, post],
  );

  const handleAttachImage = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      if (!post) {
        return;
      }

      const files = Array.from(event.target.files ?? []);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (files.length === 0) {
        return;
      }

      if (isUploadingImages) {
        showError(
          t('discover.web.uploadInProgressTitle', 'Upload in progress'),
          t(
            'discover.web.uploadInProgressMessage',
            'Please wait until current images finish uploading.',
          ),
        );
        return;
      }

      const imageFiles = files.filter((file) => file.type.startsWith('image/'));
      if (imageFiles.length !== files.length) {
        showError(
          t('discover.web.invalidMediaTypeTitle', 'Unsupported media type'),
          t(
            'discover.web.invalidMediaTypeMessage',
            'Only image files are supported at the moment.',
          ),
        );
      }

      if (imageFiles.length === 0) {
        return;
      }

      const remainingSlots = DISCOVER_MAX_COMPOSER_IMAGES - post.content.images.length;
      if (remainingSlots <= 0) {
        showError(
          t('discover.web.maxImagesTitle', 'Image limit reached'),
          t('discover.web.maxImagesMessage', 'You can attach up to {{count}} images.', {
            count: DISCOVER_MAX_COMPOSER_IMAGES,
          }),
        );
        return;
      }

      const filesToUpload = imageFiles.slice(0, remainingSlots);
      if (filesToUpload.length < imageFiles.length) {
        showError(
          t('discover.web.maxImagesTitle', 'Image limit reached'),
          t('discover.web.maxImagesMessage', 'You can attach up to {{count}} images.', {
            count: DISCOVER_MAX_COMPOSER_IMAGES,
          }),
        );
      }

      const pendingImages = filesToUpload.map((file) => {
        const previewUrl = URL.createObjectURL(file);
        previewUrlRegistry.current.add(previewUrl);
        return {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          previewUrl,
        };
      });
      setPendingUploadImages((prev) => [...prev, ...pendingImages]);

      try {
        const uploadedUrls = await imageApi.uploadMultipleImagesToPresignedUrl(
          filesToUpload.map((file) => ({
            uri: file,
            fileName: file.name,
            type: file.type,
          })),
        );
        const validUrls = uploadedUrls.filter(Boolean);
        if (validUrls.length > 0) {
          onImagesChange(
            [...post.content.images, ...validUrls].slice(0, DISCOVER_MAX_COMPOSER_IMAGES),
          );
        }
      } catch (error) {
        showError(
          t('discover.web.uploadFailedTitle', 'Upload failed'),
          localizeApiError(error, t, 'apiErrors.generic'),
        );
      } finally {
        pendingImages.forEach((image) => {
          URL.revokeObjectURL(image.previewUrl);
          previewUrlRegistry.current.delete(image.previewUrl);
        });
        setPendingUploadImages((prev) =>
          prev.filter((image) => !pendingImages.some((pending) => pending.id === image.id)),
        );
      }
    },
    [isUploadingImages, onImagesChange, post, showError, t],
  );

  const handleRequestClose = useCallback(() => {
    if (hasUnsavedChanges || isUploadingImages) {
      setIsConfirmDiscardOpen(true);
      return;
    }
    onClose();
  }, [hasUnsavedChanges, isUploadingImages, onClose]);

  const handleConfirmSaveAndExit = useCallback(async () => {
    await onSubmit();
    setIsConfirmDiscardOpen(false);
  }, [onSubmit]);

  return (
    <>
      <Dialog
        open={Boolean(post)}
        onOpenChange={(open) => {
          if (!open) {
            handleRequestClose();
          }
        }}
      >
        <DialogContent
          className="border-border bg-background max-h-[90vh] max-w-3xl overflow-hidden p-0"
          showCloseButton={false}
          onEscapeKeyDown={(event) => {
            if (hasUnsavedChanges || isUploadingImages) {
              event.preventDefault();
              setIsConfirmDiscardOpen(true);
            }
          }}
          onInteractOutside={(event) => {
            if (hasUnsavedChanges || isUploadingImages) {
              event.preventDefault();
              setIsConfirmDiscardOpen(true);
            }
          }}
        >
          <DialogTitle className="sr-only">{t('discover.web.editPost', 'Edit post')}</DialogTitle>
          <DialogDescription className="sr-only">
            {t(
              'discover.web.editPostDescription',
              'Update your post text and images before applying changes.',
            )}
          </DialogDescription>

          <div className="border-border bg-background/90 supports-backdrop-filter:bg-background/70 flex h-18 items-center justify-between border-b px-5 py-3 backdrop-blur">
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground flex items-center gap-2 rounded-md px-1 py-1 transition-colors"
              onClick={handleRequestClose}
              aria-label={t('common.back', 'Back')}
            >
              <ArrowLeft className="size-4.5" />
              <p className="text-foreground text-lg font-semibold">
                {t('discover.web.editPost', 'Edit post')}
              </p>
            </button>
            <Button
              type="button"
              variant="primary-contained"
              className="h-9 min-w-22 px-4 text-sm font-semibold"
              onClick={onSubmit}
              disabled={draft.trim().length === 0 || isUploadingImages}
            >
              {isUploadingImages
                ? t('discover.web.uploadingImage', 'Uploading...')
                : t('discover.web.apply', 'Apply')}
            </Button>
          </div>

          <div className="max-h-[calc(90vh-72px)] overflow-y-auto px-5 py-5">
            {post ? (
              <div className="space-y-5">
                <div className="bg-muted/35 border-border relative rounded-2xl border p-4 shadow-[0_6px_24px_-18px_rgba(0,0,0,0.5)]">
                  <Editor
                    ref={textareaRef}
                    value={draft}
                    onChange={onDraftChange}
                    placeholder={t('discover.web.shareYourInsights', 'Share your insights')}
                    className="text-body-large-regular field-sizing-fixed min-h-40 w-full max-w-full overflow-x-hidden border-none bg-transparent px-0 py-0 wrap-break-word whitespace-pre-wrap shadow-none outline-none focus-visible:ring-0 dark:bg-transparent"
                  />
                  <Button
                    ref={emojiToggleButtonRef}
                    type="button"
                    variant="white-contained"
                    className="hover:bg-muted absolute right-3 bottom-3 h-9 w-9 rounded-full p-0 text-lg leading-none shadow-sm"
                    onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
                    aria-label={t('discover.web.addEmoji', 'Add emoji')}
                  >
                    <span aria-hidden>đŸ˜</span>
                  </Button>
                </div>

                <div ref={emojiPickerContainerRef} className="relative">
                  {isEmojiPickerOpen ? (
                    <div className="absolute right-14 -bottom-14 z-20">
                      <EmojiPicker
                        open={isEmojiPickerOpen}
                        onEmojiClick={handleEmojiSelect}
                        autoFocusSearch={false}
                        lazyLoadEmojis
                        theme={emojiPickerTheme}
                        previewConfig={{ showPreview: false }}
                        width={300}
                        height={260}
                      />
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center justify-start gap-2 px-2 py-2">
                  <div ref={assetPickerContainerRef} className="relative">
                    <Button
                      type="button"
                      variant="white-contained"
                      className="hover:bg-muted h-9 rounded-full px-2.5"
                      onClick={() => {
                        setIsAssetSheetOpen((prev) => !prev);
                        setIsEmojiPickerOpen(false);
                      }}
                      aria-label={t('discover.web.tagAssets', 'Tag assets')}
                    >
                      <SearchLg aria-hidden className="text-primary-500 size-4" />
                    </Button>

                    {isAssetSheetOpen ? (
                      <div className="bg-background absolute bottom-full left-0 z-120 mb-2 w-[min(30rem,calc(100vw-3rem))] rounded border border-neutral-200 p-2 shadow-lg dark:border-neutral-700">
                        <DiscoverAssetSelectorContent
                          assetSearchText={assetSearchText}
                          onAssetSearchTextChange={setAssetSearchText}
                          filteredAssets={filteredAssets}
                          linkedAssetIdSet={linkedAssetIdSet}
                          onToggleLinkedAsset={handleToggleLinkedAsset}
                          rtBySymbol={rtBySymbol}
                        />
                      </div>
                    ) : null}
                  </div>

                  <Button
                    type="button"
                    variant="white-contained"
                    className="hover:bg-muted h-9 rounded-full px-2.5"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={
                      isUploadingImages ||
                      post.content.images.length + pendingUploadImages.length >=
                        DISCOVER_MAX_COMPOSER_IMAGES
                    }
                    aria-label={t('discover.web.addImage', 'Add image')}
                  >
                    <CameraPlus aria-hidden className="text-primary-500 size-4" />
                  </Button>
                </div>

                {linkedAssets.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {linkedAssets.map((asset) => (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => handleRemoveLinkedAsset(asset.id)}
                        className="bg-muted text-foreground inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs"
                        aria-label={t('discover.web.removeTaggedAsset', 'Remove tagged asset')}
                      >
                        <span>#{asset.symbol}</span>
                        <XClose className="size-3" />
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-foreground text-sm font-semibold">
                      {t('discover.web.images', 'Images')}
                    </p>
                    <p className="text-muted-foreground text-xs font-medium">
                      {post.content.images.length + pendingUploadImages.length}/
                      {DISCOVER_MAX_COMPOSER_IMAGES}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {post.content.images.map((image, index) => (
                      <div
                        key={`${post.id}-edit-preview-${index}`}
                        className="bg-muted group relative aspect-4/3 overflow-hidden rounded-xl"
                      >
                        <Image
                          src={image}
                          alt={`edit-preview-${post.id}-${index + 1}`}
                          width={400}
                          height={300}
                          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                          unoptimized
                        />

                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="bg-foreground/80 hover:bg-foreground text-background absolute top-2 right-2 rounded-full p-1.5 opacity-95 transition-colors"
                          aria-label={t(
                            'discover.web.removeImageWithIndex',
                            'Remove image {{index}}',
                            {
                              index: index + 1,
                            },
                          )}
                        >
                          <XClose className="size-3.5" />
                        </button>
                      </div>
                    ))}
                    {pendingUploadImages.map((image) => (
                      <div
                        key={image.id}
                        className="bg-muted relative aspect-4/3 overflow-hidden rounded-xl"
                      >
                        <Image
                          src={image.previewUrl}
                          alt={`uploading-${image.id}`}
                          width={400}
                          height={300}
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <span className="text-xs font-medium text-white">
                            {t('discover.web.uploadingImage', 'Uploading...')}
                          </span>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      className="border-border from-background to-muted/50 text-muted-foreground hover:text-foreground hover:border-primary/45 hover:from-muted/40 hover:to-muted/70 flex aspect-4/3 items-center justify-center rounded-xl border border-dashed bg-linear-to-br transition-colors disabled:cursor-not-allowed disabled:opacity-45"
                      onClick={() => fileInputRef.current?.click()}
                      aria-label={t('discover.web.addImage', 'Add image')}
                      disabled={
                        post.content.images.length + pendingUploadImages.length >=
                        DISCOVER_MAX_COMPOSER_IMAGES
                      }
                    >
                      <div className="flex flex-col items-center gap-1.5">
                        <CameraPlus className="size-7" />
                        <span className="text-[11px] font-medium">
                          {t('discover.web.add', 'Add')}
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleAttachImage}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isConfirmDiscardOpen} onOpenChange={setIsConfirmDiscardOpen}>
        <DialogContent className="bg-background w-[calc(100vw-2rem)] max-w-md rounded-xl border-none p-5">
          <DialogTitle className="text-base font-semibold">
            {t('discover.web.unsavedChangesTitle', 'You have unsaved changes')}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {t(
              'discover.web.unsavedChangesDescription',
              'You changed this post. Do you want to leave or save before leaving?',
            )}
          </DialogDescription>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="neutral-outline"
              className="h-10"
              onClick={() => {
                setIsConfirmDiscardOpen(false);
                onClose();
              }}
            >
              {t('discover.web.leaveAnyway', 'Still leave')}
            </Button>
            <Button
              type="button"
              variant="primary-contained"
              className="h-10"
              onClick={() => void handleConfirmSaveAndExit()}
              disabled={draft.trim().length === 0 || isUploadingImages}
            >
              {t('discover.web.saveAndLeave', 'Save and leave')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

