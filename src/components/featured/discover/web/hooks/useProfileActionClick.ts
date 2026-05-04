'use client';

import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import { authApi } from '@/services/auth';
import { userApi } from '@/services/userService';
import type { User } from '@/types/auth';

type UseProfileActionClickParams = {
  activeProfileId?: string;
  isFollowingProfile: boolean;
  isOwnProfile: boolean;
  onOpenEditProfile: () => void;
  onRefetchSuggestedCreators?: () => Promise<void> | void;
  setQueryUserProfile: Dispatch<SetStateAction<User | null>>;
  queryUserProfile: User | null;
};

export function useProfileActionClick({
  activeProfileId,
  isFollowingProfile,
  isOwnProfile,
  onOpenEditProfile,
  onRefetchSuggestedCreators,
  setQueryUserProfile,
  queryUserProfile,
}: UseProfileActionClickParams) {
  const [isProfileActionLoading, setIsProfileActionLoading] = useState(false);

  const handleProfileActionClick = useCallback(async () => {
    if (isOwnProfile) {
      onOpenEditProfile();
      return;
    }

    if (isProfileActionLoading) {
      return;
    }

    const targetId = activeProfileId;
    if (!targetId) {
      return;
    }

    const latestFollowing = queryUserProfile?.isFollowing === true || isFollowingProfile;
    const nextFollowing = !latestFollowing;

    setIsProfileActionLoading(true);
    setQueryUserProfile((prev) => (prev ? { ...prev, isFollowing: nextFollowing } : prev));

    try {
      await userApi.upsertUserRelation(targetId, {
        action: nextFollowing ? 'follow' : 'unfollow',
      });

      const refreshedProfile = await authApi.getUserId(targetId);
      setQueryUserProfile(refreshedProfile);
      await onRefetchSuggestedCreators?.();
    } catch {
      // Revert optimistic state on error.
      setQueryUserProfile((prev) => (prev ? { ...prev, isFollowing: latestFollowing } : prev));
    } finally {
      setIsProfileActionLoading(false);
    }
  }, [
    activeProfileId,
    isFollowingProfile,
    isProfileActionLoading,
    isOwnProfile,
    onOpenEditProfile,
    onRefetchSuggestedCreators,
    queryUserProfile?.isFollowing,
    setQueryUserProfile,
  ]);

  return { handleProfileActionClick, isProfileActionLoading };
}
