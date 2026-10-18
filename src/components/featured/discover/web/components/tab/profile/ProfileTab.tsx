'use client';

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
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/shared/atoms/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/shared/atoms/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shared/atoms/dropdown-menu';
import { Input } from '@/components/shared/atoms/input';
import { Textarea } from '@/components/shared/atoms/textarea';
import { useToast } from '@/hook/useToast';
import { localizeApiError } from '@/i18n/apiErrors';
import { cn } from '@/lib/utils';
import { isValidUsername } from '@/lib/validators/username';
import { authApi } from '@/services/auth';
import { userApi, type SuggestedUser, type UserRelationListItem } from '@/services/userService';
import type { User } from '@/types/auth';
import { imageApi } from '@/services/imageService';
import { DISCOVER_USER_PLACEHOLDER_ICON } from '../../../hooks/constants';
import { useDiscoverComments } from '../../../hooks/useDiscoverComments';
import { useDiscoverPosts } from '../../../hooks/useDiscoverPosts';
import { useProfileBlockAction } from '../../../hooks/useProfileBlockAction';
import { useProfileActionClick } from '../../../hooks/useProfileActionClick';
import { DiscoverPostCard, type DiscoverPost } from '../../DiscoverPostCard';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useGetData } from '@/context/GetdataContext';
import { useAuthStore } from '@/store/authStore';
import { PostFeedList } from '../shared/PostFeedList';
import ProfileHeaderSkeleton from './ProfileHeaderSkeleton';
import SkeletonPost from './SkeletonPost';
import { useTheme } from '@/theme';

type ProfileTabProps = {
  currentUserHandle?: string;
  currentUserName?: string;
  joinedAt?: string;
  onRefetchSuggestedCreatorsRef?: RefObject<(() => Promise<void>) | null>;
  onProfileFollowStateSyncRef?: RefObject<
    ((userId: string, nextFollowing: boolean) => void) | null
  >;
  onSetAuthorFollowingStateRef?: RefObject<
    ((authorId: string, nextFollowing: boolean) => void) | null
  >;
  onSuggestedCreatorsUpdateRef?: RefObject<
    ((userId: string, nextFollowing: boolean) => void) | null
  >;
  userAvatar?: string;
  userBanner?: string;
  userPosts?: DiscoverPost[];
};

type CropSquare = {
  size: number;
  x: number;
  y: number;
};

type CropCorner = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';

const AVATAR_PREVIEW_SIZE = 252;
const AVATAR_MIN_CROP_SIZE = 96;
const AVATAR_DEFAULT_CROP_SIZE = 208;
const PROFILE_BIO_MAX_LENGTH = 255;
const DISCOVER_BASE_PATH = '/discover';

const getSharedPostSlugFromPathname = (pathname: string): string => {
  const normalizedPath = pathname.trim();
  if (!normalizedPath.startsWith(`${DISCOVER_BASE_PATH}/`)) {
    return '';
  }

  const pathRemainder = normalizedPath.slice(`${DISCOVER_BASE_PATH}/`.length);
  const firstPathSegment = pathRemainder.split('/')[0]?.trim() || '';
  if (!firstPathSegment) {
    return '';
  }

  return decodeURIComponent(firstPathSegment);
};

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
  onBlockProfile: () => Promise<void>;
  mode: 'dark' | 'light';
  onCopyProfileLink: () => Promise<void>;
  onShareProfile: () => Promise<void>;
  profileHandleLabel: string;
  t: ReturnType<typeof useTranslation>['t'];
};

function ProfileActionsMenu({
  onBlockProfile,
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
          <DotsHorizontal className="size-5" />
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
        <DropdownMenuItem
          className="text-body-large-semibold gap-3 rounded px-3 py-4 text-red-500 transition-colors hover:bg-red-50 focus:bg-red-50 dark:hover:bg-red-500/10 dark:focus:bg-red-500/10"
          onClick={() => void onBlockProfile()}
        >
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

function formatJoinedMonthYear(iso: string, locale: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date);
}

function ProfilePostList({
  isLoading,
  commentsState,
  onToggleComments,
  refetchPost,
  postsState,
  posts,
}: {
  isLoading?: boolean;
  commentsState?: Parameters<typeof PostFeedList>[0]['commentsState'];
  onToggleComments?: Parameters<typeof PostFeedList>[0]['onToggleComments'];
  refetchPost?: Parameters<typeof PostFeedList>[0]['refetchPost'];
  postsState: Parameters<typeof PostFeedList>[0]['postsState'];
  posts: DiscoverPost[];
}) {
  const { t } = useTranslation();
  if (isLoading) {
    return (
      <div className="space-y-4 px-4">
        <SkeletonPost />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-muted-foreground py-8 text-center text-sm sm:text-base">
        <p className="text-muted-foreground text-center text-base">
          {t('discover.web.noProfilePosts', { defaultValue: 'No posts yet' })}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PostFeedList
        commentsState={commentsState}
        onToggleComments={onToggleComments}
        refetchPost={refetchPost}
        posts={posts}
        postsState={postsState}
        showFollowButton={false}
      />
    </div>
  );
}

type ProfileSubTab = 'posts' | 'pending';

type FollowListUser = Pick<UserRelationListItem, 'avatar' | 'id' | 'username'> & {
  displayName?: null | string;
};

function FollowListDialog({
  onOpenChange,
  open,
  type,
  userId,
}: {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  type: 'following' | 'followers' | null;
  userId: string;
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
        className="gap-0 overflow-hidden rounded-sm border-none p-0 sm:max-w-md"
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
        <div className="border-border flex items-center justify-between border-b p-4">
          <p className="text-foreground text-base font-semibold">
            {type === 'following'
              ? t('discover.web.following', 'Following')
              : t('discover.web.followers', 'Followers')}
          </p>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <XClose className="size-5" />
          </button>
        </div>
        <div className="scrollbar-neutral-slim max-h-[60vh] overflow-y-auto p-4">
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
              {users.map((user, index) => (
                <div key={user.id || index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-muted relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
                      <Image
                        src={user.avatar || DISCOVER_USER_PLACEHOLDER_ICON}
                        alt={user.displayName || user.username || 'User avatar'}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-body-small-medium text-foreground">
                        {user.displayName || user.username || t('discover.web.unknownAuthor', 'Unknown author')}
                      </p>
                      <p className="text-caption-regular text-muted-foreground">
                        {user.username ? `@${user.username}` : ''}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground py-8 text-center text-sm">
              {t('discover.web.noUsersFound', 'No following yet.')}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditProfileDialog({
  currentBio,
  currentBanner,
  currentDisplayName,
  currentUsername,
  onSaved,
  onSavedPosts,
  onOpenChange,
  open,
  userAvatar,
}: {
  currentBio?: string;
  currentBanner?: string;
  currentDisplayName?: string;
  currentUsername: string;
  onSaved: () => Promise<void> | void;
  onSavedPosts: () => Promise<void> | void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  userAvatar: string;
}) {
  const { t } = useTranslation();
  const { showError, showSuccess } = useToast();
  const [displayName, setDisplayName] = useState(currentDisplayName || '');
  const [username, setUsername] = useState(currentUsername);
  const [bio, setBio] = useState(currentBio || '');
  const [previewAvatar, setPreviewAvatar] = useState(userAvatar);
  const [pendingAvatar, setPendingAvatar] = useState<string | null>(null);
  const [previewBanner, setPreviewBanner] = useState(currentBanner);
  const [pendingBanner, setPendingBanner] = useState<string | null>(null);
  const [editorImageUrl, setEditorImageUrl] = useState<string | null>(null);
  const [editorCrop, setEditorCrop] = useState<CropSquare>(getDefaultCropSquare);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorZoom, setEditorZoom] = useState(1);
  const [isApplyingAvatar, setIsApplyingAvatar] = useState(false);
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

  useEffect(() => {
    if (!open) {
      return;
    }
    setDisplayName(currentDisplayName || '');
    setUsername(currentUsername);
    setBio(currentBio || '');
    setPreviewAvatar(userAvatar);
    setPendingAvatar(null);
    setPreviewBanner(currentBanner);
    setPendingBanner(null);
    setEditorImageUrl(null);
    setEditorCrop(getDefaultCropSquare());
    setIsEditorOpen(false);
    setEditorZoom(1);
  }, [currentBanner, currentBio, currentDisplayName, currentUsername, open, userAvatar]);

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
      showSuccess(
        t('discover.web.coverPhotoUpdatedTitle', 'Cover photo updated'),
        t(
          'discover.web.coverPhotoUpdatedMessage',
          'Cover photo is ready. Press Save to update profile.',
        ),
      );
    } catch (error) {
      showError(
        t('discover.web.uploadFailedTitle', 'Upload failed'),
        error instanceof Error
          ? error.message
          : t(
              'discover.web.uploadFailedMessage',
              'Failed to upload cover photo. Please try again.',
            ),
      );
    } finally {
      setIsUploadingBanner(false);
      if (bannerInputRef.current) {
        bannerInputRef.current.value = '';
      }
    }
  };

  const openEditorWithCurrentAvatar = () => {
    if (isUploadingAvatar || isSaving || isApplyingAvatar) {
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
      showError(
        t('discover.web.noImageSelectedTitle', 'No image selected'),
        t('discover.web.noImageSelectedMessage', 'Please choose an image to continue.'),
      );
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
      showSuccess(
        t('discover.web.photoAppliedTitle', 'Photo applied'),
        t(
          'discover.web.photoAppliedMessage',
          'Edited photo is ready. Press Save to update profile.',
        ),
      );
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="scrollbar-neutral-slim max-h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] overflow-y-auto rounded-lg border-none p-0 sm:max-h-[calc(100vh-2rem)] sm:w-auto sm:min-w-154.25"
        showCloseButton={false}
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

        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 sm:flex-nowrap sm:px-6">
          <div className="flex items-center gap-3">
            <DialogClose asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <XClose className="size-6" />
              </button>
            </DialogClose>
            <p className="text-foreground text-base font-semibold">
              {t('discover.web.editProfile', 'Edit profile')}
            </p>
          </div>

          <Button
            type="button"
            variant="primary-contained"
            className="text-button-small-medium w-full px-3 py-2 sm:w-auto"
            onClick={handleSave}
            disabled={isSaving}
          >
            {t('discover.web.save', 'Save')}
          </Button>
        </div>

        <div className="relative h-26 overflow-hidden bg-neutral-300 sm:h-38.25">
          <Image src={previewBanner || ''} alt="Profile cover" fill className="object-cover" />
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

        <div className="space-y-4 px-3 pt-0 pb-5 sm:space-y-6 sm:px-4 sm:pb-6">
          <div className="-mt-10 flex flex-col items-start gap-3 sm:-mt-14 md:flex-row md:items-end md:justify-between">
            <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-[#A03717] sm:h-30 sm:w-30">
              <Image src={previewAvatar} alt={currentUsername} fill className="object-cover" />
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

            <div className="border-border bg-background flex w-full flex-col gap-3 rounded border px-3 py-2 md:flex-1 md:flex-row md:items-center md:justify-between md:gap-4">
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
                className="text-button-small-medium w-full px-3 py-2 md:w-auto"
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
            className="max-h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] max-w-[96vw] overflow-y-auto rounded-lg border-none p-0 sm:max-h-[calc(100vh-2rem)] sm:w-172"
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
            <div className="bg-card flex flex-wrap items-center justify-between gap-2 px-3 py-3 sm:flex-nowrap sm:px-4">
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

            <div className="px-4 py-4 sm:px-6 sm:py-5">
              <div className="relative mx-auto h-[min(78vw,252px)] w-[min(78vw,252px)] overflow-hidden bg-black sm:h-63 sm:w-63">
                {editorImageUrl ? (
                  <Image
                    src={editorImageUrl}
                    alt="Avatar editor preview"
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
                          aria-label="Resize crop top left"
                          className="pointer-events-auto absolute -top-4 -left-4 h-8 w-8 cursor-nwse-resize bg-transparent sm:-top-3 sm:-left-3 sm:h-6 sm:w-6"
                          onPointerDown={(event) => handleCropCornerPointerDown('top-left', event)}
                          onPointerMove={handleCropCornerPointerMove}
                          onPointerUp={handleCropCornerPointerUp}
                          onPointerCancel={handleCropCornerPointerUp}
                        />
                        <button
                          type="button"
                          aria-label="Resize crop top right"
                          className="pointer-events-auto absolute -top-4 -right-4 h-8 w-8 cursor-nesw-resize bg-transparent sm:-top-3 sm:-right-3 sm:h-6 sm:w-6"
                          onPointerDown={(event) => handleCropCornerPointerDown('top-right', event)}
                          onPointerMove={handleCropCornerPointerMove}
                          onPointerUp={handleCropCornerPointerUp}
                          onPointerCancel={handleCropCornerPointerUp}
                        />
                        <button
                          type="button"
                          aria-label="Resize crop bottom left"
                          className="pointer-events-auto absolute -bottom-4 -left-4 h-8 w-8 cursor-nesw-resize bg-transparent sm:-bottom-3 sm:-left-3 sm:h-6 sm:w-6"
                          onPointerDown={(event) =>
                            handleCropCornerPointerDown('bottom-left', event)
                          }
                          onPointerMove={handleCropCornerPointerMove}
                          onPointerUp={handleCropCornerPointerUp}
                          onPointerCancel={handleCropCornerPointerUp}
                        />
                        <button
                          type="button"
                          aria-label="Resize crop bottom right"
                          className="pointer-events-auto absolute -right-4 -bottom-4 h-8 w-8 cursor-nwse-resize bg-transparent sm:-right-3 sm:-bottom-3 sm:h-6 sm:w-6"
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

            <div className="border-border bg-card flex items-center gap-2 border-t px-3 py-3 sm:gap-3 sm:px-6">
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
      </DialogContent>
    </Dialog>
  );
}

export function ProfileTab({
  currentUserHandle,
  currentUserName,
  joinedAt,
  onRefetchSuggestedCreatorsRef,
  onProfileFollowStateSyncRef,
  onSetAuthorFollowingStateRef,
  onSuggestedCreatorsUpdateRef,
  userAvatar,
  userBanner,
  userPosts,
}: ProfileTabProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const pathname = usePathname() || DISCOVER_BASE_PATH;
  const { showInfo, showSuccess } = useToast();
  const searchParams = useSearchParams();
  const sharedPostSlugFromPath = useMemo(() => getSharedPostSlugFromPathname(pathname), [pathname]);
  const [sharedPostSlugParam, setSharedPostSlugParam] = useState(sharedPostSlugFromPath);
  const sharedPostIdParam = searchParams.get('id')?.trim() || '';
  const sharedPostAutoOpenedIdRef = useRef<string | null>(null);
  const isClosingSharedPostRef = useRef(false);
  const hasPushedSharedPostHistoryRef = useRef(false);
  const user = useAuthStore((state) => state.user);
  const updateAuthUser = useAuthStore((state) => state.updateUser);
  const [subTab, setSubTab] = useState<ProfileSubTab>('posts');
  const [isEditProfileDialogOpen, setIsEditProfileDialogOpen] = useState(false);
  const [isAvatarPreviewOpen, setIsAvatarPreviewOpen] = useState(false);
  const [followListType, setFollowListType] = useState<'following' | 'followers' | null>(null);
  const [isQueryProfileLoading, setIsQueryProfileLoading] = useState(false);
  const { me, refetchMe } = useGetData();
  const [queryUserProfile, setQueryUserProfile] = useState<User | null>(null);

  const [dynamicFollowerCount, setDynamicFollowerCount] = useState<number | null>(null);
  const [dynamicFollowingCount, setDynamicFollowingCount] = useState<number | null>(null);

  const queryUserId = useMemo(() => {
    const userId = searchParams.get('userId');
    if (userId) {
      return userId;
    }

    // Support malformed URL like `?tab=profile?userId=abc`.
    const tabParam = searchParams.get('tab');
    if (!tabParam) {
      return undefined;
    }

    const malformedParams = new URLSearchParams(tabParam.split('?')[1] ?? '');
    return malformedParams.get('userId') ?? undefined;
  }, [searchParams]);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    window.scrollTo(0, 0);
  }, [queryUserId]);

  useEffect(() => {
    setSharedPostSlugParam(sharedPostSlugFromPath);
  }, [sharedPostSlugFromPath]);

  useEffect(() => {
    if (!onProfileFollowStateSyncRef) {
      return;
    }

    onProfileFollowStateSyncRef.current = (userId: string, nextFollowing: boolean) => {
      const normalizedUserId = userId.trim();
      if (!normalizedUserId) {
        return;
      }

      setQueryUserProfile((prev) =>
        prev && prev.id === normalizedUserId ? { ...prev, isFollowing: nextFollowing } : prev,
      );
    };

    return () => {
      onProfileFollowStateSyncRef.current = null;
    };
  }, [onProfileFollowStateSyncRef]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const syncSharedPostSlugFromLocation = () => {
      const nextSlug = getSharedPostSlugFromPathname(window.location.pathname);
      setSharedPostSlugParam(nextSlug);
      if (!nextSlug) {
        hasPushedSharedPostHistoryRef.current = false;
      }
    };

    window.addEventListener('popstate', syncSharedPostSlugFromLocation);
    return () => {
      window.removeEventListener('popstate', syncSharedPostSlugFromLocation);
    };
  }, []);

  useEffect(() => {
    const getMe = async () => {
      refetchMe();
    };
    getMe();
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!queryUserId) {
      setIsQueryProfileLoading(false);
      setQueryUserProfile(null);
      return () => {
        isMounted = false;
      };
    }

    const fetchQueryUserProfile = async () => {
      setIsQueryProfileLoading(true);
      try {
        const user = await authApi.getUserId(queryUserId);
        if (isMounted) {
          setQueryUserProfile(user);
        }
      } catch {
        if (isMounted) {
          setQueryUserProfile(null);
        }
      } finally {
        if (isMounted) {
          setIsQueryProfileLoading(false);
        }
      }
    };

    void fetchQueryUserProfile();

    return () => {
      isMounted = false;
    };
  }, [queryUserId]);
  const targetUserId = queryUserId ?? me?.id;
  const shouldShowLoginPrompt = !me?.id && !queryUserId;
  const activeProfile = queryUserId ? queryUserProfile : (me ?? user);
  const isOwnProfile = !queryUserId || queryUserId === me?.id;
  const canOpenFollowList = Boolean(activeProfile?.id);
  const { mode } = useTheme();

  useEffect(() => {
    if (!activeProfile?.id) return;

    if (activeProfile.followerCount !== undefined && activeProfile.followingCount !== undefined) {
      setDynamicFollowerCount(activeProfile.followerCount);
      setDynamicFollowingCount(activeProfile.followingCount);
      return;
    }

    let isMounted = true;
    const fetchCounts = async () => {
      try {
        const [followersRes, followingsRes] = await Promise.all([
          userApi.listMyRelations({ relation: 'follower', skip: 0, take: 1, userId: activeProfile.id }),
          userApi.listMyRelations({ relation: 'followings', skip: 0, take: 1, userId: activeProfile.id })
        ]);
        if (isMounted) {
          setDynamicFollowerCount(followersRes.total);
          setDynamicFollowingCount(followingsRes.total);
        }
      } catch {
        // silently fail and fallback to 0
      }
    };
    void fetchCounts();
    return () => {
      isMounted = false;
    };
  }, [activeProfile?.id, activeProfile?.followerCount, activeProfile?.followingCount]);

  useEffect(() => {
    // Keep active tab aligned with profile ownership context.
    if (!isOwnProfile && subTab === 'pending') {
      setSubTab('posts');
    }
  }, [isOwnProfile, subTab]);
  useEffect(() => {
    if (!canOpenFollowList && followListType) {
      setFollowListType(null);
    }
  }, [canOpenFollowList, followListType]);
  const isFollowingProfile = queryUserId
    ? queryUserProfile?.isFollowing === true
    : activeProfile?.isFollowing === true;
  const isBlockingProfile = queryUserId
    ? queryUserProfile?.isBlocking === true
    : activeProfile?.isBlocking === true;
  const postsOptions = {
    autoLoad: Boolean(targetUserId),
    userId: targetUserId,
    onAuthorFollowingStateChange: (authorId: string, nextFollowing: boolean) => {
      onSuggestedCreatorsUpdateRef?.current?.(authorId, nextFollowing);
    },
  } as Parameters<typeof useDiscoverPosts>[0];
  const postsState = useDiscoverPosts(postsOptions);
  const commentsState = useDiscoverComments({
    onCommentCountChange: postsState.updatePostCommentCount,
  });
  const handleOpenAuthorProfile = useCallback(
    (authorId: string) => {
      const normalizedAuthorId = authorId.trim();
      if (!normalizedAuthorId) {
        return;
      }

      router.push(
        `${DISCOVER_BASE_PATH}?tab=profile?userId=${encodeURIComponent(normalizedAuthorId)}`,
      );
    },
    [router],
  );
  useEffect(() => {
    if (onSetAuthorFollowingStateRef) {
      onSetAuthorFollowingStateRef.current = postsState.setAuthorFollowingState;
    }
  }, [onSetAuthorFollowingStateRef, postsState.setAuthorFollowingState]);
  const handleDeletePost = useCallback(
    async (postId: string) => {
      const hasDeleted = await postsState.deletePost(postId);
      if (!hasDeleted) {
        return false;
      }

      commentsState.clearPostState(postId);
      return true;
    },
    [commentsState, postsState],
  );
  const postFeedState = useMemo(
    () => ({
      currentUserId: postsState.currentUserId,
      deletePost: handleDeletePost,
      isDeletingPostById: postsState.isDeletingPostById,
      isRepostingPostById: postsState.isRepostingPostById,
      repostPost: postsState.repostPost,
      sharePost: postsState.sharePost,
      toggleBookmark: postsState.toggleBookmark,
      toggleFollow: postsState.toggleFollow,
      toggleFollowByAuthorId: postsState.toggleFollowByAuthorId,
      togglePostLike: postsState.togglePostLike,
    }),
    [
      handleDeletePost,
      postsState.currentUserId,
      postsState.isDeletingPostById,
      postsState.isRepostingPostById,
      postsState.repostPost,
      postsState.sharePost,
      postsState.toggleBookmark,
      postsState.toggleFollow,
      postsState.toggleFollowByAuthorId,
      postsState.togglePostLike,
    ],
  );

  const activeSharedPost = useMemo(() => {
    if (!sharedPostSlugParam && !sharedPostIdParam) {
      return null;
    }

    return (
      postsState.posts.find(
        (post) => post.slug === sharedPostSlugParam || post.id === sharedPostIdParam,
      ) || null
    );
  }, [postsState.posts, sharedPostIdParam, sharedPostSlugParam]);

  const removeSharedPostIdFromUrl = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const currentPath = window.location.pathname;
    const hasDetailPath = currentPath.startsWith(`${DISCOVER_BASE_PATH}/`);
    if (!hasDetailPath) {
      setSharedPostSlugParam('');
      return;
    }

    const nextUrl = `${DISCOVER_BASE_PATH}${window.location.search || ''}${window.location.hash || ''}`;
    window.history.replaceState(window.history.state, '', nextUrl);
    setSharedPostSlugParam('');
    hasPushedSharedPostHistoryRef.current = false;
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
      hasPushedSharedPostHistoryRef.current = true;
    },
    [searchParams],
  );

  const closeSharedPostDetail = useCallback(
    (postId?: string) => {
      if (isClosingSharedPostRef.current) {
        return;
      }

      isClosingSharedPostRef.current = true;
      const targetPostId = postId || activeSharedPost?.id;
      if (targetPostId && commentsState.isCommentsOpenByPostId[targetPostId]) {
        commentsState.toggleComments(targetPostId);
      }

      removeSharedPostIdFromUrl();
    },
    [
      activeSharedPost?.id,
      commentsState.isCommentsOpenByPostId,
      commentsState.toggleComments,
      removeSharedPostIdFromUrl,
    ],
  );

  useEffect(() => {
    if (!sharedPostSlugParam && !sharedPostIdParam) {
      sharedPostAutoOpenedIdRef.current = null;
      isClosingSharedPostRef.current = false;
    }
  }, [sharedPostIdParam, sharedPostSlugParam]);

  useEffect(() => {
    if ((!sharedPostSlugParam && !sharedPostIdParam) || !activeSharedPost) {
      return;
    }

    if (sharedPostAutoOpenedIdRef.current === activeSharedPost.id) {
      return;
    }

    sharedPostAutoOpenedIdRef.current = activeSharedPost.id;

    if (commentsState.isCommentsOpenByPostId[activeSharedPost.id]) {
      return;
    }

    commentsState.toggleComments(activeSharedPost.id);
  }, [
    activeSharedPost,
    commentsState.isCommentsOpenByPostId,
    commentsState.toggleComments,
    sharedPostIdParam,
    sharedPostSlugParam,
  ]);

  const safeCurrentUserName =
    activeProfile?.username?.trim() ||
    currentUserName ||
    activeProfile?.email?.split('@')[0] ||
    me?.username?.trim() ||
    me?.email?.split('@')[0] ||
    t('discover.web.guest', 'Guest Trader');
  const safeCurrentUserHandle =
    currentUserHandle ||
    (activeProfile?.displayName
      ? `${activeProfile.displayName}`
      : t('discover.web.guestHandle', '@guest'));
  const safeCurrentUserBio =
    activeProfile?.bio?.trim() || (queryUserId ? '' : (me?.bio?.trim() ?? ''));
  const profileHandleLabel = safeCurrentUserHandle || '@user';
  const safeUserAvatar = userAvatar || activeProfile?.avatar || DISCOVER_USER_PLACEHOLDER_ICON;
  const activeProfileCoverAvatar =
    activeProfile && 'coverAvatar' in activeProfile
      ? (activeProfile as { coverAvatar?: null | string }).coverAvatar
      : undefined;
  const safeUserBanner = activeProfileCoverAvatar || userBanner;
  const normalizedUserBanner = safeUserBanner?.trim();
  const hasUserBanner = Boolean(
    normalizedUserBanner &&
    normalizedUserBanner.toLowerCase() !== 'null' &&
    normalizedUserBanner.toLowerCase() !== 'undefined',
  );
  const safeUserPosts = userPosts ?? postsState.posts;
  const isPendingPost = useCallback((status?: string) => {
    const normalizedStatus = status?.trim().toLowerCase();
    return normalizedStatus === 'pending' || normalizedStatus === 'pedding';
  }, []);
  const pendingUserPosts = useMemo(
    () => safeUserPosts.filter((post) => isPendingPost(post.status)),
    [isPendingPost, safeUserPosts],
  );
  const publishedUserPosts = useMemo(
    () => safeUserPosts.filter((post) => !isPendingPost(post.status)),
    [isPendingPost, safeUserPosts],
  );
  const likedUserPosts = useMemo(
    () => safeUserPosts.filter((post) => Boolean(post.liked) && !isPendingPost(post.status)),
    [isPendingPost, safeUserPosts],
  );
  const sharedPostComments = activeSharedPost
    ? commentsState.commentsByPostId[activeSharedPost.id] || []
    : [];
  const sharedPostCommentsTotal = activeSharedPost
    ? (commentsState.commentsTotalByPostId[activeSharedPost.id] ?? sharedPostComments.length)
    : 0;
  const hasMoreSharedPostComments = sharedPostComments.length < sharedPostCommentsTotal;
  const joinedLabel = useMemo(() => {
    const effectiveJoinedAt = queryUserId
      ? queryUserProfile?.createdAt
      : (joinedAt ?? me?.createdAt);
    if (!effectiveJoinedAt) {
      return null;
    }
    const formatted = formatJoinedMonthYear(effectiveJoinedAt, i18n.language || 'en');
    if (!formatted) {
      return null;
    }
    return t('discover.web.joinedDate', 'Joined {{date}}', { date: formatted });
  }, [i18n.language, joinedAt, me?.createdAt, queryUserId, queryUserProfile?.createdAt, t]);

  const subTabs: { id: ProfileSubTab; label: string }[] = [
    { id: 'posts', label: t('discover.web.posts', 'Posts') },
    ...(isOwnProfile
      ? [{ id: 'pending' as const, label: t('discover.web.pending', 'Pending') }]
      : []),
  ];
  const { handleProfileActionClick, isProfileActionLoading } = useProfileActionClick({
    activeProfileId: activeProfile?.id,
    isFollowingProfile,
    isOwnProfile,
    onOpenEditProfile: () => setIsEditProfileDialogOpen(true),
    onRefetchSuggestedCreators: () => onRefetchSuggestedCreatorsRef?.current?.(),
    setQueryUserProfile,
    queryUserProfile,
  });
  const profileLink = useMemo(() => {
    if (typeof window === 'undefined' || !activeProfile?.id) {
      return '';
    }

    const profileUrl = new URL(window.location.href);
    profileUrl.searchParams.set('tab', 'profile');
    profileUrl.searchParams.set('userId', activeProfile.id);
    return profileUrl.toString();
  }, [activeProfile?.id]);
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
  const { handleBlockProfile, isBlockActionLoading } = useProfileBlockAction({
    activeProfileId: activeProfile?.id,
    isBlockingProfile,
    isOwnProfile,
    onRefetchSuggestedCreators: () => onRefetchSuggestedCreatorsRef?.current?.(),
    onReloadPosts: () => postsState.reloadPosts(),
    profileHandleLabel,
    queryUserProfile,
    setQueryUserProfile,
    showInfo,
    showSuccess,
    t,
  });

  if (shouldShowLoginPrompt) {
    return (
      <div className="flex h-full items-center justify-center px-4 py-6">
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center text-center">
          <Image
            src={
              mode === 'dark'
                ? '/assets/images/position/group-dark.svg'
                : '/assets/images/position/Group.svg'
            }
            alt="Welcome illustration"
            width={300}
            height={300}
            priority
            className="h-auto w-full max-w-75"
          />
          <h2 className="text-primary-500 mt-6 text-3xl font-semibold sm:text-5xl">
            Welcome to MTX Trading
          </h2>
          <p className="mt-3 text-base text-neutral-900 dark:text-white">
            Sign in to view your balance and personalized data.
          </p>
          <div className="mt-7 grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-2">
            <Button
              type="button"
              variant="neutral-contained"
              className="text-body-large-semibold h-11 w-full text-neutral-900 dark:text-white"
              onClick={() => router.push('/login')}
            >
              {t('auth.login.title', { defaultValue: 'Login' })}
            </Button>
            <Button
              type="button"
              variant="primary-contained"
              className="text-body-large-semibold text-foreground h-11 w-full"
              onClick={() => router.push('/register')}
            >
              {t('auth.register.title', { defaultValue: 'Register' })}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="">
      <div
        className={cn('bg-background ml-0.75 overflow-hidden', 'xl:dark:bg-background xl:bg-white')}
      >
        {isQueryProfileLoading ? (
          <ProfileHeaderSkeleton />
        ) : (
          <>
            <div>
              <div className="relative">
                <div className="-mx-4">
                  <div
                    className="bg-muted h-38.25 w-full rounded-t-lg bg-cover bg-center bg-no-repeat sm:h-40"
                    role="img"
                    aria-label={t('discover.web.profileBanner', 'Profile cover')}
                    style={
                      hasUserBanner
                        ? { backgroundImage: `url(${normalizedUserBanner})` }
                        : undefined
                    }
                  />
                </div>

                <div className="px-1 sm:px-2">
                  <div className="flex items-end justify-between gap-3">
                    <div className="relative z-10 -mt-10 sm:-mt-12">
                      <button
                        type="button"
                        className="cursor-zoom-in rounded-full"
                        onClick={() => setIsAvatarPreviewOpen(true)}
                        aria-label={t('discover.web.previewProfilePhoto', 'Preview profile photo')}
                      >
                        <Image
                          width={120}
                          height={120}
                          src={safeUserAvatar}
                          alt={safeCurrentUserName}
                          className="border-background bg-muted h-30 w-30 rounded-full border-4 object-cover"
                        />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      {isOwnProfile ? null : (
                        <ProfileActionsMenu
                          onBlockProfile={handleBlockProfile}
                          mode={mode}
                          onCopyProfileLink={handleCopyProfileLink}
                          onShareProfile={handleShareProfile}
                          profileHandleLabel={profileHandleLabel}
                          t={t}
                        />
                      )}

                      <Button
                        type="button"
                        variant={isOwnProfile ? 'white-outline' : 'primary-ghost'}
                        className={cn(
                          'mb-1 shrink-0 px-3 py-2',
                          isOwnProfile
                            ? 'text-foreground border-border text-body-small-medium'
                            : 'text-primary-500! text-button-small-medium hover:bg-primary-50 py-1',
                        )}
                        onClick={
                          isBlockingProfile
                            ? () => void handleBlockProfile()
                            : handleProfileActionClick
                        }
                        disabled={isProfileActionLoading || isBlockActionLoading}
                      >
                        {isOwnProfile
                          ? t('discover.web.editProfile', 'Edit profile')
                          : isBlockingProfile
                            ? t('discover.web.unblock', 'Unblock')
                            : isFollowingProfile
                              ? t('discover.web.following', 'Following')
                              : t('discover.web.follow', 'Follow')}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-5 px-4">
                    <div>
                      <p className="text-foreground text-body-large-semibold">
                        {safeCurrentUserHandle}
                      </p>
                      <p className="text-muted-foreground text-body-small-regular">
                        @{safeCurrentUserName}
                      </p>
                      {safeCurrentUserBio ? (
                        <p className="text-foreground/90 text-body-small-regular mt-1.5 break-words whitespace-pre-line">
                          {safeCurrentUserBio}
                        </p>
                      ) : null}
                    </div>

                    {joinedLabel ? (
                      <button
                        type="button"
                        className="text-muted-foreground flex items-center gap-1 pt-3 text-sm transition-colors"
                      >
                        <Calendar className="size-4 shrink-0" />
                        <span>{joinedLabel}</span>
                      </button>
                    ) : null}

                    <div className="text-muted-foreground text-body-small-semibold flex flex-wrap gap-x-4 gap-y-1 py-5">
                      <button
                        type="button"
                        onClick={() => canOpenFollowList && setFollowListType('following')}
                        disabled={!canOpenFollowList}
                        className={cn(
                          'transition-colors',
                          canOpenFollowList
                            ? 'hover:text-foreground hover:underline'
                            : 'cursor-default',
                        )}
                      >
                        <span className="text-foreground text-body-small-semibold">
                          {dynamicFollowingCount ?? activeProfile?.followingCount ?? 0}
                        </span>{' '}
                        {t('discover.web.following', 'Following')}
                      </button>
                      <button
                        type="button"
                        onClick={() => canOpenFollowList && setFollowListType('followers')}
                        disabled={!canOpenFollowList}
                        className={cn(
                          'transition-colors',
                          canOpenFollowList
                            ? 'hover:text-foreground hover:underline'
                            : 'cursor-default',
                        )}
                      >
                        <span className="text-foreground text-body-small-semibold">
                          {dynamicFollowerCount ?? activeProfile?.followerCount ?? 0}
                        </span>{' '}
                        {t('discover.web.followers', 'Followers')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {isOwnProfile ? (
              <div>
                <div className="flex">
                  {subTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSubTab(tab.id)}
                      className={cn(
                        'relative flex-1 pt-3 pb-3 text-center text-sm font-medium transition-colors sm:text-base',
                        subTab === tab.id
                          ? 'text-primary-500 font-semibold'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {tab.label}
                      {subTab === tab.id ? (
                        <span className="bg-primary-500 absolute right-0 bottom-0 left-0 h-0.5" />
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )}

        <div className="border-border space-y-6 border-t py-5">
          {subTab === 'posts' ? (
            <ProfilePostList
              isLoading={postsState.isLoadingPosts}
              commentsState={commentsState}
              onToggleComments={openSharedPostDetail}
              refetchPost={postsState.reloadPosts}
              posts={publishedUserPosts}
              postsState={postFeedState}
            />
          ) : subTab === 'pending' ? (
            pendingUserPosts.length > 0 ? (
              <ProfilePostList
                isLoading={postsState.isLoadingPosts}
                commentsState={commentsState}
                onToggleComments={openSharedPostDetail}
                refetchPost={postsState.reloadPosts}
                posts={pendingUserPosts}
                postsState={postFeedState}
              />
            ) : (
              <div className="text-muted-foreground py-8 text-center text-sm sm:text-base">
                {t('discover.web.profileNoPendingYet', 'No pending yet.')}
              </div>
            )
          ) : likedUserPosts.length > 0 ? (
            <ProfilePostList
              isLoading={postsState.isLoadingPosts}
              commentsState={commentsState}
              onToggleComments={openSharedPostDetail}
              refetchPost={postsState.reloadPosts}
              posts={likedUserPosts}
              postsState={postFeedState}
            />
          ) : (
            <div className="text-muted-foreground py-8 text-center text-sm sm:text-base">
              {t('discover.web.profileNoLikesYet', 'No likes yet.')}
            </div>
          )}
        </div>
      </div>

      {activeSharedPost ? (
        <DiscoverPostCard
          key={`shared-post-${activeSharedPost.id}`}
          hideCard
          commentDraft={commentsState.commentDraftByPostId[activeSharedPost.id]}
          comments={sharedPostComments}
          currentUserId={postsState.currentUserId}
          hasMoreComments={hasMoreSharedPostComments}
          isCommentsOpen={Boolean(commentsState.isCommentsOpenByPostId[activeSharedPost.id])}
          isCreatingComment={Boolean(commentsState.isCreatingCommentByPostId[activeSharedPost.id])}
          isDeletingCommentById={commentsState.isDeletingCommentById}
          isDeletingPost={Boolean(postsState.isDeletingPostById[activeSharedPost.id])}
          isRepostingPost={Boolean(postsState.isRepostingPostById[activeSharedPost.id])}
          isUpdatingCommentById={commentsState.isUpdatingCommentById}
          isLoadingComments={Boolean(commentsState.isLoadingCommentsByPostId[activeSharedPost.id])}
          isLoadingMoreComments={Boolean(
            commentsState.isLoadingMoreCommentsByPostId[activeSharedPost.id],
          )}
          onCommentDraftChange={commentsState.setCommentDraft}
          onCreateComment={commentsState.createComment}
          onDeleteComment={commentsState.deleteComment}
          onDeletePost={postFeedState.deletePost}
          onLoadMoreComments={commentsState.loadMoreComments}
          onRepostPost={postFeedState.repostPost}
          onSharePost={postFeedState.sharePost}
          onToggleBookmark={postFeedState.toggleBookmark}
          onToggleCommentLike={commentsState.toggleCommentLike}
          onToggleComments={closeSharedPostDetail}
          onToggleFollow={postFeedState.toggleFollow}
          onTogglePostLike={postFeedState.togglePostLike}
          onUpdateComment={commentsState.updateComment}
          post={activeSharedPost}
          showFollowButton={false}
          onOpenAuthorProfile={handleOpenAuthorProfile}
        />
      ) : null}

      {isOwnProfile ? (
        <EditProfileDialog
          open={isEditProfileDialogOpen}
          onOpenChange={setIsEditProfileDialogOpen}
          currentUsername={activeProfile?.username?.trim() ?? ''}
          currentDisplayName={activeProfile?.displayName?.trim() ?? ''}
          currentBio={activeProfile?.bio ?? ''}
          currentBanner={hasUserBanner ? normalizedUserBanner : ''}
          onSaved={async () => {
            await refetchMe();
            const latestUser = await authApi.getMe();
            updateAuthUser(latestUser);
          }}
          onSavedPosts={async () => {
            await postsState.reloadPosts();
          }}
          userAvatar={safeUserAvatar}
        />
      ) : null}

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
              alt={safeCurrentUserName}
              className="max-h-[85vh] object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>

      <FollowListDialog
        open={canOpenFollowList && Boolean(followListType)}
        onOpenChange={(open) => !open && setFollowListType(null)}
        type={followListType}
        userId={activeProfile?.id ?? ''}
      />
    </div>
  );
}

