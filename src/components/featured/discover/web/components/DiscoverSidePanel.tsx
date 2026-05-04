'use client';

import { useCallback, useEffect, useRef, useState, Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { Button } from '@/components/shared/atoms/button';
import { useAuthHydrated } from '@/hook/useAuthHydrated';
import { localizeApiError } from '@/i18n/apiErrors';
import { authApi } from '@/services/auth';
import { userApi, type SuggestedUser } from '@/services/userService';
import { useAuthStore } from '@/store/authStore';
import { DISCOVER_USER_PLACEHOLDER_ICON } from '../hooks/constants';

const SUGGESTED_CREATORS_FETCH_SIZE = 30;

type SuggestedCreator = {
  avatar?: string;
  handle: string;
  id: string;
  isFollowing: boolean;
  name: string;
};

type DiscoverSidePanelProps = {
  onOpenAuthorProfile?: (authorId: string) => void;
  onRefetchSuggestedCreatorsRef?: React.RefObject<(() => Promise<void>) | null>;
  onSetAuthorFollowingState?: (authorId: string, nextFollowing: boolean) => void;
  onSuggestedCreatorFollowStateSync?: (userId: string, nextFollowing: boolean) => void;
  onSuggestedCreatorsUpdateRef?: React.RefObject<(userId: string, nextFollowing: boolean) => void>;
};

function CreatorAvatar({ avatar, name }: { avatar?: string; name: string }) {
  if (avatar) {
    return (
      <Image
        src={avatar}
        alt={name}
        width={40}
        height={40}
        className="bg-muted h-10 w-10 rounded-full object-cover"
        unoptimized
      />
    );
  }

  return (
    <div className="bg-muted text-foreground flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold">
      {(name.slice(0, 2) || 'U').toUpperCase()}
    </div>
  );
}

export function DiscoverSidePanel({
  onOpenAuthorProfile,
  onRefetchSuggestedCreatorsRef,
  onSetAuthorFollowingState,
  onSuggestedCreatorFollowStateSync,
  onSuggestedCreatorsUpdateRef,
}: DiscoverSidePanelProps) {
  const { t } = useTranslation();
  const hasHydratedAuth = useAuthHydrated();
  const user = useAuthStore((state) => state.user);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestedCreators, setSuggestedCreators] = useState<SuggestedCreator[]>([]);
  const [suggestionsError, setSuggestionsError] = useState('');
  const shouldShowSuggestedCreators = hasHydratedAuth && Boolean(user);

  const suggestedFollowTimeoutById = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const suggestedFollowInitialStateRef = useRef<Record<string, boolean>>({});
  const suggestedFollowDesiredStateRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    return () => {
      Object.values(suggestedFollowTimeoutById.current).forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      suggestedFollowTimeoutById.current = {};
      suggestedFollowInitialStateRef.current = {};
      suggestedFollowDesiredStateRef.current = {};
    };
  }, []);

  useEffect(() => {
    if (onSuggestedCreatorsUpdateRef) {
      onSuggestedCreatorsUpdateRef.current = (userId: string, nextFollowing: boolean) => {
        setSuggestedCreators((prev) =>
          prev.map((creator) => {
            if (creator.id !== userId) {
              return creator;
            }

            return {
              ...creator,
              isFollowing: nextFollowing,
            };
          }),
        );
      };
    }
  }, [onSuggestedCreatorsUpdateRef]);

  const mapSuggestedUserToCreator = useCallback(
    (user: SuggestedUser): SuggestedCreator => {
      const username = String(user.username || '')
        .trim()
        .replace(/^@+/, '');
      const normalizedUserId = String(user.id || '').trim();

      return {
        id: normalizedUserId,
        isFollowing: Boolean(user.relation?.isFollowing),
        name:
          user.displayName?.trim() || username || t('discover.web.unknownAuthor', 'Unknown author'),
        handle: username ? `@${username}` : '@unknown',
        avatar: user.avatar || DISCOVER_USER_PLACEHOLDER_ICON,
      };
    },
    [t],
  );

  const normalizeSuggestedCreators = useCallback(
    (users: SuggestedUser[]): SuggestedCreator[] => {
      const seenUserIds = new Set<string>();
      const normalized: SuggestedCreator[] = [];

      for (const user of users) {
        const creator = mapSuggestedUserToCreator(user);
        if (!creator.id || seenUserIds.has(creator.id)) {
          continue;
        }

        seenUserIds.add(creator.id);
        normalized.push(creator);
      }

      return normalized;
    },
    [mapSuggestedUserToCreator],
  );

  const refetchSuggestedCreators = useCallback(async () => {
    if (!shouldShowSuggestedCreators) {
      setSuggestedCreators([]);
      setSuggestionsError('');
      return;
    }

    setIsLoadingSuggestions(true);
    setSuggestionsError('');
    try {
      const response = await userApi.listSuggestions({ take: SUGGESTED_CREATORS_FETCH_SIZE });
      setSuggestedCreators(normalizeSuggestedCreators(response));
    } catch (error) {
      setSuggestionsError(
        localizeApiError(error, t, 'apiErrors.generic') ||
          t('discover.web.loadSuggestedCreatorsFailed', 'Unable to load suggested creators.'),
      );
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [normalizeSuggestedCreators, shouldShowSuggestedCreators, t]);

  useEffect(() => {
    if (!onRefetchSuggestedCreatorsRef) {
      return;
    }

    onRefetchSuggestedCreatorsRef.current = refetchSuggestedCreators;
    return () => {
      onRefetchSuggestedCreatorsRef.current = null;
    };
  }, [onRefetchSuggestedCreatorsRef, refetchSuggestedCreators]);

  useEffect(() => {
    if (!shouldShowSuggestedCreators) {
      setIsLoadingSuggestions(false);
      setSuggestedCreators([]);
      setSuggestionsError('');
      return;
    }

    let isCancelled = false;

    void (async () => {
      await refetchSuggestedCreators();
      if (isCancelled) {
        return;
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [refetchSuggestedCreators, shouldShowSuggestedCreators]);

  const handleToggleSuggestedFollow = useCallback(
    (userId: string) => {
      const normalizedUserId = userId.trim();

      if (!normalizedUserId) {
        return;
      }

      const targetCreator = suggestedCreators.find((creator) => creator.id === normalizedUserId);
      if (!targetCreator) {
        return;
      }

      // Store initial state only on first toggle for this creator
      if (!(normalizedUserId in suggestedFollowInitialStateRef.current)) {
        suggestedFollowInitialStateRef.current[normalizedUserId] = Boolean(
          targetCreator.isFollowing,
        );
      }

      const nextFollowing = !Boolean(targetCreator.isFollowing);

      // Store desired state (what user wants)
      suggestedFollowDesiredStateRef.current[normalizedUserId] = nextFollowing;

      // Update UI immediately
      setSuggestedCreators((prev) =>
        prev.map((creator) => {
          if (creator.id !== normalizedUserId) {
            return creator;
          }

          return {
            ...creator,
            isFollowing: nextFollowing,
          };
        }),
      );

      // Update posts feed immediately (optimistic update)
      onSetAuthorFollowingState?.(normalizedUserId, nextFollowing);
      onSuggestedCreatorFollowStateSync?.(normalizedUserId, nextFollowing);

      const existingTimeout = suggestedFollowTimeoutById.current[normalizedUserId];
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Debounce API call in background
      suggestedFollowTimeoutById.current[normalizedUserId] = setTimeout(() => {
        void (async () => {
          const initialFollowing = suggestedFollowInitialStateRef.current[normalizedUserId];
          const desiredFollowing = suggestedFollowDesiredStateRef.current[normalizedUserId];

          try {
            // Only call API if desired state is different from initial state
            if (desiredFollowing !== initialFollowing) {
              await userApi.upsertUserRelation(normalizedUserId, {
                action: desiredFollowing ? 'follow' : 'unfollow',
              });

              // Refetch profile to keep follow state in sync with backend.
              const refreshedProfile = await authApi.getUserId(normalizedUserId);
              const refreshedFollowing = refreshedProfile.isFollowing === true;

              setSuggestedCreators((prev) =>
                prev.map((creator) =>
                  creator.id === normalizedUserId
                    ? {
                        ...creator,
                        isFollowing: refreshedFollowing,
                      }
                    : creator,
                ),
              );
              onSetAuthorFollowingState?.(normalizedUserId, refreshedFollowing);
              onSuggestedCreatorFollowStateSync?.(normalizedUserId, refreshedFollowing);
            }
          } catch {
            // Revert to initial state on error.
            setSuggestedCreators((prev) =>
              prev.map((creator) =>
                creator.id === normalizedUserId
                  ? {
                      ...creator,
                      isFollowing: initialFollowing,
                    }
                  : creator,
              ),
            );
            onSuggestedCreatorFollowStateSync?.(normalizedUserId, initialFollowing);
          } finally {
            delete suggestedFollowTimeoutById.current[normalizedUserId];
            delete suggestedFollowInitialStateRef.current[normalizedUserId];
            delete suggestedFollowDesiredStateRef.current[normalizedUserId];
          }
        })();
      }, 500);
    },
    [onSetAuthorFollowingState, onSuggestedCreatorFollowStateSync, suggestedCreators],
  );

  return (
    <aside className="hidden xl:block">
      <div className="flex rounded-sm bg-black p-3 text-white">
        <div>
          <div className="flex shrink-0 items-center gap-2">
            <Image
              src="/logo/logo-web-darkmode.svg"
              alt="MTX Trading"
              width={109}
              height={15}
              priority
            />
          </div>
          <p className="text-body-small-semibold mt-4">
            {t('discover.web.bannerTitle', 'TRADE SMART\nPROFIT FASTER.')
              .split('\n')
              .map((line, idx, arr) => (
                <Fragment key={idx}>
                  {line}
                  {idx < arr.length - 1 && <br />}
                </Fragment>
              ))}
          </p>
          <p className="text-caption-regular mt-3 text-neutral-500">
            {t(
              'discover.web.bannerDescription',
              'Access global CFD markets with powerful tools and low fees.',
            )}
          </p>
        </div>

        <Image
          src="/assets/images/discover/icon-right.svg"
          alt="For You Panel"
          width={160}
          height={160}
        />
      </div>

      {shouldShowSuggestedCreators ? (
        <div className="bg-background mt-4 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-foreground text-body-small-semibold">
              {t('discover.web.suggestedCreators', 'Suggested Creators')}
            </h3>
          </div>

          <div className="scrollbar-neutral-slim h-[30vh] space-y-3.5 overflow-y-auto pr-1">
            {isLoadingSuggestions ? (
              [1, 2, 3].map((index) => (
                <div key={index} className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="bg-muted h-11 w-11 animate-pulse rounded-full" />
                    <div className="min-w-0 space-y-2">
                      <div className="bg-muted h-4 w-28 animate-pulse rounded" />
                      <div className="bg-muted h-3 w-22 animate-pulse rounded" />
                    </div>
                  </div>

                  <div className="bg-muted h-10 w-20 animate-pulse rounded" />
                </div>
              ))
            ) : suggestionsError ? (
              <p className="text-destructive text-sm">{suggestionsError}</p>
            ) : suggestedCreators.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {t('discover.web.noSuggestedCreators', 'No suggested creators')}
              </p>
            ) : (
              suggestedCreators.map((creator) => {
                return (
                  <div key={creator.id} className="flex items-center justify-between gap-2">
                    <div
                      className="flex min-w-0 cursor-pointer items-center gap-3"
                      onClick={() => onOpenAuthorProfile?.(creator.id)}
                    >
                      <CreatorAvatar avatar={creator.avatar} name={creator.name} />
                      <div className="min-w-0">
                        <p className="text-body-large-medium text-foreground truncate hover:underline">
                          {creator.name}
                        </p>
                        <p className="text-body-small-regular text-muted-foreground truncate">
                          {creator.handle}
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="primary-contained"
                      className="text-button-small-medium hover:bg-primary-400 px-3 py-2"
                      onClick={() => handleToggleSuggestedFollow(creator.id)}
                      disabled={false}
                    >
                      {creator.isFollowing
                        ? t('discover.web.following', 'Following')
                        : t('discover.web.follow', 'Follow')}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
