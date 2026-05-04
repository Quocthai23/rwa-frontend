'use client';

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
import { useGetData } from '@/context/GetdataContext';
import { useToast } from '@/hook/useToast';
import { localizeApiError } from '@/i18n/apiErrors';
import { imageApi } from '@/services/imageService';
import { postApi } from '@/services/postService';
import { useAuthStore } from '@/store/authStore';
import type { ComposerImage, ComposerLinkedAsset } from '../components/tab/types';
import { DISCOVER_MAX_COMPOSER_IMAGES } from './constants';

type UseDiscoverComposerOptions = {
  onPostCreated?: () => Promise<void> | void;
};

export type UseDiscoverComposerReturn = {
  addUploadedImageToComposer: (imageUrl: string) => boolean;
  addComposerAsset: (asset: ComposerLinkedAsset) => void;
  canPost: boolean;
  composerImages: ComposerImage[];
  composerLinkedAssets: ComposerLinkedAsset[];
  composerText: string;
  createPost: () => Promise<boolean>;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleComposerImageChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  isPosting: boolean;
  isUploadingImages: boolean;
  toggleComposerAsset: (asset: ComposerLinkedAsset) => void;
  removeComposerImage: (imageId: string) => void;
  removeComposerAsset: (assetId: string) => void;
  setComposerText: (value: string) => void;
};

export function useDiscoverComposer(
  options?: UseDiscoverComposerOptions,
): UseDiscoverComposerReturn {
  const { onPostCreated } = options || {};

  const { t } = useTranslation();
  const { assets } = useGetData();
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const user = useAuthStore((state) => state.user);

  const [composerText, setComposerTextState] = useState('');
  const [composerImages, setComposerImages] = useState<ComposerImage[]>([]);
  const [composerLinkedAssets, setComposerLinkedAssets] = useState<ComposerLinkedAsset[]>([]);
  const [isPosting, setIsPosting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRegistry = useRef<Set<string>>(new Set());

  const isUploadingImages = useMemo(
    () => composerImages.some((image) => image.status === 'uploading'),
    [composerImages],
  );

  const canPost = useMemo(() => composerText.trim().length > 0, [composerText]);

  useEffect(() => {
    const registry = objectUrlRegistry.current;

    return () => {
      registry.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      registry.clear();
    };
  }, []);

  const resetComposerImages = useCallback(() => {
    setComposerImages((prev) => {
      prev.forEach((image) => {
        URL.revokeObjectURL(image.previewUrl);
        objectUrlRegistry.current.delete(image.previewUrl);
      });

      return [];
    });
  }, []);

  const setComposerText = useCallback((value: string) => {
    setComposerTextState(value);
  }, []);

  const addComposerAsset = useCallback((asset: ComposerLinkedAsset) => {
    const normalizedId = String(asset.id || '').trim();
    const normalizedSymbol = String(asset.symbol || '')
      .trim()
      .toUpperCase();
    if (!normalizedId || !normalizedSymbol) {
      return;
    }

    setComposerLinkedAssets((prev) => {
      if (prev.some((item) => item.id === normalizedId)) {
        return prev;
      }

      return [...prev, { id: normalizedId, symbol: normalizedSymbol }];
    });
  }, []);

  const removeComposerAsset = useCallback((assetId: string) => {
    const normalizedId = String(assetId || '').trim();
    if (!normalizedId) {
      return;
    }

    setComposerLinkedAssets((prev) => prev.filter((asset) => asset.id !== normalizedId));
  }, []);

  const toggleComposerAsset = useCallback((asset: ComposerLinkedAsset) => {
    const normalizedId = String(asset.id || '').trim();
    const normalizedSymbol = String(asset.symbol || '')
      .trim()
      .toUpperCase();
    if (!normalizedId || !normalizedSymbol) {
      return;
    }

    setComposerLinkedAssets((prev) => {
      if (prev.some((item) => item.id === normalizedId)) {
        return prev.filter((item) => item.id !== normalizedId);
      }

      return [...prev, { id: normalizedId, symbol: normalizedSymbol }];
    });
  }, []);

  const addUploadedImageToComposer = useCallback((imageUrl: string) => {
    const normalizedImageUrl = String(imageUrl).trim();
    if (!normalizedImageUrl) {
      return false;
    }

    let added = false;
    setComposerImages((prev) => {
      if (prev.some((image) => image.uploadedUrl === normalizedImageUrl)) {
        return prev;
      }

      if (prev.length >= DISCOVER_MAX_COMPOSER_IMAGES) {
        return prev;
      }

      added = true;
      const nextImage: ComposerImage = {
        id: `shared-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        previewUrl: normalizedImageUrl,
        status: 'uploaded',
        uploadedUrl: normalizedImageUrl,
      };

      return [...prev, nextImage];
    });

    return added;
  }, []);

  const handleComposerImageChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? []);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (files.length === 0) {
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

      const remainingSlots = DISCOVER_MAX_COMPOSER_IMAGES - composerImages.length;
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
        objectUrlRegistry.current.add(previewUrl);

        return {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          previewUrl,
          status: 'uploading' as const,
        };
      });

      setComposerImages((prev) => [...prev, ...pendingImages]);

      try {
        const uploadedUrls = await imageApi.uploadMultipleImagesToPresignedUrl(
          filesToUpload.map((file) => ({
            uri: file,
            fileName: file.name,
            type: file.type,
          })),
        );

        const uploadedById = new Map<string, string>();
        pendingImages.forEach((image, index) => {
          if (uploadedUrls[index]) {
            uploadedById.set(image.id, uploadedUrls[index]);
          }
        });

        setComposerImages((prev) =>
          prev.map((image) => {
            const uploadedUrl = uploadedById.get(image.id);
            if (!uploadedUrl) {
              return image;
            }

            return {
              ...image,
              status: 'uploaded',
              uploadedUrl,
            };
          }),
        );
      } catch (error) {
        pendingImages.forEach((image) => {
          URL.revokeObjectURL(image.previewUrl);
          objectUrlRegistry.current.delete(image.previewUrl);
        });

        const failedIds = new Set(pendingImages.map((image) => image.id));
        setComposerImages((prev) => prev.filter((image) => !failedIds.has(image.id)));

        showError(
          t('discover.web.uploadFailedTitle', 'Upload failed'),
          localizeApiError(error, t, 'apiErrors.generic'),
        );
      }
    },
    [composerImages.length, isUploadingImages, router, showError, t, user],
  );

  const removeComposerImage = useCallback((imageId: string) => {
    setComposerImages((prev) => {
      const imageToRemove = prev.find((image) => image.id === imageId);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.previewUrl);
        objectUrlRegistry.current.delete(imageToRemove.previewUrl);
      }

      return prev.filter((image) => image.id !== imageId);
    });
  }, []);

  const createPost = useCallback(async () => {
    if (!canPost || isPosting) {
      return false;
    }

    if (!user) {
      showError(
        t('discover.web.loginRequiredTitle', 'Login required'),
        t('discover.web.loginRequiredPost', 'Please log in to create and upload post media.'),
      );
      router.push('/login');
      return false;
    }

    if (isUploadingImages) {
      showError(
        t('discover.web.uploadInProgressTitle', 'Upload in progress'),
        t(
          'discover.web.uploadInProgressMessage',
          'Please wait until current images finish uploading.',
        ),
      );
      return false;
    }

    const content = composerText.trim();
    if (!content) {
      showError(
        t('discover.web.missingContentTitle', 'Missing content'),
        t('discover.web.missingContentMessage', 'Please enter content before posting.'),
      );
      return false;
    }

    const mediaLinks = composerImages
      .map((image) => image.uploadedUrl)
      .filter((url): url is string => Boolean(url));

    if (mediaLinks.length !== composerImages.length) {
      showError(
        t('discover.web.mediaNotReadyTitle', 'Media not ready'),
        t('discover.web.mediaNotReadyMessage', 'Please wait for media upload to complete.'),
      );
      return false;
    }

    setIsPosting(true);

    try {
      const taggedSymbols = Array.from(
        new Set(
          Array.from(content.matchAll(/#([^\s#]+)/g))
            .map((match) => match[1]?.trim().toUpperCase())
            .filter((symbol): symbol is string => Boolean(symbol)),
        ),
      );

      const taggedAssetIds = taggedSymbols
        .map(
          (symbol) =>
            assets?.find((asset) => asset.isActive && asset.symbol.toUpperCase() === symbol)?.id,
        )
        .filter((id): id is string => Boolean(id));
      const selectedAssetIds = composerLinkedAssets
        .map((asset) => asset.id?.trim())
        .filter((id): id is string => Boolean(id));
      const assetIds = Array.from(new Set([...selectedAssetIds, ...taggedAssetIds]));

      const payload = {
        content,
        linksUrl: mediaLinks.map((link) => ({
          type: 'image' as const,
          link,
        })),
        assetIds,
      };

      await postApi.createPost(payload);
      setComposerTextState('');
      resetComposerImages();
      setComposerLinkedAssets([]);
      showSuccess(
        t('discover.web.postSuccessTitle', 'Success'),
        t('discover.web.postSuccessMessage', 'Post created successfully.'),
      );

      if (onPostCreated) {
        await onPostCreated();
      }
      return true;
    } catch (error) {
      showError(
        t('discover.web.postFailedTitle', 'Post failed'),
        localizeApiError(error, t, 'apiErrors.generic'),
      );
      return false;
    } finally {
      setIsPosting(false);
    }
  }, [
    assets,
    canPost,
    composerImages,
    composerLinkedAssets,
    composerText,
    isPosting,
    isUploadingImages,
    onPostCreated,
    resetComposerImages,
    router,
    showError,
    showSuccess,
    t,
    user,
  ]);

  return useMemo(
    () => ({
      addUploadedImageToComposer,
      addComposerAsset,
      canPost,
      composerImages,
      composerLinkedAssets,
      composerText,
      createPost,
      fileInputRef,
      handleComposerImageChange,
      isPosting,
      isUploadingImages,
      toggleComposerAsset,
      removeComposerImage,
      removeComposerAsset,
      setComposerText,
    }),
    [
      addUploadedImageToComposer,
      addComposerAsset,
      canPost,
      composerImages,
      composerLinkedAssets,
      composerText,
      createPost,
      handleComposerImageChange,
      isPosting,
      isUploadingImages,
      toggleComposerAsset,
      removeComposerImage,
      removeComposerAsset,
      setComposerText,
    ],
  );
}
