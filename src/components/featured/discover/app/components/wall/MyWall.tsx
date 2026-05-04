'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/store/authStore';
import { WallFeed } from './WallFeed';
import { Button } from '@/components/shared/atoms/button';
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogDescription,
  DialogTitle,
} from '@/components/shared/atoms/dialog';
import { Input } from '@/components/shared/atoms/input';
import { Textarea } from '@/components/shared/atoms/textarea';
import { useToast } from '@/hook/useToast';
import { authApi } from '@/services/auth';
import { imageApi } from '@/services/imageService';
import { userApi, type UserRelationListItem } from '@/services/userService';
import { localizeApiError } from '@/i18n/apiErrors';
import Image from 'next/image';
import {
  ArrowLeft,
  Calendar,
  CameraPlus,
  ChevronRight,
  DotsHorizontal,
  Edit05,
  InfoCircle,
  LinkExternal01,
  MinusCircle,
  Share04,
  XClose,
  ZoomIn,
  ZoomOut,
} from '@untitledui/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shared/atoms/dropdown-menu';
import { useGetData } from '@/context/GetdataContext';
import { cn } from '@/lib/utils';
import { isValidUsername } from '@/lib/validators/username';
import { useTheme } from '@/theme';
import { DISCOVER_USER_PLACEHOLDER_ICON } from '../../hooks/constants';

const DEFAULT_PROFILE_BANNER = '/assets/images/market/banner-view.png';

type WallSubTab = 'posts' | 'pending';

const PROFILE_BIO_MAX_LENGTH = 255;

type MyWallProps = {
  onOpenAuthorProfile?: (authorId: string) => void;
};

const DISCOVER_BASE_PATH = '/discover';

function getSharedPostSlugFromPathname(pathname: string): string {
  const normalizedPathname = pathname.trim();
  if (!normalizedPathname.startsWith(`${DISCOVER_BASE_PATH}/`)) {
    return '';
  }

  const slug = normalizedPathname.slice(DISCOVER_BASE_PATH.length + 1).split('/')[0] || '';
  return decodeURIComponent(slug);
}

type CropSquare = {
  size: number;
  x: number;
  y: number;
};

type CropCorner = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';

const AVATAR_PREVIEW_SIZE = 252;
const AVATAR_MIN_CROP_SIZE = 96;
const AVATAR_DEFAULT_CROP_SIZE = 208;

function clampCropSquare(crop: CropSquare): CropSquare {
  const maxSize = AVATAR_PREVIEW_SIZE;
  const normalizedSize = Math.min(maxSize, Math.max(AVATAR_MIN_CROP_SIZE, crop.size));
  return {
    size: normalizedSize,
    x: Math.min(AVATAR_PREVIEW_SIZE - normalizedSize, Math.max(0, crop.x)),
    y: Math.min(AVATAR_PREVIEW_SIZE - normalizedSize, Math.max(0, crop.y)),
  };
}

function getDefaultCropSquare(): CropSquare {
  const centered = (AVATAR_PREVIEW_SIZE - AVATAR_DEFAULT_CROP_SIZE) / 2;
  return { size: AVATAR_DEFAULT_CROP_SIZE, x: centered, y: centered };
}

function resizeCropSquare(
  start: CropSquare,
  corner: CropCorner,
  deltaX: number,
  deltaY: number,
): CropSquare {
  if (corner === 'bottom-right') {
    const maxGrow = AVATAR_PREVIEW_SIZE - Math.max(start.x + start.size, start.y + start.size);
    const delta = Math.min(
      maxGrow,
      Math.max(-(start.size - AVATAR_MIN_CROP_SIZE), Math.max(deltaX, deltaY)),
    );
    return clampCropSquare({ ...start, size: start.size + delta });
  }

  if (corner === 'top-left') {
    const maxGrow = Math.min(start.x, start.y);
    const delta = Math.max(
      -maxGrow,
      Math.min(start.size - AVATAR_MIN_CROP_SIZE, Math.max(deltaX, deltaY)),
    );
    return clampCropSquare({
      size: start.size - delta,
      x: start.x + delta,
      y: start.y + delta,
    });
  }

  if (corner === 'top-right') {
    const maxGrow = Math.min(AVATAR_PREVIEW_SIZE - (start.x + start.size), start.y);
    const delta = Math.min(
      maxGrow,
      Math.max(-(start.size - AVATAR_MIN_CROP_SIZE), Math.max(deltaX, -deltaY)),
    );
    return clampCropSquare({
      size: start.size + delta,
      y: start.y - delta,
      x: start.x,
    });
  }

  const maxGrow = Math.min(start.x, AVATAR_PREVIEW_SIZE - (start.y + start.size));
  const delta = Math.min(
    maxGrow,
    Math.max(-(start.size - AVATAR_MIN_CROP_SIZE), Math.max(-deltaX, deltaY)),
  );
  return clampCropSquare({
    size: start.size + delta,
    x: start.x - delta,
    y: start.y,
  });
}

async function createSquareAvatarBlob(
  imageUrl: string,
  zoom: number,
  crop: CropSquare,
  size = 512,
): Promise<Blob> {
  const image = new window.Image();
  image.crossOrigin = 'anonymous';

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Unable to load selected image.'));
    image.src = imageUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to process image.');
  }

  const baseScale = Math.max(AVATAR_PREVIEW_SIZE / image.width, AVATAR_PREVIEW_SIZE / image.height);
  const finalScale = baseScale * zoom;
  const drawWidth = image.width * finalScale;
  const drawHeight = image.height * finalScale;
  const offsetX = (AVATAR_PREVIEW_SIZE - drawWidth) / 2;
  const offsetY = (AVATAR_PREVIEW_SIZE - drawHeight) / 2;

  const sourceX = Math.max(0, (crop.x - offsetX) / finalScale);
  const sourceY = Math.max(0, (crop.y - offsetY) / finalScale);
  const sourceSize = Math.max(1, crop.size / finalScale);
  const maxSourceWidth = Math.max(1, image.width - sourceX);
  const maxSourceHeight = Math.max(1, image.height - sourceY);
  const boundedSourceSize = Math.min(sourceSize, maxSourceWidth, maxSourceHeight);

  context.clearRect(0, 0, size, size);
  context.drawImage(
    image,
    sourceX,
    sourceY,
    boundedSourceSize,
    boundedSourceSize,
    0,
    0,
    size,
    size,
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Unable to export edited image.'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      0.92,
    );
  });
}

type ProfileActionsMenuProps = {
  mode: 'dark' | 'light';
  onCopyProfileLink: () => Promise<void>;
  onShareProfile: () => Promise<void>;
  profileHandleLabel: string;
  t: ReturnType<typeof useTranslation>['t'];
};

function ProfileActionsMenu({
  mode,
  onCopyProfileLink,
  onShareProfile,
  profileHandleLabel,
  t,
}: ProfileActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="white-outline"
          className="h-9 w-9 rounded-full border-none bg-transparent"
          aria-label={t('discover.web.openProfileActions', 'Open profile actions')}
        >
          <DotsHorizontal className="text-foreground size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={cn(
          'border-border w-63 rounded border p-3 shadow-[3px_3px_12px_0px_rgba(0,0,0,0.15)]',
          mode === 'dark' ? 'bg-neutral-900' : 'bg-white',
        )}
      >
        <DropdownMenuItem
          className="text-foreground text-body-large-semibold hover:bg-muted focus:bg-muted gap-3 rounded px-3 py-4 transition-colors"
          onClick={() => void onShareProfile()}
        >
          <Share04 className="size-5" />
          <span>
            {t('discover.web.shareProfile', 'Share {{handle}}', {
              handle: profileHandleLabel,
            })}
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-foreground text-body-large-semibold hover:bg-muted focus:bg-muted gap-3 rounded px-3 py-4 transition-colors"
          onClick={() => void onCopyProfileLink()}
        >
          <LinkExternal01 className="size-5" />
          <span>{t('discover.web.copyProfileLink', 'Copy profile link')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="text-body-large-semibold gap-3 rounded px-3 py-4 text-red-500 transition-colors hover:bg-red-50 focus:bg-red-50 dark:hover:bg-red-500/10 dark:focus:bg-red-500/10">
          <MinusCircle className="size-5" />
          <span>
            {t('discover.web.blockProfile', 'Block {{handle}}', {
              handle: profileHandleLabel,
            })}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EditProfileDialog({
  currentBio,
  currentBanner,
  currentDisplayName,
  currentLocation,
  currentUserName,
  onSaved,
  onSavedPosts,
  onOpenChange,
  open,
  userAvatar,
}: {
  currentBio?: string;
  currentBanner?: string;
  currentDisplayName?: string;
  currentLocation?: string;
  currentUserName: string;
  onSaved: () => Promise<void> | void;
  onSavedPosts: () => Promise<void> | void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  userAvatar: string;
}) {
  const { t } = useTranslation();
  const { showError, showSuccess } = useToast();
  const [displayName, setDisplayName] = useState(currentDisplayName || '');
  const [username, setUsername] = useState(currentUserName);
  const [bio, setBio] = useState(currentBio || '');
  const [location, setLocation] = useState(currentLocation || '');
  const [previewAvatar, setPreviewAvatar] = useState(userAvatar);
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);
  const [previewBanner, setPreviewBanner] = useState(currentBanner || DEFAULT_PROFILE_BANNER);
  const [pendingBanner, setPendingBanner] = useState<string | null>(null);
  const [editorImageUrl, setEditorImageUrl] = useState<string | null>(null);
  const [editorCrop, setEditorCrop] = useState<CropSquare>(getDefaultCropSquare);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorZoom, setEditorZoom] = useState(1);
  const [isApplyingAvatar, setIsApplyingAvatar] = useState(false);
  const [isConfirmDiscardOpen, setIsConfirmDiscardOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const cropResizeStateRef = useRef<{
    corner: CropCorner;
    startCrop: CropSquare;
    startX: number;
    startY: number;
  } | null>(null);
  const cropMoveStateRef = useRef<{
    startCrop: CropSquare;
    startX: number;
    startY: number;
  } | null>(null);
  const [initialDisplayName, setInitialDisplayName] = useState('');
  const [initialUsername, setInitialUsername] = useState('');
  const [initialBio, setInitialBio] = useState('');
  const [initialLocation, setInitialLocation] = useState('');
  const [initialAvatar, setInitialAvatar] = useState(userAvatar);
  const [initialBanner, setInitialBanner] = useState(currentBanner || DEFAULT_PROFILE_BANNER);

  const hasUnsavedChanges =
    displayName !== initialDisplayName ||
    username !== initialUsername ||
    bio !== initialBio ||
    location !== initialLocation ||
    previewAvatar !== initialAvatar ||
    previewBanner !== initialBanner ||
    Boolean(pendingAvatar) ||
    Boolean(pendingBanner);

  useEffect(() => {
    if (!open) {
      return;
    }
    setDisplayName(currentDisplayName || '');
    setUsername(currentUserName);
    setBio(currentBio || '');
    setLocation(currentLocation || '');
    setPreviewAvatar(userAvatar);
    setPendingAvatar(null);
    setPreviewBanner(currentBanner || DEFAULT_PROFILE_BANNER);
    setPendingBanner(null);
    setEditorImageUrl(null);
    setEditorCrop(getDefaultCropSquare());
    setIsEditorOpen(false);
    setEditorZoom(1);
    setIsConfirmDiscardOpen(false);
    setInitialDisplayName(currentDisplayName || '');
    setInitialUsername(currentUserName);
    setInitialBio(currentBio || '');
    setInitialLocation(currentLocation || '');
    setInitialAvatar(userAvatar);
    setInitialBanner(currentBanner || DEFAULT_PROFILE_BANNER);
  }, [
    currentBanner,
    currentBio,
    currentDisplayName,
    currentLocation,
    currentUserName,
    open,
    userAvatar,
  ]);

  useEffect(() => {
    return () => {
      if (editorImageUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(editorImageUrl);
      }
    };
  }, [editorImageUrl]);

  const handleSave = async () => {
    const trimmedUsername = username.trim();
    if (!trimmedUsername) {
      showError('Update failed', 'Username is required.');
      return;
    }

    if (!isValidUsername(trimmedUsername)) {
      showError(
        t('personalInfoEditUsername.usernameInvalidTitle', 'Invalid username'),
        t(
          'personalInfoEditUsername.usernameInvalidMessage',
          'Username can only contain lowercase letters (a-z), numbers (0-9), and underscore (_).',
        ),
      );
      return;
    }

    setIsSaving(true);
    try {
      await authApi.updateProfile({
        username: trimmedUsername,
        displayName: displayName.trim(),
        bio: bio.trim(),
        location: location.trim(),
        ...(pendingAvatar ? { avatar: pendingAvatar } : {}),
        ...(pendingBanner ? { coverAvatar: pendingBanner } : {}),
      });
      await onSaved();
      await onSavedPosts();
      showSuccess('Profile updated', 'Your profile has been updated successfully.');
      onOpenChange(false);
    } catch (error) {
      showError(
        'Update failed',
        error instanceof Error ? error.message : 'Failed to update profile. Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      if (editorImageUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(editorImageUrl);
      }
      const localPreviewUrl = URL.createObjectURL(file);
      setEditorImageUrl(localPreviewUrl);
      setEditorCrop(getDefaultCropSquare());
      setEditorZoom(1);
      setIsEditorOpen(true);
    } finally {
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  };

  const openAvatarPicker = () => {
    if (isUploadingAvatar || isUploadingBanner || isSaving || isApplyingAvatar) {
      return;
    }
    avatarInputRef.current?.click();
  };

  const openBannerPicker = () => {
    if (isUploadingAvatar || isUploadingBanner || isSaving || isApplyingAvatar) {
      return;
    }
    bannerInputRef.current?.click();
  };

  const handleBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsUploadingBanner(true);
    try {
      const uploadedBanner = await imageApi.uploadImageToPresignedUrl(file, {
        type: file.type,
        fileName: file.name,
      });

      setPreviewBanner(uploadedBanner);
      setPendingBanner(uploadedBanner);
      showSuccess('Cover photo updated', 'Cover photo is ready. Press Save to update profile.');
    } catch (error) {
      showError(
        'Upload failed',
        error instanceof Error ? error.message : 'Failed to upload cover photo. Please try again.',
      );
    } finally {
      setIsUploadingBanner(false);
      if (bannerInputRef.current) {
        bannerInputRef.current.value = '';
      }
    }
  };

  const openEditorWithCurrentAvatar = () => {
    if (isUploadingAvatar || isUploadingBanner || isSaving || isApplyingAvatar) {
      return;
    }
    setEditorImageUrl(previewAvatar);
    setEditorCrop(getDefaultCropSquare());
    setEditorZoom(1);
    setIsEditorOpen(true);
  };

  const handleCropCornerPointerDown = (
    corner: CropCorner,
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    if (!editorImageUrl || isApplyingAvatar) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    cropResizeStateRef.current = {
      corner,
      startCrop: editorCrop,
      startX: event.clientX,
      startY: event.clientY,
    };
  };

  const handleCropCornerPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!cropResizeStateRef.current || !editorImageUrl || isApplyingAvatar) {
      return;
    }

    const deltaX = event.clientX - cropResizeStateRef.current.startX;
    const deltaY = event.clientY - cropResizeStateRef.current.startY;
    const resized = resizeCropSquare(
      cropResizeStateRef.current.startCrop,
      cropResizeStateRef.current.corner,
      deltaX,
      deltaY,
    );
    setEditorCrop(resized);
  };

  const handleCropCornerPointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    cropResizeStateRef.current = null;
  };

  const handleCropMovePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!editorImageUrl || isApplyingAvatar || cropResizeStateRef.current) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    cropMoveStateRef.current = {
      startCrop: editorCrop,
      startX: event.clientX,
      startY: event.clientY,
    };
  };

  const handleCropMovePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!cropMoveStateRef.current || !editorImageUrl || isApplyingAvatar) {
      return;
    }

    const deltaX = event.clientX - cropMoveStateRef.current.startX;
    const deltaY = event.clientY - cropMoveStateRef.current.startY;
    setEditorCrop(
      clampCropSquare({
        ...cropMoveStateRef.current.startCrop,
        x: cropMoveStateRef.current.startCrop.x + deltaX,
        y: cropMoveStateRef.current.startCrop.y + deltaY,
      }),
    );
  };

  const handleCropMovePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    cropMoveStateRef.current = null;
  };

  const handleApplyAvatarEdit = async () => {
    if (!editorImageUrl) {
      showError('No image selected', 'Please choose an image to continue.');
      return;
    }

    setIsApplyingAvatar(true);
    setIsUploadingAvatar(true);
    try {
      const editedBlob = await createSquareAvatarBlob(editorImageUrl, editorZoom, editorCrop);
      const editedFile = new File([editedBlob], `avatar-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const avatar = await imageApi.uploadImageToPresignedUrl(editedFile, {
        type: editedFile.type,
        fileName: editedFile.name,
      });

      setPreviewAvatar(avatar);
      setPendingAvatar(avatar);
      setIsEditorOpen(false);
      showSuccess('Photo applied', 'Edited photo is ready. Press Save to update profile.');
    } catch (error) {
      showError(
        'Apply failed',
        error instanceof Error
          ? error.message
          : 'Failed to process edited image. Please try again.',
      );
    } finally {
      setIsApplyingAvatar(false);
      setIsUploadingAvatar(false);
    }
  };

  const handleRequestClose = useCallback(() => {
    if (
      hasUnsavedChanges ||
      isUploadingAvatar ||
      isUploadingBanner ||
      isApplyingAvatar ||
      isSaving
    ) {
      setIsConfirmDiscardOpen(true);
      return;
    }
    onOpenChange(false);
  }, [
    hasUnsavedChanges,
    isApplyingAvatar,
    isSaving,
    isUploadingAvatar,
    isUploadingBanner,
    onOpenChange,
  ]);

  const handleConfirmSaveAndExit = useCallback(async () => {
    await handleSave();
    setIsConfirmDiscardOpen(false);
  }, [handleSave]);

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          handleRequestClose();
        }
      }}
    >
      <DialogContent
        className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-lg border-none p-0 sm:max-h-[80vh] sm:w-auto sm:min-w-154.25"
        showCloseButton={false}
        onEscapeKeyDown={(event) => {
          if (
            hasUnsavedChanges ||
            isUploadingAvatar ||
            isUploadingBanner ||
            isApplyingAvatar ||
            isSaving
          ) {
            event.preventDefault();
            setIsConfirmDiscardOpen(true);
          }
        }}
        onInteractOutside={(event) => {
          if (
            hasUnsavedChanges ||
            isUploadingAvatar ||
            isUploadingBanner ||
            isApplyingAvatar ||
            isSaving
          ) {
            event.preventDefault();
            setIsConfirmDiscardOpen(true);
          }
        }}
      >
        <DialogTitle className="sr-only">
          {t('discover.web.editProfile', 'Edit profile')}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {t(
            'discover.web.editProfileDialogDescription',
            'Update your profile details, avatar, and cover image.',
          )}
        </DialogDescription>

        <div className="flex items-center justify-between px-4 pt-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors"
              onClick={handleRequestClose}
            >
              <XClose className="size-6" />
            </button>
            <p className="text-foreground text-base font-semibold">
              {t('discover.web.editProfile', 'Edit profile')}
            </p>
          </div>

          <Button
            type="button"
            variant="primary-contained"
            className="text-button-small-medium px-3 py-2"
            onClick={handleSave}
            disabled={isSaving}
          >
            {t('discover.web.save', 'Save')}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="relative h-30 overflow-hidden bg-neutral-300 sm:h-38.25">
            {previewBanner ? (
              <Image
                src={previewBanner}
                alt={t('discover.web.profileBanner', 'Profile cover')}
                fill
                className="object-cover"
              />
            ) : null}
            <button
              type="button"
              className="absolute right-3 bottom-3 rounded-full bg-neutral-500/80 p-2 text-white"
              aria-label={t('discover.web.changeCover', 'Change cover')}
              onClick={openBannerPicker}
              disabled={isUploadingBanner || isSaving}
            >
              <CameraPlus className="size-5" />
            </button>
          </div>

          <div className="space-y-4 p-4 pt-0 pb-6 sm:space-y-6">
            <div className="-mt-10 flex flex-col items-start gap-3 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
              <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-[#A03717] sm:h-30 sm:w-30">
                <Image src={previewAvatar} alt={currentUserName} fill className="object-cover" />
                <button
                  type="button"
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-500/80 p-2 text-white"
                  aria-label={t('discover.web.changeAvatar', 'Change avatar')}
                  onClick={openAvatarPicker}
                  disabled={isUploadingAvatar || isUploadingBanner || isSaving}
                >
                  <CameraPlus className="size-5" />
                </button>
              </div>

              <div className="border-border bg-background flex w-full flex-col gap-3 rounded border px-3 py-2 sm:flex-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <p className="text-foreground text-button-large-semibold">
                    {t('discover.web.editPhotoWithImagine', 'Edit your photo with Imagine')}
                  </p>
                  <p className="text-muted-foreground text-body-small-regular">
                    {t('discover.web.customizeInSeconds', 'Customize yourself in seconds')}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="neutral-contained"
                  className="text-button-small-medium w-full px-3 py-2 sm:w-auto"
                  onClick={openEditorWithCurrentAvatar}
                  disabled={isUploadingAvatar || isUploadingBanner || isSaving || isApplyingAvatar}
                >
                  <Edit05 className="size-5" />
                  {t('discover.web.editPhoto', 'Edit photo')}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-col gap-1">
                <label className="text-foreground text-body-small-semibold b-1">
                  {t('discover.web.displayName', 'Display Name')}
                </label>
                <Input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  maxLength={50}
                  className="text-body-small-medium text-muted-foreground px-3 py-2 focus-visible:ring-0 dark:bg-transparent"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-foreground text-body-small-semibold">
                  {t('discover.web.username', 'Username')}
                </label>
                <Input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  maxLength={50}
                  className="text-body-small-medium text-muted-foreground px-3 py-2 focus-visible:ring-0 dark:bg-transparent"
                />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-foreground text-body-small-semibold">
                    {t('discover.web.bio', 'Bio')}
                  </label>
                  <span className="text-muted-foreground text-caption-regular">
                    {bio.length}/{PROFILE_BIO_MAX_LENGTH}
                  </span>
                </div>
                <Textarea
                  placeholder={t('discover.web.bioPlaceholder', 'Bio')}
                  className="focus-visible:border-primary-500 min-h-36.25 text-sm focus-visible:ring-0 dark:bg-transparent"
                  value={bio}
                  maxLength={PROFILE_BIO_MAX_LENGTH}
                  onChange={(event) => setBio(event.target.value.slice(0, PROFILE_BIO_MAX_LENGTH))}
                />
              </div>
            </div>
          </div>
        </div>

        <input
          ref={avatarInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleAvatarUpload}
        />
        <input
          ref={bannerInputRef}
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleBannerUpload}
        />

        <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
          <DialogContent
            className="flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-[94vw] flex-col overflow-hidden rounded-lg border-none p-0 sm:max-h-[90vh] sm:w-172"
            showCloseButton={false}
          >
            <DialogTitle className="sr-only">
              {t('discover.web.editProfilePhotoTitle', 'Edit profile photo')}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t(
                'discover.web.editProfilePhotoDescription',
                'Crop and zoom your profile photo before applying changes.',
              )}
            </DialogDescription>
            <div className="bg-card flex items-center justify-between gap-2 px-3 py-3 sm:px-4">
              <Button
                variant="white-contained"
                className="text-foreground hover:text-foreground/80 text-body-small-medium inline-flex items-center gap-2 bg-transparent"
                onClick={() => setIsEditorOpen(false)}
                disabled={isApplyingAvatar}
              >
                <ArrowLeft className="size-5" />
                {t('discover.web.editMedia', 'Edit media')}
              </Button>
              <Button
                type="button"
                variant="primary-contained"
                className="text-button-small-medium h-8 px-3"
                onClick={handleApplyAvatarEdit}
                disabled={!editorImageUrl || isApplyingAvatar}
              >
                {t('discover.web.apply', 'Apply')}
              </Button>
            </div>

            <div className="overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
              <div className="relative mx-auto h-[min(70vw,252px)] w-[min(70vw,252px)] overflow-hidden bg-black sm:h-63 sm:w-63">
                {editorImageUrl ? (
                  <Image
                    src={editorImageUrl}
                    alt={t('discover.web.avatarEditorPreviewAlt', 'Avatar editor preview')}
                    width={252}
                    height={252}
                    className="h-full w-full object-cover"
                    unoptimized
                    style={{ transform: `scale(${editorZoom})` }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={openAvatarPicker}
                    className="text-muted-foreground hover:text-foreground flex h-full w-full items-center justify-center text-sm"
                  >
                    {t('discover.web.choosePhoto', 'Choose photo')}
                  </button>
                )}

                {editorImageUrl ? (
                  <div className="pointer-events-none absolute inset-0">
                    <div className="absolute inset-0">
                      <div
                        className="pointer-events-auto absolute cursor-move border-2 border-white"
                        style={{
                          width: `${editorCrop.size}px`,
                          height: `${editorCrop.size}px`,
                          left: `${editorCrop.x}px`,
                          top: `${editorCrop.y}px`,
                          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4)',
                        }}
                        onPointerDown={handleCropMovePointerDown}
                        onPointerMove={handleCropMovePointerMove}
                        onPointerUp={handleCropMovePointerUp}
                        onPointerCancel={handleCropMovePointerUp}
                      >
                        <div
                          className="absolute inset-0"
                          style={{
                            backgroundImage: `
                              linear-gradient(to right, rgba(255,255,255,0.6) 1px, transparent 1px),
                              linear-gradient(to bottom, rgba(255,255,255,0.6) 1px, transparent 1px)
                            `,
                            backgroundSize: '33.33% 33.33%',
                          }}
                        />

                        <div className="absolute -top-1 -left-1 h-4 w-4 border-t-2 border-l-2 border-white" />
                        <div className="absolute -top-1 -right-1 h-4 w-4 border-t-2 border-r-2 border-white" />
                        <div className="absolute -bottom-1 -left-1 h-4 w-4 border-b-2 border-l-2 border-white" />
                        <div className="absolute -right-1 -bottom-1 h-4 w-4 border-r-2 border-b-2 border-white" />

                        <button
                          type="button"
                          aria-label={t('discover.web.resizeCropTopLeft', 'Resize crop top left')}
                          className="pointer-events-auto absolute -top-3 -left-3 h-6 w-6 cursor-nwse-resize bg-transparent"
                          onPointerDown={(event) => handleCropCornerPointerDown('top-left', event)}
                          onPointerMove={handleCropCornerPointerMove}
                          onPointerUp={handleCropCornerPointerUp}
                          onPointerCancel={handleCropCornerPointerUp}
                        />
                        <button
                          type="button"
                          aria-label={t('discover.web.resizeCropTopRight', 'Resize crop top right')}
                          className="pointer-events-auto absolute -top-3 -right-3 h-6 w-6 cursor-nesw-resize bg-transparent"
                          onPointerDown={(event) => handleCropCornerPointerDown('top-right', event)}
                          onPointerMove={handleCropCornerPointerMove}
                          onPointerUp={handleCropCornerPointerUp}
                          onPointerCancel={handleCropCornerPointerUp}
                        />
                        <button
                          type="button"
                          aria-label={t(
                            'discover.web.resizeCropBottomLeft',
                            'Resize crop bottom left',
                          )}
                          className="pointer-events-auto absolute -bottom-3 -left-3 h-6 w-6 cursor-nesw-resize bg-transparent"
                          onPointerDown={(event) =>
                            handleCropCornerPointerDown('bottom-left', event)
                          }
                          onPointerMove={handleCropCornerPointerMove}
                          onPointerUp={handleCropCornerPointerUp}
                          onPointerCancel={handleCropCornerPointerUp}
                        />
                        <button
                          type="button"
                          aria-label={t(
                            'discover.web.resizeCropBottomRight',
                            'Resize crop bottom right',
                          )}
                          className="pointer-events-auto absolute -right-3 -bottom-3 h-6 w-6 cursor-nwse-resize bg-transparent"
                          onPointerDown={(event) =>
                            handleCropCornerPointerDown('bottom-right', event)
                          }
                          onPointerMove={handleCropCornerPointerMove}
                          onPointerUp={handleCropCornerPointerUp}
                          onPointerCancel={handleCropCornerPointerUp}
                        />
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="border-border bg-card flex items-center gap-3 border-t px-4 py-3 sm:px-6">
              <button
                type="button"
                onClick={() =>
                  setEditorZoom((prev) => Math.max(1, Number((prev - 0.1).toFixed(2))))
                }
                disabled={!editorImageUrl || isApplyingAvatar}
                className="text-muted-foreground hover:text-foreground disabled:text-muted-foreground/60 text-lg"
              >
                <ZoomOut className="size-5" />
              </button>
              <input
                type="range"
                min={1}
                max={2.5}
                step={0.1}
                value={editorZoom}
                onChange={(event) => setEditorZoom(Number(event.target.value))}
                className="accent-primary-500 h-1 w-full"
                disabled={!editorImageUrl || isApplyingAvatar}
              />
              <button
                type="button"
                onClick={() =>
                  setEditorZoom((prev) => Math.min(2.5, Number((prev + 0.1).toFixed(2))))
                }
                disabled={!editorImageUrl || isApplyingAvatar}
                className="text-muted-foreground hover:text-foreground disabled:text-muted-foreground/60 text-lg"
              >
                <ZoomIn className="size-5" />
              </button>
            </div>
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
                'You changed this profile. Do you want to leave or save before leaving?',
              )}
            </DialogDescription>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="neutral-outline"
                className="h-10"
                onClick={() => {
                  setIsConfirmDiscardOpen(false);
                  onOpenChange(false);
                }}
              >
                {t('discover.web.leaveAnyway', 'Still leave')}
              </Button>
              <Button
                type="button"
                variant="primary-contained"
                className="h-10"
                onClick={() => void handleConfirmSaveAndExit()}
                disabled={isSaving || isUploadingAvatar || isUploadingBanner || isApplyingAvatar}
              >
                {t('discover.web.saveAndLeave', 'Save and leave')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

type FollowListUser = Pick<UserRelationListItem, 'avatar' | 'id' | 'username'> & {
  displayName?: null | string;
};

function FollowListDialog({
  onOpenChange,
  open,
  type,
  userId,
  onOpenAuthorProfile,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  type: 'following' | 'followers' | null;
  userId: string;
  onOpenAuthorProfile?: (authorId: string) => void;
}) {
  const { t } = useTranslation();
  const { showError } = useToast();
  const [users, setUsers] = useState<FollowListUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open || !userId || !type) return;

    let isMounted = true;
    setIsLoading(true);

    const fetchRelations = async () => {
      try {
        const relation = type === 'following' ? 'followings' : 'follower';
        const response = await userApi.listMyRelations({
          relation,
          skip: 0,
          take: 50,
          userId,
        });

        if (isMounted) {
          setUsers(response.data ?? []);
        }
      } catch (error) {
        if (isMounted) {
          setUsers([]);
          showError(
            t('discover.web.loadUsersFailedTitle', 'Unable to load users'),
            localizeApiError(error, t, 'discover.web.loadUsersFailedMessage'),
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchRelations();

    return () => {
      isMounted = false;
    };
  }, [open, showError, t, type, userId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[80dvh] w-full flex-col overflow-hidden rounded border-none p-0 sm:rounded"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">
          {' '}
          {type === 'following'
            ? t('discover.web.following', 'Following')
            : t('discover.web.followers', 'Followers')}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {t('discover.web.noUsersFound', 'No followers yet.')}
        </DialogDescription>
        <div className="bg-background border-border flex shrink-0 items-center justify-between border-b p-4 sm:p-6">
          <p className="text-foreground text-body-large-semibold">
            {type === 'following'
              ? t('discover.web.following', 'Following')
              : t('discover.web.followers', 'Followers')}
          </p>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <XClose className="size-6" />
          </button>
        </div>
        <div className="scrollbar-neutral-slim overflow-y-auto p-4 sm:p-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="bg-muted h-11 w-11 shrink-0 animate-pulse rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="bg-muted h-4 w-24 animate-pulse rounded" />
                    <div className="bg-muted h-3 w-16 animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : users.length > 0 ? (
            <div className="space-y-4">
              {users.map((u, index) => (
                <div key={u.id || index} className="flex items-center justify-between">
                  <button
                    type="button"
                    className="flex items-center gap-3 text-left transition-opacity hover:opacity-80"
                    onClick={() => {
                      if (u.id && onOpenAuthorProfile) {
                        onOpenAuthorProfile(u.id);
                        onOpenChange(false);
                      }
                    }}
                  >
                    <div className="bg-muted relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
                      <Image
                        src={u.avatar || DISCOVER_USER_PLACEHOLDER_ICON}
                        alt={u.displayName || u.username || 'User avatar'}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-foreground text-body-small-medium">
                        {u.displayName || u.username}
                      </p>
                      <p className="text-muted-foreground text-caption-regular">@{u.username}</p>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-body-small-regular py-8 text-center">
              {t('discover.web.noUsersFound', 'No following yet.')}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MyWall({ onOpenAuthorProfile }: MyWallProps) {
  const { i18n, t } = useTranslation();
  const pathname = usePathname() || DISCOVER_BASE_PATH;
  const searchParams = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const updateAuthUser = useAuthStore((state) => state.updateUser);
  const { me, refetchMe } = useGetData();
  const [isEditProfileDialogOpen, setIsEditProfileDialogOpen] = useState(false);
  const [isAvatarPreviewOpen, setIsAvatarPreviewOpen] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<WallSubTab>('posts');
  const [followListType, setFollowListType] = useState<'following' | 'followers' | null>(null);
  const sharedPostSlugFromPath = useMemo(() => getSharedPostSlugFromPathname(pathname), [pathname]);
  const [sharedPostSlugParam, setSharedPostSlugParam] = useState(sharedPostSlugFromPath);
  const isClosingSharedPostRef = useRef(false);

  useEffect(() => {
    setSharedPostSlugParam(sharedPostSlugFromPath);
  }, [sharedPostSlugFromPath]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const syncSharedPostSlugFromLocation = () => {
      setSharedPostSlugParam(getSharedPostSlugFromPathname(window.location.pathname));
    };

    window.addEventListener('popstate', syncSharedPostSlugFromLocation);
    return () => {
      window.removeEventListener('popstate', syncSharedPostSlugFromLocation);
    };
  }, []);

  useEffect(() => {
    if (!sharedPostSlugParam) {
      isClosingSharedPostRef.current = false;
    }
  }, [sharedPostSlugParam]);

  const activeUser = me || user;
  const canOpenFollowList = Boolean(activeUser?.id);
  const displayName =
    activeUser?.displayName?.trim() || activeUser?.username?.split('@')[0] || 'User';
  const displayHandle = activeUser?.username
    ? `@${activeUser.username}`
    : t('discover.web.guestHandle', '@guest');
  const joinedLabel = useMemo(() => {
    if (!activeUser?.createdAt) {
      return null;
    }

    const joinedDate = new Date(activeUser.createdAt);
    if (Number.isNaN(joinedDate.getTime())) {
      return null;
    }

    const formatted = new Intl.DateTimeFormat(i18n.language || 'en', {
      month: 'long',
      year: 'numeric',
    }).format(joinedDate);

    return t('discover.web.joinedDate', 'Joined {{date}}', { date: formatted });
  }, [activeUser?.createdAt, i18n.language, t]);
  const activeUserCoverAvatar =
    activeUser && 'coverAvatar' in activeUser
      ? (activeUser as { coverAvatar?: null | string }).coverAvatar
      : undefined;
  const safeUserBanner = activeUserCoverAvatar || DEFAULT_PROFILE_BANNER;
  const safeUserAvatar = activeUser?.avatar || DISCOVER_USER_PLACEHOLDER_ICON;
  const profileHandleLabel = displayHandle || '@user';
  const wallTabs: { id: WallSubTab; label: string }[] = [
    { id: 'posts', label: t('discover.web.posts', 'Posts') },
    { id: 'pending', label: t('discover.web.pending', 'Pending') },
  ];

  const removeSharedPostSlugFromUrl = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const currentPath = window.location.pathname;
    if (!currentPath.startsWith(`${DISCOVER_BASE_PATH}/`)) {
      setSharedPostSlugParam('');
      return;
    }

    const nextUrl = `${DISCOVER_BASE_PATH}${window.location.search || ''}${window.location.hash || ''}`;
    window.history.replaceState(window.history.state, '', nextUrl);
    setSharedPostSlugParam('');
  }, []);

  const openSharedPostDetail = useCallback(
    (postSlug: string) => {
      if (typeof window === 'undefined') {
        return;
      }

      const normalizedPostSlug = postSlug.trim();
      if (!normalizedPostSlug) {
        return;
      }

      const params = new URLSearchParams(searchParams.toString());
      params.delete('id');
      const nextQuery = params.toString();
      const detailPath = `${DISCOVER_BASE_PATH}/${encodeURIComponent(normalizedPostSlug)}`;
      const nextUrl = `${nextQuery ? `${detailPath}?${nextQuery}` : detailPath}${window.location.hash || ''}`;
      window.history.pushState(window.history.state, '', nextUrl);
      setSharedPostSlugParam(normalizedPostSlug);
    },
    [searchParams],
  );

  const closeSharedPostDetail = useCallback(() => {
    if (isClosingSharedPostRef.current) {
      return;
    }

    isClosingSharedPostRef.current = true;
    removeSharedPostSlugFromUrl();
  }, [removeSharedPostSlugFromUrl]);

  const handleTogglePostDetail = useCallback(
    (post: { slug: string }, isOpen: boolean) => {
      if (isOpen) {
        closeSharedPostDetail();
        return;
      }

      isClosingSharedPostRef.current = false;
      openSharedPostDetail(post.slug);
    },
    [closeSharedPostDetail, openSharedPostDetail],
  );

  const profileLink = useMemo(() => {
    if (typeof window === 'undefined' || !activeUser?.id) {
      return '';
    }

    const profileUrl = new URL(window.location.href);
    profileUrl.searchParams.set('tab', 'profile');
    profileUrl.searchParams.set('userId', activeUser.id);
    return profileUrl.toString();
  }, [activeUser?.id]);

  const { showInfo, showSuccess } = useToast();

  const handleShareProfile = useCallback(async () => {
    if (!profileLink) {
      return;
    }

    const shareText = t('discover.web.shareProfileText', 'Check out this profile');
    if (navigator.share) {
      try {
        await navigator.share({
          text: shareText,
          title: profileHandleLabel,
          url: profileLink,
        });
        return;
      } catch {
        // Fall back to clipboard if share is unavailable or canceled.
      }
    }

    try {
      await navigator.clipboard.writeText(profileLink);
      showSuccess(
        t('discover.web.profileLinkCopiedTitle', 'Copied'),
        t('discover.web.profileLinkCopiedMessage', 'Profile link copied.'),
      );
    } catch {
      showInfo(
        t('discover.web.shareUnavailableTitle', 'Share unavailable'),
        t('discover.web.shareUnavailableMessage', 'Unable to share this profile right now.'),
      );
    }
  }, [profileHandleLabel, profileLink, showInfo, showSuccess, t]);

  const handleCopyProfileLink = useCallback(async () => {
    if (!profileLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(profileLink);
      showSuccess(
        t('discover.web.profileLinkCopiedTitle', 'Copied'),
        t('discover.web.profileLinkCopiedMessage', 'Profile link copied.'),
      );
    } catch {
      showInfo(
        t('discover.web.copyUnavailableTitle', 'Copy unavailable'),
        t('discover.web.copyUnavailableMessage', 'Unable to copy profile link right now.'),
      );
    }
  }, [profileLink, showInfo, showSuccess, t]);

  return (
    <div className="flex w-full flex-col">
      {activeUser && (
        <div className="flex w-full flex-col pb-6">
          <div className="bg-muted relative h-48 w-full sm:h-60">
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${safeUserBanner})` }}
            />

            <div className="absolute right-4 bottom-4 z-15 flex">
              <Button
                type="button"
                variant="white-outline"
                className="bg-background hover:bg-background dark:bg-card text-foreground border-border text-body-small-medium px-3 py-2 backdrop-blur-sm"
                onClick={() => setIsEditProfileDialogOpen(true)}
              >
                {t('discover.web.editProfile', 'Edit profile')}
              </Button>
            </div>
          </div>

          <div className="flex flex-col px-4">
            <div className="relative z-10 -mt-10 flex items-end gap-3 sm:-mt-14">
              <button
                type="button"
                className="cursor-zoom-in rounded-full"
                onClick={() => setIsAvatarPreviewOpen(true)}
                aria-label={t('discover.web.previewProfilePhoto', 'Preview profile photo')}
              >
                <div className="border-background bg-muted relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 shadow-sm sm:h-32 sm:w-32">
                  {activeUser.avatar ? (
                    <Image
                      src={activeUser.avatar}
                      alt={displayName}
                      fill
                      className="object-cover object-center"
                    />
                  ) : (
                    <div className="text-muted-foreground text-h2-bold sm:text-h1-bold flex h-full w-full items-center justify-center">
                      {(activeUser.username || activeUser.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                </div>
              </button>
              <div className="mb-1 flex min-w-0 flex-row gap-2 sm:mb-2 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-col">
                  <h2 className="text-foreground text-h3-semibold sm:text-h2-semibold truncate">
                    {displayName}
                  </h2>
                  <p className="text-muted-foreground text-body-small-regular mt-1 truncate">
                    {displayHandle}
                  </p>
                </div>
              </div>
            </div>

            {activeUser.bio && (
              <p className="text-muted-foreground text-body-small-regular sm:text-body-large-regular mt-3 truncate whitespace-pre-wrap">
                {activeUser.bio}
              </p>
            )}

            {joinedLabel ? (
              <div className="text-muted-foreground text-body-small-regular mt-3 flex items-center gap-1">
                <Calendar className="size-4 shrink-0" />
                <span>{joinedLabel}</span>
              </div>
            ) : null}

            <div className="text-muted-foreground text-body-small-regular mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => canOpenFollowList && setFollowListType('following')}
                disabled={!canOpenFollowList}
                className={cn(
                  'transition-colors',
                  canOpenFollowList ? 'hover:text-foreground hover:underline' : 'cursor-default',
                )}
              >
                <strong className="text-foreground">{activeUser.followingCount ?? 0}</strong>{' '}
                {t('discover.web.following', 'Following')}
              </button>
              <button
                type="button"
                onClick={() => canOpenFollowList && setFollowListType('followers')}
                disabled={!canOpenFollowList}
                className={cn(
                  'transition-colors',
                  canOpenFollowList ? 'hover:text-foreground hover:underline' : 'cursor-default',
                )}
              >
                <strong className="text-foreground">{activeUser.followerCount ?? 0}</strong>{' '}
                {t('discover.web.followers', 'Followers')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="border-border flex border-b">
        {wallTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSubTab(tab.id)}
            className={cn(
              'text-body-small-medium sm:text-body-large-medium relative flex-1 py-3 text-center transition-colors',
              activeSubTab === tab.id
                ? '!text-body-small-semibold text-primary-500'
                : 'text-muted-foreground hover:text-foreground text-body-small-medium',
            )}
          >
            {tab.label}
            {activeSubTab === tab.id ? (
              <span className="bg-primary-500 absolute right-0 bottom-0 left-0 h-0.5" />
            ) : null}
          </button>
        ))}
      </div>

      <WallFeed
        userId={activeUser?.id}
        onOpenAuthorProfile={onOpenAuthorProfile}
        onTogglePostDetail={handleTogglePostDetail}
        showFollowButton={false}
        status={activeSubTab === 'pending' ? 'PENDING' : 'APPROVED'}
        emptyMessage={
          activeSubTab === 'pending'
            ? t('discover.web.profileNoPendingYet', 'No pending yet.')
            : t('discover.web.noProfilePosts', 'No posts yet')
        }
      />
      {activeUser && (
        <EditProfileDialog
          open={isEditProfileDialogOpen}
          onOpenChange={setIsEditProfileDialogOpen}
          currentUserName={activeUser.username || activeUser.email?.split('@')[0] || ''}
          currentDisplayName={activeUser.displayName || ''}
          currentBio={activeUser.bio || ''}
          currentBanner={safeUserBanner}
          currentLocation={activeUser.location || ''}
          userAvatar={safeUserAvatar}
          onSaved={async () => {
            await refetchMe();
            const latestUser = await authApi.getMe();
            updateAuthUser(latestUser);
          }}
          onSavedPosts={async () => {
            // WallFeed will auto-refetch when userId changes
            // or you can add a callback mechanism here if needed
          }}
        />
      )}
      <Dialog open={isAvatarPreviewOpen} onOpenChange={setIsAvatarPreviewOpen}>
        <DialogContent className="max-w-[92vw] border-none bg-transparent p-0 shadow-none">
          <DialogTitle className="sr-only">
            {t('discover.web.previewProfilePhoto', 'Preview profile photo')}
          </DialogTitle>
          <div className="bg-background overflow-hidden rounded-xl">
            <Image
              width={640}
              height={640}
              src={safeUserAvatar}
              alt={displayName}
              className="max-h-[85vh] object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
      <FollowListDialog
        open={canOpenFollowList && Boolean(followListType)}
        onOpenChange={(open) => !open && setFollowListType(null)}
        type={followListType}
        userId={activeUser?.id ?? ''}
        onOpenAuthorProfile={onOpenAuthorProfile}
      />
    </div>
  );
}
