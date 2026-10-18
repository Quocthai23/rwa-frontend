'use client';

import { Attachment02, CurrencyDollarCircle, X, XClose } from '@untitledui/icons';
import EmojiPicker, { Theme, type EmojiClickData } from 'emoji-picker-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  type ChangeEvent,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/shared/atoms/button';
import { Editor, type EditorHandle } from '@/components/shared/atoms/editor';
import { Sheet, SheetContent, SheetTitle } from '@/components/shared/atoms/sheet';
import { useGetData } from '@/context/GetdataContext';
import { useAuthHydrated } from '@/hook/useAuthHydrated';
import { useSymbols } from '@/hook/useSymbols';
import { useToast } from '@/hook/useToast';
import { localizeApiError } from '@/i18n/apiErrors';
import { imageApi } from '@/services/imageService';
import { postApi } from '@/services/postService';
import { useAuthStore } from '@/store/authStore';
import { useMarketSocketStore } from '@/store/marketSocketStore';
import { useTheme } from '@/theme';

import {
  DISCOVER_MAX_COMPOSER_IMAGES,
  DISCOVER_POST_CREATED_EVENT,
  DISCOVER_USER_PLACEHOLDER_ICON,
} from './hooks/constants';
import { DiscoverAssetSelectorContent } from '../shared/DiscoverAssetSelectorContent';

type ComposerAttachment = {
  file: File;
  id: string;
  previewUrl: string;
};

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

const HASHTAG_REGEX = /#[A-Za-z0-9_]+/g;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read file'));
    reader.readAsDataURL(file);
  });
}

export function CreatePostScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const { assets } = useGetData();
  const rtBySymbol = useMarketSocketStore((state) => state.rtBySymbol);
  const { mode } = useTheme();
  const hasHydratedAuth = useAuthHydrated();
  const user = useAuthStore((state) => state.user);
  const composerAssets = useMemo(() => (assets ?? []) as DiscoverAsset[], [assets]);

  const composerTextareaRef = useRef<EditorHandle | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const albumInputRef = useRef<HTMLInputElement | null>(null);
  const emojiPickerContainerRef = useRef<HTMLDivElement | null>(null);
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [linkedAssets, setLinkedAssets] = useState<ComposerLinkedAsset[]>([]);
  const [assetSearchText, setAssetSearchText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [isMediaSourceSheetOpen, setIsMediaSourceSheetOpen] = useState(false);
  const [isAssetSheetOpen, setIsAssetSheetOpen] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState(false);

  const canPost = useMemo(() => content.trim().length > 0, [content]);
  const emojiPickerTheme = mode === 'dark' ? Theme.DARK : Theme.LIGHT;
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
  const hasUnsavedChanges = useMemo(
    () => content.trim().length > 0 || attachments.length > 0 || linkedAssets.length > 0,
    [attachments.length, content, linkedAssets.length],
  );
  const symbolsToSubscribe = useMemo(
    () => filteredAssets.map((asset) => asset.symbol).filter(Boolean),
    [filteredAssets],
  );
  useSymbols(symbolsToSubscribe, isAssetSheetOpen && symbolsToSubscribe.length > 0);

  const currentUserName =
    user?.username?.trim() || user?.email?.split('@')[0] || t('discover.web.guest', 'Guest Trader');
  const currentUserAvatar = user?.avatar || DISCOVER_USER_PLACEHOLDER_ICON;

  useEffect(() => {
    if (!isEmojiPickerOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!emojiPickerContainerRef.current?.contains(event.target as Node)) {
        setIsEmojiPickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEmojiPickerOpen]);

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(event.target.files || []);
      event.target.value = '';

      if (selectedFiles.length === 0) {
        return;
      }

      const imageFiles = selectedFiles.filter((file) => file.type.startsWith('image/'));
      if (imageFiles.length !== selectedFiles.length) {
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

      const remainingSlots = DISCOVER_MAX_COMPOSER_IMAGES - attachments.length;
      if (remainingSlots <= 0) {
        showError(
          t('discover.web.maxImagesTitle', 'Image limit reached'),
          t('discover.web.maxImagesMessage', 'You can attach up to {{count}} images.', {
            count: DISCOVER_MAX_COMPOSER_IMAGES,
          }),
        );
        return;
      }

      const filesToAdd = imageFiles.slice(0, remainingSlots);
      if (filesToAdd.length < imageFiles.length) {
        showError(
          t('discover.web.maxImagesTitle', 'Image limit reached'),
          t('discover.web.maxImagesMessage', 'You can attach up to {{count}} images.', {
            count: DISCOVER_MAX_COMPOSER_IMAGES,
          }),
        );
      }

      try {
        const nextAttachments = await Promise.all(
          filesToAdd.map(async (file) => ({
            file,
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            previewUrl: await readFileAsDataUrl(file),
          })),
        );

        setAttachments((prev) => [...prev, ...nextAttachments]);
      } catch {
        showError(
          t('discover.web.uploadFailedTitle', 'Upload failed'),
          t('discover.web.uploadFailedMessage', 'Unable to prepare image preview.'),
        );
      }
    },
    [attachments.length, showError, t],
  );

  const removeAttachment = useCallback((attachmentId: string) => {
    setAttachments((prev) => prev.filter((item) => item.id !== attachmentId));
  }, []);

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

  const handleCommentEmojiSelect = useCallback((emojiData: EmojiClickData) => {
    const nextEmoji = emojiData.emoji;
    const editorHandle = composerTextareaRef.current;

    if (!editorHandle) {
      setContent((prev) => `${prev}${nextEmoji}`);
      return;
    }

    editorHandle.insertTextAtCursor(nextEmoji);
  }, []);

  const triggerHiddenFileInput = useCallback((ref: RefObject<HTMLInputElement | null>) => {
    setIsMediaSourceSheetOpen(false);
    window.setTimeout(() => {
      ref.current?.click();
    }, 150);
  }, []);

  const handleOpenCamera = useCallback(() => {
    triggerHiddenFileInput(cameraInputRef);
  }, [triggerHiddenFileInput]);

  const handleOpenAlbum = useCallback(() => {
    triggerHiddenFileInput(albumInputRef);
  }, [triggerHiddenFileInput]);

  const handleCreatePost = useCallback(async () => {
    if (isPosting) {
      return;
    }

    if (!user) {
      showError(
        t('discover.web.loginRequiredTitle', 'Login required'),
        t('discover.web.loginRequiredPost', 'Please log in to create and upload post media.'),
      );
      router.push('/login');
      return;
    }

    const normalizedContent = content.trim();
    if (!normalizedContent) {
      showError(
        t('discover.web.missingContentTitle', 'Missing content'),
        t('discover.web.missingContentMessage', 'Please enter content before posting.'),
      );
      return;
    }

    setIsPosting(true);

    try {
      const hashtagAssetIds = Array.from(normalizedContent.matchAll(HASHTAG_REGEX))
        .map((match) => match[0].slice(1).toUpperCase())
        .map(
          (tag) =>
            composerAssets.find((asset) => asset.symbol?.trim().toUpperCase() === tag)?.id || '',
        )
        .filter(Boolean);
      const selectedAssetIds = linkedAssets.map((asset) => asset.id);
      const assetIds = Array.from(new Set([...selectedAssetIds, ...hashtagAssetIds]));

      const uploadedUrls = attachments.length
        ? await imageApi.uploadMultipleImagesToPresignedUrl(
            attachments.map((attachment) => ({
              uri: attachment.file,
              fileName: attachment.file.name,
              type: attachment.file.type,
            })),
          )
        : [];

      await postApi.createPost({
        assetIds,
        content: normalizedContent,
        linksUrl: uploadedUrls.map((link) => ({
          type: 'image' as const,
          link,
        })),
      });

      showSuccess(
        t('discover.web.postSuccessTitle', 'Success'),
        t('discover.web.postSuccessMessage', 'Post created successfully.'),
      );
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(DISCOVER_POST_CREATED_EVENT));
      }

      router.replace('/discover?tab=feed', { scroll: true });
    } catch (error) {
      showError(
        t('discover.web.postFailedTitle', 'Post failed'),
        localizeApiError(error, t, 'apiErrors.generic'),
      );
    } finally {
      setIsPosting(false);
    }
  }, [
    attachments,
    composerAssets,
    content,
    isPosting,
    linkedAssets,
    router,
    showError,
    showSuccess,
    t,
    user,
  ]);

  if (!hasHydratedAuth) {
    return null;
  }

  const closeComposer = () => {
    router.replace('/discover?tab=feed', { scroll: true });
  };

  const handleRequestCloseComposer = () => {
    if (isPosting) {
      return;
    }

    if (hasUnsavedChanges) {
      setIsEmojiPickerOpen(false);
      setIsDiscardConfirmOpen(true);
      return;
    }

    closeComposer();
  };

  const handleConfirmDiscardPost = () => {
    setIsDiscardConfirmOpen(false);
    closeComposer();
  };

  return (
    <Sheet open onOpenChange={(open) => !open && handleRequestCloseComposer()}>
      <SheetContent
        side="bottom"
        title={t('discover.web.createPostTitle', 'Create post')}
        withOverlay={false}
        showCloseButton={false}
        className="bg-background flex h-dvh max-h-dvh w-full max-w-4xl flex-col rounded-none border-0 p-0 shadow-none"
      >
        <div className="bg-background/95 border-border supports-backdrop-filter:bg-background/80 sticky top-0 z-20 border-b backdrop-blur">
          <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-4 py-3">
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors"
              onClick={handleRequestCloseComposer}
              aria-label={t('common.close', 'Close')}
            >
              <XClose className="size-5" />
            </button>
            <p className="text-h3-semibold text-foreground truncate">
              {t('discover.web.createPostTitle', 'Create post')}
            </p>
            <Button
              type="button"
              variant="primary-contained"
              className="h-8 px-3 text-sm sm:h-9 sm:px-4"
              disabled={!canPost || isPosting || !user}
              onClick={handleCreatePost}
            >
              {isPosting ? t('discover.web.posting', 'Posting...') : t('discover.web.post', 'Post')}
            </Button>
          </div>
        </div>

        {user ? (
          <>
            <div className="scrollbar-neutral-slim flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-4 sm:space-y-5 sm:py-5">
                <div className="flex items-center gap-2.5">
                  <Image
                    src={currentUserAvatar}
                    alt={currentUserName}
                    width={36}
                    height={36}
                    unoptimized
                    className="bg-muted h-9 w-9 rounded-full object-cover"
                  />
                  <div className="min-w-0">
                    <p className="text-foreground text-body-small-medium truncate">
                      {currentUserName}
                    </p>
                  </div>
                </div>

                <Editor
                  ref={composerTextareaRef}
                  value={content}
                  onChange={setContent}
                  placeholder={t('discover.web.shareInsights', 'Share your insights')}
                  className="text-body-small-regular resize-none border-none bg-transparent px-0 py-0 leading-6 shadow-none outline-none focus-visible:ring-0 dark:bg-transparent"
                />

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
                        <X className="size-3" />
                      </button>
                    ))}
                  </div>
                ) : null}

                {attachments.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-xs">
                      {t('discover.web.addImage', 'Add image')}: {attachments.length}/
                      {DISCOVER_MAX_COMPOSER_IMAGES}
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                      {attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="bg-muted relative h-28 overflow-hidden rounded-xl sm:h-32"
                        >
                          <Image
                            src={attachment.previewUrl}
                            alt={attachment.file.name}
                            fill
                            unoptimized
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            className="h-full w-full object-cover"
                          />
                          <Button
                            type="button"
                            variant="white-contained"
                            className="bg-background/90 hover:bg-background absolute top-1 right-1 h-6 w-6 rounded-full p-1"
                            onClick={() => removeAttachment(attachment.id)}
                            aria-label={t('common.remove', 'Remove')}
                          >
                            <X size={12} />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="bg-background/95 border-border supports-backdrop-filter:bg-background/80 sticky bottom-0 z-20 border-t backdrop-blur">
              <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="white-contained"
                    className="hover:bg-muted h-9 rounded-full px-2.5"
                    onClick={() => {
                      setIsAssetSheetOpen(true);
                      setIsEmojiPickerOpen(false);
                    }}
                    disabled={isPosting}
                    aria-label={t('discover.web.tagAssets', 'Tag assets')}
                  >
                    <CurrencyDollarCircle aria-hidden className="text-primary-500 size-4" />
                  </Button>

                  <Button
                    type="button"
                    variant="white-contained"
                    className="hover:bg-muted h-9 rounded-full px-2.5"
                    onClick={() => setIsMediaSourceSheetOpen(true)}
                    disabled={isPosting || attachments.length >= DISCOVER_MAX_COMPOSER_IMAGES}
                    aria-label={t('discover.web.addImage', 'Add image')}
                  >
                    <Attachment02 aria-hidden className="text-primary-500 size-4" />
                  </Button>

                  <div ref={emojiPickerContainerRef} className="relative">
                    <Button
                      type="button"
                      variant="white-contained"
                      className="hover:bg-muted h-9 rounded-full px-2.5"
                      onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
                      disabled={isPosting}
                      aria-label={t('discover.web.addEmoji', 'Add emoji')}
                    >
                      <span aria-hidden className="text-base leading-none">
                        đŸ˜
                      </span>
                    </Button>

                    {isEmojiPickerOpen ? (
                      <div className="bg-background fixed bottom-18 left-1/2 z-70 w-[min(92vw,320px)] -translate-x-1/2 overflow-hidden rounded-xl border border-neutral-200 shadow-lg dark:border-neutral-700">
                        <EmojiPicker
                          className="emoji-picker-system-font"
                          open={isEmojiPickerOpen}
                          onEmojiClick={handleCommentEmojiSelect}
                          autoFocusSearch={false}
                          lazyLoadEmojis
                          theme={emojiPickerTheme}
                          previewConfig={{ showPreview: false }}
                          width="100%"
                          height={360}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
                <p className="text-muted-foreground text-xs">
                  {content.trim().length > 0
                    ? `${content.trim().length} ${t('common.characters', 'chars')}`
                    : ''}
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-5 text-center">
            <p className="text-foreground text-h3-semibold">
              {t('discover.web.loginRequiredTitle', 'Login required')}
            </p>
            <p className="text-muted-foreground text-body-small-regular mt-2">
              {t(
                'discover.web.loginRequiredPost',
                'Please log in to create and upload post media.',
              )}
            </p>
            <Button
              type="button"
              variant="primary-contained"
              className="mt-4 h-10 px-4"
              onClick={() => router.push('/login')}
            >
              {t('auth.login.title', 'Login')}
            </Button>
          </div>
        )}

        <Sheet open={isMediaSourceSheetOpen} onOpenChange={setIsMediaSourceSheetOpen}>
          <SheetContent
            side="bottom"
            title={t('discover.web.addImage', 'Add image')}
            className="bg-card mx-auto max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-t-lg p-0"
          >
            <div className="bg-card flex flex-col pb-6">
              <div className="p-4">
                <h3 className="text-h3-semibold text-foreground">
                  {t('discover.web.addImage', 'Add image')}
                </h3>
              </div>
              <div className="bg-border h-px w-full" />
              <div className="flex flex-col px-4">
                <button
                  type="button"
                  className="text-body-large-semibold text-foreground flex h-14 items-center justify-start"
                  onClick={handleOpenCamera}
                >
                  {t('personalInfo.takePhoto', 'Camera')}
                </button>
                <button
                  type="button"
                  className="text-body-large-semibold text-foreground flex h-14 items-center justify-start"
                  onClick={handleOpenAlbum}
                >
                  {t('personalInfo.selectFromAlbum', 'Select from album')}
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <Sheet open={isAssetSheetOpen} onOpenChange={setIsAssetSheetOpen}>
          <SheetContent
            side="bottom"
            title={t('discover.web.tagAssets', 'Tag assets')}
            className="bg-card mx-auto max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-t-lg p-0"
          >
            <div className="bg-card flex flex-col pb-6">
              <div className="p-4">
                <h3 className="text-h3-semibold text-foreground">
                  {t('discover.web.tagAssets', 'Tag assets')}
                </h3>
              </div>
              <DiscoverAssetSelectorContent
                assetSearchText={assetSearchText}
                onAssetSearchTextChange={setAssetSearchText}
                filteredAssets={filteredAssets}
                linkedAssetIdSet={linkedAssetIdSet}
                onToggleLinkedAsset={handleToggleLinkedAsset}
                rtBySymbol={rtBySymbol}
                disabled={isPosting}
              />
            </div>
          </SheetContent>
        </Sheet>

        <Sheet open={isDiscardConfirmOpen} onOpenChange={setIsDiscardConfirmOpen}>
          <SheetContent
            side="center"
            showCloseButton={false}
            title={t('discover.web.discardPostConfirm', 'Discard this post and exit?')}
            className="bg-card border-border w-[calc(100%-2rem)] max-w-md gap-0 p-6"
          >
            <SheetTitle className="text-foreground text-center text-base font-medium">
              {t('discover.web.discardPostConfirm', 'Discard this post and exit?')}
            </SheetTitle>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                className="flex-1 rounded border border-red-200 bg-red-50 py-3 text-base font-semibold text-red-500 dark:border-red-700 dark:bg-red-900 dark:text-red-300"
                onClick={handleConfirmDiscardPost}
              >
                {t('settings.exit', 'Exit')}
              </button>
              <button
                type="button"
                className="bg-primary-500 flex-1 rounded py-3 text-base font-semibold text-white"
                onClick={() => setIsDiscardConfirmOpen(false)}
              >
                {t('discover.web.continue', 'Continue')}
              </button>
            </div>
          </SheetContent>
        </Sheet>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />
        <input
          ref={albumInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </SheetContent>
    </Sheet>
  );
}

