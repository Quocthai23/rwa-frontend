'use client';

import { Bookmark, Compass03, UserCircle, UserPlus01 } from '@untitledui/icons';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import { Button } from '@/components/shared/atoms/button';
import type { EditorHandle } from '@/components/shared/atoms/editor';
import { Sheet, SheetContent } from '@/components/shared/atoms/web/sheet';
import { useAuthHydrated } from '@/hook/useAuthHydrated';
import { cn } from '@/lib/utils';
import { FollowingTab } from './components/tab/following/FollowingTab';
import { ForYouTab } from './components/tab/for-you/ForYouTab';
import { BookmarksTab } from './components/tab/bookmark/BookmarksTab';
import { ProfileTab } from './components/tab/profile/ProfileTab';
import { DiscoverSidePanel } from './components/DiscoverSidePanel';
import type { DiscoverTabId } from './components/tab/types';
import { DISCOVER_USER_PLACEHOLDER_ICON } from './hooks/constants';
import { useGetData } from '@/context/GetdataContext';
import { CreatePostComposer } from './components/tab/shared/CreatePostComposer';
import { useDiscoverComposer } from './hooks/useDiscoverComposer';
import { DISCOVER_WEB_POST_CREATED_EVENT } from './constants/events';

const VALID_TABS: DiscoverTabId[] = ['for-you', 'following', 'profile', 'bookmarks'];
const DISCOVER_BASE_PATH = '/discover';

function DiscoverMenuButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="white-contained"
      onClick={onClick}
      className={cn(
        'flex h-12 w-full items-center justify-between rounded px-3 shadow-none transition-colors',
        active
          ? 'bg-primary-50 text-primary-500 hover:bg-primary-50 dark:text-primary-500 dark:bg-neutral-900'
          : 'text-foreground hover:bg-muted',
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className="size-5" />
        <span className="text-button-large-medium">{label}</span>
      </div>
    </Button>
  );
}

export default function DiscoverWebScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname() || DISCOVER_BASE_PATH;
  const detailSlugFromPath = useMemo(() => {
    if (!pathname.startsWith(`${DISCOVER_BASE_PATH}/`)) {
      return '';
    }

    const segment = pathname.slice(`${DISCOVER_BASE_PATH}/`.length).split('/')[0]?.trim() || '';
    return segment ? decodeURIComponent(segment) : '';
  }, [pathname]);
  const isDiscoverDetailRoute = Boolean(detailSlugFromPath);
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const hasHydratedAuth = useAuthHydrated();
  const { me } = useGetData();

  const [activeTab, setActiveTab] = useState<DiscoverTabId>('for-you');
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  const modalComposerTextareaRef = useRef<EditorHandle | null>(null);
  const setAuthorFollowingStateRef = useRef<
    ((authorId: string, nextFollowing: boolean) => void) | null
  >(null);
  const suggestedCreatorsUpdateRef = useRef<
    ((userId: string, nextFollowing: boolean) => void) | null
  >(null);
  const sidePanelSuggestedCreatorsUpdateRef = useRef<
    ((userId: string, nextFollowing: boolean) => void) | null
  >(null);
  const followingTabSuggestedCreatorsUpdateRef = useRef<
    ((userId: string, nextFollowing: boolean) => void) | null
  >(null);
  const profileTabFollowStateSyncRef = useRef<
    ((userId: string, nextFollowing: boolean) => void) | null
  >(null);
  const refetchSuggestedCreatorsRef = useRef<(() => Promise<void>) | null>(null);
  const modalComposerState = useDiscoverComposer({
    onPostCreated: () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(DISCOVER_WEB_POST_CREATED_EVENT));
      }
    },
  });

  const sidebarTabs = useMemo(
    () => [
      { id: 'for-you' as const, icon: Compass03, label: t('discover.web.forYou', 'For You') },
      {
        id: 'following' as const,
        icon: UserPlus01,
        label: t('discover.web.following', 'Following'),
      },
      { id: 'profile' as const, icon: UserCircle, label: t('discover.web.profile', 'Profile') },
      { id: 'bookmarks' as const, icon: Bookmark, label: t('discover.web.bookmarks', 'Bookmarks') },
    ],
    [t],
  );

  const currentDisplayName =
    me?.displayName?.trim() ||
    me?.username?.trim() ||
    me?.email?.split('@')[0] ||
    t('discover.web.guest', 'Guest Trader');
  const currentUsername = me?.username?.trim()
    ? `@${me.username.trim()}`
    : t('discover.web.guestHandle', '@guest');
  const currentUserAvatar = me?.avatar || DISCOVER_USER_PLACEHOLDER_ICON;
  const canShowCreatePostModal = Boolean(me?.id);

  useEffect(() => {
    if (isDiscoverDetailRoute) {
      window.setTimeout(() => setActiveTab('for-you'), 0);
      return;
    }

    if (!tabParam) {
      return;
    }

    const normalized = tabParam.split('?')[0]?.toLowerCase().trim() as DiscoverTabId;
    const matchedTab = VALID_TABS.find((tab) => tab === normalized);
    if (matchedTab) {
      window.setTimeout(() => setActiveTab(matchedTab), 0);
    }
  }, [isDiscoverDetailRoute, tabParam]);

  const handleTabChange = useCallback(
    (tab: DiscoverTabId) => {
      setActiveTab(tab);
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', tab);
      router.replace(`${DISCOVER_BASE_PATH}?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const handleOpenAuthorProfile = useCallback(
    (authorId: string) => {
      const normalizedAuthorId = authorId.trim();
      if (!normalizedAuthorId) {
        return;
      }

      router.replace(
        `${DISCOVER_BASE_PATH}?tab=profile?userId=${encodeURIComponent(normalizedAuthorId)}`,
        {
          scroll: false,
        },
      );
    },
    [router],
  );

  const handleSetAuthorFollowingState = useCallback((authorId: string, nextFollowing: boolean) => {
    setAuthorFollowingStateRef.current?.(authorId, nextFollowing);
  }, []);
  const handleSyncSuggestedCreatorFollowState = useCallback(
    (userId: string, nextFollowing: boolean) => {
      suggestedCreatorsUpdateRef.current?.(userId, nextFollowing);
      profileTabFollowStateSyncRef.current?.(userId, nextFollowing);
    },
    [],
  );

  useEffect(() => {
    suggestedCreatorsUpdateRef.current = (userId: string, nextFollowing: boolean) => {
      sidePanelSuggestedCreatorsUpdateRef.current?.(userId, nextFollowing);
      followingTabSuggestedCreatorsUpdateRef.current?.(userId, nextFollowing);
    };
  }, []);

  const handleCreatePostFromModal = useCallback(async () => {
    const hasCreated = await modalComposerState.createPost();
    if (hasCreated) {
      setIsCreatePostModalOpen(false);
    }
  }, [modalComposerState]);

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'for-you':
        return (
          <ForYouTab
            onSetAuthorFollowingStateRef={setAuthorFollowingStateRef}
            onSuggestedCreatorsUpdateRef={suggestedCreatorsUpdateRef}
          />
        );
      case 'following':
        return (
          <FollowingTab
            onSetAuthorFollowingStateRef={setAuthorFollowingStateRef}
            onSuggestedCreatorsUpdateRef={suggestedCreatorsUpdateRef}
            onSuggestedCreatorFollowStateSync={handleSyncSuggestedCreatorFollowState}
            onSuggestedCreatorsRegisterRef={followingTabSuggestedCreatorsUpdateRef}
          />
        );
      case 'profile':
        return (
          <ProfileTab
            onRefetchSuggestedCreatorsRef={refetchSuggestedCreatorsRef}
            onProfileFollowStateSyncRef={profileTabFollowStateSyncRef}
            onSetAuthorFollowingStateRef={setAuthorFollowingStateRef}
            onSuggestedCreatorsUpdateRef={suggestedCreatorsUpdateRef}
          />
        );
      case 'bookmarks':
        return (
          <BookmarksTab
            onSetAuthorFollowingStateRef={setAuthorFollowingStateRef}
            onSuggestedCreatorsUpdateRef={suggestedCreatorsUpdateRef}
          />
        );
      default:
        return (
          <ForYouTab
            onSetAuthorFollowingStateRef={setAuthorFollowingStateRef}
            onSuggestedCreatorsUpdateRef={suggestedCreatorsUpdateRef}
          />
        );
    }
  };

  if (!hasHydratedAuth) {
    return <div className="bg-card min-h-[calc(100dvh-72px)]" />;
  }

  return (
    <div className="bg-card">
      <div className="relative mx-auto grid max-w-350 grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <section className="bg-background sticky top-[72px] mr-1 hidden h-[calc(100dvh-72px)] flex-col self-start p-4 xl:flex">
          {' '}
          <div className="space-y-1">
            {sidebarTabs.map((item) => (
              <DiscoverMenuButton
                key={item.id}
                active={activeTab === item.id}
                icon={item.icon as React.ElementType}
                label={item.label}
                onClick={() => handleTabChange(item.id)}
              />
            ))}
          </div>
          <div className="mt-5">
            {me ? (
              <Button
                type="button"
                variant="primary-contained"
                className="text-body-large-medium hover:bg-primary-600 h-12 w-full cursor-pointer"
                onClick={() => {
                  if (!canShowCreatePostModal) {
                    router.push('/login');
                    return;
                  }

                  setIsCreatePostModalOpen(true);
                }}
              >
                {t('discover.web.post', 'Post')}
              </Button>
            ) : null}
          </div>
          <div className="mt-auto pt-5">
            {me ? (
              <div className="flex items-center gap-3">
                <Image
                  src={currentUserAvatar}
                  alt={currentDisplayName}
                  width={40}
                  height={40}
                  className="bg-muted h-10 w-10 rounded-full object-cover"
                  unoptimized
                />
                <div className="min-w-0">
                  <p className="text-foreground text-body-large-semibold max-w-40 truncate">
                    {currentDisplayName}
                  </p>
                  <p className="text-muted-foreground text-body-small-regular max-w-40 truncate">
                    {currentUsername}
                  </p>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="primary-outline"
                className="h-10 w-full"
                onClick={() => router.push('/login')}
              >
                {t('auth.login.title', 'Login')}
              </Button>
            )}
          </div>
        </section>
        <section className="bg-background">{renderActiveTab()}</section>

        <div className="sticky top-[72px] ml-1 hidden h-[calc(100dvh-72px)] self-start overflow-hidden xl:block">
          <DiscoverSidePanel
            onOpenAuthorProfile={handleOpenAuthorProfile}
            onRefetchSuggestedCreatorsRef={refetchSuggestedCreatorsRef}
            onSetAuthorFollowingState={handleSetAuthorFollowingState}
            onSuggestedCreatorFollowStateSync={handleSyncSuggestedCreatorFollowState}
            onSuggestedCreatorsUpdateRef={
              sidePanelSuggestedCreatorsUpdateRef as React.RefObject<
                (userId: string, nextFollowing: boolean) => void
              >
            }
          />
        </div>
      </div>
      <Sheet open={isCreatePostModalOpen} onOpenChange={setIsCreatePostModalOpen}>
        <SheetContent
          side="center"
          title={t('discover.web.createPostTitle', 'Create post')}
          className="scrollbar-neutral-slim border-border bg-background max-h-[60vh] min-h-[20vh] max-w-[600px] gap-3 overflow-auto rounded p-3"
          showCloseButton={false}
        >
          <h2 className="text-body-large-semibold text-foreground">
            {t('discover.web.createPostTitle', 'Create post')}
          </h2>

          <CreatePostComposer
            variant="modal"
            canPost={modalComposerState.canPost}
            composerImages={modalComposerState.composerImages}
            composerLinkedAssets={modalComposerState.composerLinkedAssets}
            composerText={modalComposerState.composerText}
            currentUserName={currentDisplayName}
            fileInputRef={modalComposerState.fileInputRef}
            isPosting={modalComposerState.isPosting}
            isUploadingImages={modalComposerState.isUploadingImages}
            onComposerImageChange={modalComposerState.handleComposerImageChange}
            onComposerTextChange={modalComposerState.setComposerText}
            onCreatePost={() => {
              void handleCreatePostFromModal();
            }}
            onToggleComposerAsset={modalComposerState.toggleComposerAsset}
            onRemoveComposerImage={modalComposerState.removeComposerImage}
            onRemoveComposerAsset={modalComposerState.removeComposerAsset}
            textareaRef={modalComposerTextareaRef}
            userAvatar={currentUserAvatar}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

