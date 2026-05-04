'use client';

import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import type { TFunction } from 'i18next';
import { authApi } from '@/services/auth';
import { userApi } from '@/services/userService';
import type { User } from '@/types/auth';

type UseProfileBlockActionParams = {
  activeProfileId?: string;
  isBlockingProfile: boolean;
  isOwnProfile: boolean;
  onRefetchSuggestedCreators?: () => Promise<void> | void;
  onReloadPosts?: () => Promise<void> | void;
  profileHandleLabel: string;
  queryUserProfile: User | null;
  setQueryUserProfile: Dispatch<SetStateAction<User | null>>;
  showInfo: (title: string, message: string) => void;
  showSuccess: (title: string, message: string) => void;
  t: TFunction;
};

export function useProfileBlockAction({
  activeProfileId,
  isBlockingProfile,
  isOwnProfile,
  onRefetchSuggestedCreators,
  onReloadPosts,
  profileHandleLabel,
  queryUserProfile,
  setQueryUserProfile,
  showInfo,
  showSuccess,
  t,
}: UseProfileBlockActionParams) {
  const [isBlockActionLoading, setIsBlockActionLoading] = useState(false);

  const handleBlockProfile = useCallback(async () => {
    const targetId = activeProfileId?.trim();
    if (!targetId || isOwnProfile || isBlockActionLoading) {
      return;
    }

    const nextAction = isBlockingProfile ? 'unblock' : 'block';
    const latestBlocking = queryUserProfile?.isBlocking === true || isBlockingProfile;
    const nextBlocking = nextAction === 'block';

    setIsBlockActionLoading(true);
    setQueryUserProfile((prev) => (prev ? { ...prev, isBlocking: nextBlocking } : prev));

    try {
      await userApi.upsertUserRelation(targetId, {
        action: nextAction,
      });
      const refreshedProfile = await authApi.getUserId(targetId);
      setQueryUserProfile(refreshedProfile);
      await onRefetchSuggestedCreators?.();
      await onReloadPosts?.();
      showSuccess(
        nextAction === 'block'
          ? t('discover.web.blockProfileSuccessTitle', 'Profile blocked')
          : t('discover.web.unblockProfileSuccessTitle', 'Profile unblocked'),
        nextAction === 'block'
          ? t('discover.web.blockProfileSuccessMessage', '{{handle}} has been blocked.', {
              handle: profileHandleLabel,
            })
          : t('discover.web.unblockProfileSuccessMessage', '{{handle}} has been unblocked.', {
              handle: profileHandleLabel,
            }),
      );
    } catch {
      setQueryUserProfile((prev) => (prev ? { ...prev, isBlocking: latestBlocking } : prev));
      showInfo(
        nextAction === 'block'
          ? t('discover.web.blockProfileFailedTitle', 'Block unavailable')
          : t('discover.web.unblockProfileFailedTitle', 'Unblock unavailable'),
        nextAction === 'block'
          ? t('discover.web.blockProfileFailedMessage', 'Unable to block this profile right now.')
          : t(
              'discover.web.unblockProfileFailedMessage',
              'Unable to unblock this profile right now.',
            ),
      );
    } finally {
      setIsBlockActionLoading(false);
    }
  }, [
    activeProfileId,
    isBlockActionLoading,
    isBlockingProfile,
    isOwnProfile,
    onRefetchSuggestedCreators,
    onReloadPosts,
    profileHandleLabel,
    queryUserProfile?.isBlocking,
    setQueryUserProfile,
    showInfo,
    showSuccess,
    t,
  ]);

  return {
    handleBlockProfile,
    isBlockActionLoading,
  };
}
