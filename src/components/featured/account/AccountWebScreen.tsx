'use client';

import {
  Check,
  ChevronRight,
  Copy01,
  Edit02,
  Gift01,
  Loading01,
  LogOut01,
  MessageChatCircle,
  MessageTextSquare01,
  Settings01,
  ClockRewind,
  Share07,
  User01,
} from '@untitledui/icons';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/shared/atoms/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/shared/atoms/web/sheet';
import SplashLogo from '@/components/shared/SplashLogo';
import SecurityWebScreen from '@/components/featured/security/web/SecurityWebScreen';
import FeedbackWebContent from '@/components/featured/settings/web/FeedbackWebContent';
import ChatSupportWebScreen from '@/components/featured/chat/web/ChatSupportWebScreen';
import SupportScreenWeb from '@/components/featured/support-history/web/SupportScreenWeb';
import TransactionHistoryWeb from '@/components/featured/transaction-history/web/TransactionHistoryWeb';
import DepositFlowSheet from '@/components/featured/deposit/web/DepositFlowSheet';
import TopUpFlowSheet from '@/components/featured/top-up/web/TopUpFlowSheet';
import WithdrawFlowSheet from '@/components/featured/withdraw/web/WithdrawFlowSheet';
import { authApi } from '@/services/auth';
import { imageApi } from '@/services/imageService';
import { tokenStorage } from '@/services/tokenStorage';
import { useFavoriteAssetsStore } from '@/store/favoriteAssetsStore';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/authStore';
import { useAccountStore } from '@/store/useAccountStore';
import { useAuthHydrated } from '@/hook/useAuthHydrated';
import { useGetData } from '@/context/GetdataContext';
import EditUserName from '@/components/featured/personal-info/web/components/EditUserName';
import EditDisplayName from '@/components/featured/personal-info/web/components/EditDisplayName';
import EditGender from '@/components/featured/personal-info/web/components/EditGender';
import { SupportTicketStatus } from '@/types/support';
import TransferFlowSheet from '@/components/featured/transfer/web/TransferFlowSheet';
import { useToast } from '@/hook/useToast';
import { ACCOUNT_TYPES_ID } from '@/constants/account';
import { cn } from '@/lib/utils';
import { User } from '@/types/auth';

const USER_PLACEHOLDER_ICON = '/assets/images/discover/filled.png';

type SettingsMenuItemId =
  | 'account-information'
  | 'security'
  | 'transaction-history'
  | 'feedback'
  | 'support';

const VALID_TABS: SettingsMenuItemId[] = [
  'account-information',
  'security',
  'feedback',
  'support',
  'transaction-history',
];

type SupportChatState =
  | { mode: 'history' }
  | {
      mode: 'chat';
      createMode: boolean;
      requestedStatus?: SupportTicketStatus;
      ticketId: null | string;
    };

function maskEmail(email?: string | null): string {
  if (!email) return '-';
  const [name, domain] = email.split('@');
  if (!name || !domain) return email;
  if (name.length <= 3) return `${name[0] ?? '*'}***@${domain}`;
  return `${name.slice(0, 3)}***@${domain}`;
}

function SettingsDetailRow({
  label,
  value,
  onClick,
  suffixIcon: SuffixIcon = ChevronRight,
}: {
  label: string;
  value: ReactNode;
  onClick?: () => void;
  suffixIcon?: React.ElementType;
}) {
  return (
    <button
      type="button"
      disabled={!onClick}
      onClick={onClick}
      className={`border-border flex h-[68px] w-full items-center justify-between border-b px-0 text-left ${
        onClick ? 'cursor-pointer' : 'cursor-default'
      }`}
    >
      <span className="text-muted-foreground text-body-large-medium leading-5">{label}</span>
      <div className="flex items-center gap-2">
        <div className="text-foreground text-[16px] leading-5 font-semibold">{value}</div>
        {onClick ? <SuffixIcon size={20} className="text-muted-foreground" /> : null}
      </div>
    </button>
  );
}

function SettingsMenuButton({
  active = false,
  icon: Icon,
  label,
  onClick,
  isDestructive = false,
}: {
  active?: boolean;
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  isDestructive?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="white-contained"
      onClick={onClick}
      className={`flex h-12 w-full items-center justify-between rounded bg-transparent px-3 shadow-none transition-colors ${
        active
          ? 'bg-primary-50 hover:bg-muted text-primary-500 dark:text-primary-500 cursor-default dark:bg-neutral-900'
          : 'text-foreground hover:bg-muted hover:text-primary-500 dark:hover:text-primary-500 cursor-pointer'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className={cn(isDestructive ? 'text-red-600' : 'text-current', 'size-6')} />
        <span
          className={`text-body-large-medium ${isDestructive ? 'text-red-600' : 'text-current'}`}
        >
          {label}
        </span>
      </div>
    </Button>
  );
}

export default function WebScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasHydratedAuth = useAuthHydrated();
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const logout = useAuthStore((state) => state.logout);
  const clearFavorites = useFavoriteAssetsStore((state) => state.clearFavorites);
  const clearSelection = useAccountStore((state) => state.clearSelection);
  const selectedAccount = useAccountStore((state) => state.selectedAccount);
  const clearAuth = useAppStore((state) => state.clearAuth);
  const { me, refetchAssets, refetchMe } = useGetData();
  const { showError, showSuccess } = useToast();
  const [activeItem, setActiveItem] = useState<SettingsMenuItemId>('account-information');
  const [isLogoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setLoggingOut] = useState(false);
  const [isNicknameSheetOpen, setNicknameSheetOpen] = useState(false);
  const [isDisplayNameSheetOpen, setDisplayNameSheetOpen] = useState(false);
  const [isGenderSheetOpen, setGenderSheetOpen] = useState(false);
  const [isDepositSheetOpen, setDepositSheetOpen] = useState(false);
  const [isTopUpSheetOpen, setTopUpSheetOpen] = useState(false);
  const [isWithdrawSheetOpen, setWithdrawSheetOpen] = useState(false);
  const [isTransferSheetOpen, setTransferSheetOpen] = useState(false);
  const [supportChatState, setSupportChatState] = useState<SupportChatState>({ mode: 'history' });
  const [isUidCopied, setIsUidCopied] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profileUser = me ?? user;

  const menuItems = useMemo(
    () => [
      {
        id: 'account-information' as const,
        icon: User01,
        label: t('accountInformation.title', 'Account Information'),
      },
      {
        id: 'security' as const,
        icon: Settings01,
        label: t('settings.security'),
      },
      {
        id: 'feedback' as const,
        icon: MessageTextSquare01,
        label: t('settings.feedback'),
      },
      {
        id: 'support' as const,
        icon: MessageChatCircle,
        label: t('settings.support'),
      },
      {
        id: 'transaction-history' as const,
        icon: ClockRewind,
        label: t('transactionHistory.title', 'Transaction History'),
      },
    ],
    [t],
  );

  const tabParam = searchParams.get('tab');

  useEffect(() => {
    if (!tabParam) return;
    const normalized = tabParam.toLowerCase() as SettingsMenuItemId;
    const matchedTab = VALID_TABS.find((tab) => tab === normalized);
    if (matchedTab) {
      window.setTimeout(() => setActiveItem(matchedTab), 0);
    }
  }, [tabParam]);

  const onMenuItemClick = useCallback(
    (itemId: SettingsMenuItemId) => {
      setActiveItem(itemId);
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', itemId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });

      if (itemId === 'account-information') return;
      if (itemId === 'security') {
        return;
      }
      if (itemId === 'transaction-history') {
        return;
      }
      if (itemId === 'feedback') {
        return;
      }
      if (itemId === 'support') {
        setSupportChatState({ mode: 'history' });
        return;
      }
    },
    [pathname, router, searchParams],
  );

  const displayGender = useCallback(
    (value?: string | null): string => {
      if (!value) return t('personalInfo.unknown', 'Unknown');
      const normalized = value.toUpperCase();
      if (normalized === 'MALE') return t('personalInfo.male', 'Male');
      if (normalized === 'FEMALE') return t('personalInfo.female', 'Female');
      if (normalized === 'OTHER') return t('personalInfo.unknown', 'Unknown');
      return t('personalInfo.unknown', 'Unknown');
    },
    [t],
  );

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return;
    setLoggingOut(true);
    try {
      await authApi.logout().catch(() => undefined);
      tokenStorage.clearToken();
      clearAuth();
      logout();
      clearFavorites();
      clearSelection();
      void refetchAssets();
      void refetchMe();
      router.push('/');
    } finally {
      setLoggingOut(false);
      setLogoutConfirmOpen(false);
    }
  }, [
    clearAuth,
    clearFavorites,
    clearSelection,
    isLoggingOut,
    logout,
    refetchAssets,
    refetchMe,
    router,
  ]);

  const handleDepositClick = useCallback(() => {
    if (selectedAccount?.accountTypeId === ACCOUNT_TYPES_ID.DEMO) {
      setTopUpSheetOpen(true);
    } else {
      setDepositSheetOpen(true);
    }
  }, [selectedAccount?.accountTypeId]);

  const handleWithdrawClick = useCallback(() => {
    if (selectedAccount?.accountTypeId === ACCOUNT_TYPES_ID.DEMO) {
      showError(
        t('home.withdrawFailedTitle', 'Withdraw failed'),
        t(
          'home.withdrawDemoError',
          'Demo accounts cannot perform withdrawals. Please top up your account.',
        ),
      );
    } else {
      setWithdrawSheetOpen(true);
    }
  }, [selectedAccount?.accountTypeId, showError, t]);

  const handleTransferClick = useCallback(() => {
    if (selectedAccount?.accountTypeId === ACCOUNT_TYPES_ID.DEMO) {
      showError(
        t('home.transferFailedTitle', 'Transfer failed'),
        t(
          'home.transferDemoError',
          'Demo accounts cannot perform transfers. Please switch to a live account.',
        ),
      );
    } else {
      setTransferSheetOpen(true);
    }
  }, [selectedAccount?.accountTypeId, showError, t]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploadingAvatar(true);

      try {
        const avatar = await imageApi.uploadImageToPresignedUrl(file, {
          type: file.type || 'image/jpeg',
          fileName: file.name || 'photo.jpg',
        });

        const trimmedUsername = profileUser?.username?.trim();
        await authApi.updateProfile({
          avatar,
          ...(trimmedUsername ? { username: trimmedUsername } : {}),
        });

        updateUser({ avatar });
        await refetchMe();

        showSuccess(
          t('personalInfo.uploadSuccessTitle', 'Success'),
          t('personalInfo.uploadSuccessMessage', 'Avatar updated successfully'),
        );
      } catch (error) {
        showError(
          t('common.error', 'Error'),
          error instanceof Error
            ? error.message
            : t('common.uploadFailed', 'Upload failed. Please try again.'),
        );
      } finally {
        setIsUploadingAvatar(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [profileUser, updateUser, showSuccess, showError, t, refetchMe],
  );

  if (!hasHydratedAuth) {
    return <SplashLogo size={300} />;
  }

  return (
    <div className="bg-background h-[calc(100dvh-72px)] overflow-hidden">
      <Sheet open={isLogoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <SheetContent
          side="center"
          className="bg-background border-border mx-auto flex w-full max-w-[420px] flex-col border p-4"
          showCloseButton={false}
        >
          <SheetHeader className="py-2">
            <SheetTitle className="text-center">{t('settings.signOutNow')}</SheetTitle>
            <SheetDescription className="text-center">{t('settings.signOutDesc')}</SheetDescription>
          </SheetHeader>
          <SheetFooter className="gap-3 p-0">
            <Button
              variant="primary-contained"
              className="h-11 w-full"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {t('settings.signOut')}
            </Button>
            <Button
              variant="neutral-outline"
              className="h-11 w-full"
              onClick={() => setLogoutConfirmOpen(false)}
              disabled={isLoggingOut}
            >
              {t('common.cancel')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <EditUserName open={isNicknameSheetOpen} onOpenChange={setNicknameSheetOpen} />
      <EditDisplayName open={isDisplayNameSheetOpen} onOpenChange={setDisplayNameSheetOpen} />
      <EditGender open={isGenderSheetOpen} onOpenChange={setGenderSheetOpen} />
      <DepositFlowSheet isOpen={isDepositSheetOpen} onOpenChange={setDepositSheetOpen} />
      <TopUpFlowSheet isOpen={isTopUpSheetOpen} onOpenChange={setTopUpSheetOpen} />
      <WithdrawFlowSheet isOpen={isWithdrawSheetOpen} onOpenChange={setWithdrawSheetOpen} />
      <TransferFlowSheet isOpen={isTransferSheetOpen} onOpenChange={setTransferSheetOpen} />
      <div className="grid h-full min-h-0 grid-cols-[344px_minmax(0,1fr)] gap-12 px-6 py-6 min-[1123px]:px-20">
        <section className="bg-background border-border flex h-full flex-col overflow-hidden rounded border p-6">
          <div className="mb-6 flex shrink-0 items-center gap-4">
            <div className="bg-muted flex h-10 w-10 items-center justify-center overflow-hidden rounded-full">
              <Image
                src={user?.avatar || USER_PLACEHOLDER_ICON}
                alt={t('settings.userCard.avatarAlt', 'User avatar')}
                width={48}
                height={48}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0">
              {user ? (
                <>
                  <p className="text-body-large-semibold text-foreground truncate">{user.email}</p>
                  <div className="bg-primary-50 dark:bg-primary-900/25 border-border mt-1 flex w-fit items-center justify-center rounded border px-2 py-0.5 dark:border-neutral-800">
                    <Image
                      src="/assets/icons/verify.svg"
                      alt="Verified"
                      width={16}
                      height={16}
                      className="mr-1 h-4 w-4"
                    />
                    <span className="text-primary-500 text-xs font-semibold">
                      {t('settings.userCard.verified')}
                    </span>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push('/login')}
                  className="text-body-large-semibold text-primary-500 hover:text-primary-600"
                >
                  {t('auth.login.title')} / {t('auth.register.title')}
                </button>
              )}
            </div>
          </div>

          <div className="scrollbar-neutral-slim -mr-2 flex-1 overflow-y-auto pr-2">
            <div className="space-y-3">
              {menuItems.map((item) => (
                <SettingsMenuButton
                  key={item.id}
                  active={activeItem === item.id}
                  icon={item.icon as React.ElementType}
                  label={item.label}
                  onClick={() => onMenuItemClick(item.id)}
                />
              ))}
              {user ? (
                <SettingsMenuButton
                  icon={LogOut01}
                  label={t('settings.signOut', 'Sign Out')}
                  onClick={() => setLogoutConfirmOpen(true)}
                  isDestructive
                />
              ) : null}
            </div>
          </div>

          {user ? (
            <div className="border-border mt-4 shrink-0 border-t pt-4">
              <div className="mt-0">
                <Button
                  variant="primary-contained"
                  className="h-10 w-full"
                  onClick={handleDepositClick}
                >
                  {t('features.deposit', 'Deposit')}
                </Button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <Button variant="primary-ghost" className="h-10" onClick={handleWithdrawClick}>
                  {t('features.withdraw', 'Withdraw')}
                </Button>
                <Button variant="primary-ghost" className="h-10" onClick={handleTransferClick}>
                  {t('features.transfer', 'Transfer')}
                </Button>
              </div>
            </div>
          ) : null}
        </section>

        <section className="bg-background min-h-0 overflow-y-auto rounded pr-1 no-scrollbar">
          {activeItem === 'security' ? (
            <SecurityWebScreen />
          ) : activeItem === 'transaction-history' ? (
            <TransactionHistoryWeb />
          ) : activeItem === 'feedback' ? (
            <FeedbackWebContent />
          ) : activeItem === 'support' ? (
            supportChatState.mode === 'history' ? (
              <SupportScreenWeb
                onOpenChat={({ ticketId, status }) =>
                  setSupportChatState({
                    mode: 'chat',
                    createMode: false,
                    requestedStatus: status,
                    ticketId,
                  })
                }
                onCreateChat={() =>
                  setSupportChatState({
                    mode: 'chat',
                    createMode: true,
                    ticketId: null,
                  })
                }
              />
            ) : (
              <ChatSupportWebScreen
                ticketId={supportChatState.ticketId}
                requestedStatus={supportChatState.requestedStatus}
                createMode={supportChatState.createMode}
                onBack={() => setSupportChatState({ mode: 'history' })}
                onTicketCreated={(newTicketId) =>
                  setSupportChatState((prev) =>
                    prev.mode === 'chat'
                      ? {
                          ...prev,
                          createMode: false,
                          ticketId: newTicketId,
                        }
                      : prev,
                  )
                }
              />
            )
          ) : (
            <>
              <div className="mb-6 flex flex-col items-center justify-center pt-8">
                <div className="relative mb-3">
                  <div className="bg-background h-36 w-36 overflow-hidden rounded-full">
                    <Image
                      key={user?.avatar || 'avatar'}
                      src={user?.avatar || USER_PLACEHOLDER_ICON}
                      alt={t('settings.userCard.avatarAlt', 'User avatar')}
                      width={144}
                      height={144}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                    {isUploadingAvatar && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20">
                        <Loading01 color="white" size={24} className="animate-spin" />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="bg-primary-50 hover:bg-primary-200 dark:bg-card dark:hover:bg-muted absolute right-0 bottom-1 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full shadow-sm transition-colors"
                    disabled={isUploadingAvatar}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Edit02 size={20} className="text-primary-500" />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                </div>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-2 transition-colors"
                  onClick={() => {
                    const uid = (user as User)?.id;
                    if (uid) {
                      navigator.clipboard.writeText(uid);
                      showSuccess(
                        t('common.success', 'Success'),
                        t('common.copied', 'Copied to clipboard'),
                      );
                      setIsUidCopied(true);
                      setTimeout(() => setIsUidCopied(false), 2000);
                    }
                  }}
                >
                  <span className="text-body-large-medium">UID: {(user as User)?.id || '-'}</span>
                  {isUidCopied ? (
                    <Check size={18} className="text-green-500" />
                  ) : (
                    <Copy01 size={18} />
                  )}
                </button>
              </div>
              <SettingsDetailRow
                label={t('personalInfo.username', 'Username')}
                value={profileUser?.username || '-'}
                onClick={() => setNicknameSheetOpen(true)}
              />
              <SettingsDetailRow
                label={t('personalInfo.displayName', 'Display Name')}
                value={profileUser?.displayName?.trim() || t('personalInfo.notSet', 'Not set')}
                onClick={() => setDisplayNameSheetOpen(true)}
              />
              <SettingsDetailRow
                label={t('personalInfo.gender', 'Gender')}
                value={displayGender(profileUser?.gender)}
                onClick={() => setGenderSheetOpen(true)}
              />
              <SettingsDetailRow
                label={t('personalInfo.linkEmail', 'Link Email')}
                value={maskEmail(profileUser?.email)}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
