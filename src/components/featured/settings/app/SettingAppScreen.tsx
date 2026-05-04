'use client';

import {
  ChevronRight,
  LogOut01,
  Settings01,
  Gift01,
  MessageTextSquare01,
  MessageChatCircle,
  CloudMoon,
  Scales01,
} from '@untitledui/icons';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  getLanguageLabelForSetting,
  LanguagePicker,
} from '@/components/featured/settings/components/LanguagePicker';
import { UserCard } from '@/components/featured/settings/components/UserCard';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/authStore';
import { useFavoriteAssetsStore } from '@/store/favoriteAssetsStore';
import { useTheme } from '@/theme';
import { useAccountStore } from '@/store/useAccountStore';
import { authApi } from '@/services/auth';
import { tokenStorage } from '@/services/tokenStorage';
import { Button } from '@/components/shared/atoms/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/shared/atoms/sheet';
import { useTranslation } from 'react-i18next';
import TranslateSvg from '@/components/shared/icons/TranslateSvg';
import { Switch } from '@/components/shared/atoms/switch';
import { useGetData } from '@/context/GetdataContext';
import SplashLogo from '@/components/shared/SplashLogo';
import { useAuthHydrated } from '@/hook/useAuthHydrated';
import AppHeader from '@/components/shared/header/AppHeader';
//import i18n from '@/translations'

const ICON_SIZE = 24;

function SettingsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const clearFavorites = useFavoriteAssetsStore((state) => state.clearFavorites);
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const clearAuth = useAppStore((s) => s.clearAuth);
  const { colors, mode, setMode } = useTheme();
  const [isLanguagePickerOpen, setLanguagePickerOpen] = useState(false);
  const [pendingLanguage, setPendingLanguage] = useState(language ?? 'en-EN');
  const [isLogoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setLoggingOut] = useState(false);
  const [isThemeSwitching, setThemeSwitching] = useState(false);
  const themeSwitchTimeoutRef = useRef<number | null>(null);
  const clearSelection = useAccountStore((state) => state.clearSelection);
  const currentLanguageLabel = getLanguageLabelForSetting(language ?? 'en-EN');
  const { refetchAssets } = useGetData();

  const hasHydratedAuth = useAuthHydrated();

  useEffect(() => {
    return () => {
      if (themeSwitchTimeoutRef.current !== null) {
        window.clearTimeout(themeSwitchTimeoutRef.current);
      }
    };
  }, []);

  const handleLanguageSelect = useCallback((code: string) => {
    setPendingLanguage(code);
  }, []);

  const handleApplyLanguage = useCallback(() => {
    setLanguage(pendingLanguage);
    setLanguagePickerOpen(false);
    //void i18n.changeLanguage(pendingLanguage)
  }, [pendingLanguage, setLanguage]);

  const handleLogout = async () => {
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
      router.push('/'); // Redirect home after logout
    } finally {
      setLoggingOut(false);
      setLogoutConfirmOpen(false);
    }
  };

  const handleThemeChange = useCallback(
    (checked: boolean) => {
      if (isThemeSwitching) return;
      const targetMode = checked ? 'dark' : 'light';
      if (targetMode === mode) return;

      setThemeSwitching(true);
      themeSwitchTimeoutRef.current = window.setTimeout(() => {
        requestAnimationFrame(() => {
          localStorage.setItem('tradingview.current_theme.name', targetMode);
          setMode(targetMode);
          themeSwitchTimeoutRef.current = window.setTimeout(() => {
            setThemeSwitching(false);
            themeSwitchTimeoutRef.current = null;
          }, 220);
        });
      }, 140);
    },
    [isThemeSwitching, mode, setMode],
  );

  const renderMenuItem = (
    Icon: React.ElementType,
    label: string,
    onPress?: () => void,
    rightElement?: React.ReactNode,
    isBorderBottom = false,
  ) => (
    <div
      className={`bg-background flex w-full items-center py-4 text-left transition-colors dark:hover:bg-neutral-800 ${onPress ? 'cursor-pointer' : ''} ${isBorderBottom ? 'border-border border-b dark:border-neutral-800' : ''}`}
      role={onPress ? 'button' : undefined}
      tabIndex={onPress ? 0 : undefined}
      onClick={onPress}
      onKeyDown={
        onPress
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onPress();
              }
            }
          : undefined
      }
    >
      <div className="mr-3 flex shrink-0 items-center justify-center">
        <Icon size={ICON_SIZE} className="text-foreground" />
      </div>
      <span className="text-body-large-medium text-foreground hover:text-primary-500 flex-1">
        {label}
      </span>
      {rightElement ?? (
        <ChevronRight color={colors.neutral500} size={24} className="hover:text-primary-500" />
      )}
    </div>
  );

  const renderSectionHeader = (title: string) => (
    <span className="text-body-large-medium text-muted-foreground mt-3 mb-2 block">{title}</span>
  );

  if (!hasHydratedAuth) {
    return <SplashLogo size={300} />;
  }

  return (
    <div className="bg-background text-foreground flex h-full flex-col">
      <AppHeader label={t('settings.title')} onBack={() => router.back()} />
      <Sheet
        open={isLanguagePickerOpen}
        onOpenChange={(open) => {
          setLanguagePickerOpen(open);
          if (open) {
            setPendingLanguage(language ?? 'en-EN');
          }
        }}
      >
        <SheetContent
          side="bottom"
          className="bg-background mx-auto flex h-[90%] max-h-[90%] w-full max-w-3xl flex-col overflow-hidden rounded-t-lg"
          showCloseButton={false}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <SheetHeader className="border-border flex flex-row items-center justify-between space-y-0 border-b px-4 py-4">
            <SheetTitle className="text-h3-semibold">{t('settings.selectLanguage')}</SheetTitle>
            <Button
              variant="white-contained"
              className="text-button-large-medium text-primary-500! h-auto p-0"
              onClick={handleApplyLanguage}
            >
              {t('common.done', 'Done')}
            </Button>
          </SheetHeader>
          <LanguagePicker
            autoFocusSearch={isLanguagePickerOpen}
            currentLanguage={pendingLanguage}
            onDismiss={() => setLanguagePickerOpen(false)}
            onSelect={handleLanguageSelect}
          />
        </SheetContent>
      </Sheet>
      <Sheet open={isLogoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
        <SheetContent
          side="center"
          className="bg-background border-border mx-auto flex w-full max-w-100 flex-col border p-4"
          showCloseButton={false}
          title={t('settings.confirmSignOutTitle')}
        >
          <SheetHeader className="py-2">
            <SheetTitle className="text-h2-semibold text-center">
              {t('settings.signOutNow')}
            </SheetTitle>
            <SheetDescription className="text-body-small-regular text-muted-foreground text-center">
              {t('settings.signOutDesc')}
            </SheetDescription>
          </SheetHeader>
          <SheetFooter className="gap-3 p-0">
            <Button
              variant="primary-contained"
              className="h-12 w-full rounded"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {t('settings.signOut')}
            </Button>
            <Button
              variant="neutral-outline"
              className="bg-primary-50 h-12 w-full rounded"
              onClick={() => setLogoutConfirmOpen(false)}
              disabled={isLoggingOut}
            >
              <p className="text-button-large-medium text-primary-500">{t('common.cancel')}</p>
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <div className="min-h-screen flex-1 px-4">
        <UserCard />

        {/* General */}
        {renderSectionHeader(t('settings.sectionGeneral'))}
        <div className="bg-background border-border overflow-hidden rounded">
          {renderMenuItem(
            TranslateSvg,
            t('settings.language'),
            () => setLanguagePickerOpen(true),
            <div className="flex flex-row items-center">
              <span className="text-body-large-medium text-foreground mr-1">
                {currentLanguageLabel}
              </span>
              <ChevronRight color={colors.neutral500} size={24} />
            </div>,
            true,
          )}
          {renderMenuItem(
            CloudMoon,
            t('settings.darkMode'),
            undefined,
            <Switch
              checked={mode === 'dark'}
              onCheckedChange={handleThemeChange}
              aria-label={t('settings.darkMode')}
              disabled={isThemeSwitching}
            />,
            true,
          )}
          {renderMenuItem(
            Settings01,
            t('settings.security'),
            () => router.push('/settings/security'),
            undefined,
            true,
          )}
          {renderMenuItem(Gift01, t('settings.rewardsCenter'), () => router.push('/rewards'))}
        </div>

        {/* Accounts */}
        {renderSectionHeader(t('settings.accounts', 'Accounts'))}
        <div className="bg-background border-border overflow-hidden rounded">
          {renderMenuItem(Scales01, t('settings.accountLeverage', 'Leverage'), () =>
            router.push('/settings/accounts'),
          )}
        </div>

        {/* Support */}
        {renderSectionHeader(t('settings.sectionSupport'))}
        <div className="bg-background border-border overflow-hidden rounded">
          {renderMenuItem(
            MessageTextSquare01,
            t('settings.feedback'),
            () => router.push('/settings/feedback'),
            undefined,
            true,
          )}
          {renderMenuItem(
            MessageChatCircle,
            t('settings.support'),
            () => router.push('/settings/support'),
            undefined,
            true,
          )}
          {/* {renderMenuItem(Building05, t('settings.aboutMtx'), () =>
            router.push('/about'),
          )} */}
        </div>

        {/* Sign out */}
        {user ? (
          <Button
            variant="white-contained"
            className="bg-background border-border mt-4 cursor-pointer flex-row rounded pt-2 transition-colors"
            onClick={() => setLogoutConfirmOpen(true)}
          >
            <LogOut01 className="mr-3" color={colors.red500} size={20} />
            <span className="text-base font-medium text-red-500">{t('settings.signOut')}</span>
          </Button>
        ) : null}
      </div>
      {isThemeSwitching ? (
        <div className="bg-background/85 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-[1px]">
          <div className="animate-pulse opacity-80">
            <Image src="/logo/logo.png" alt="MTX Trading" width={84} height={84} priority />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default memo(SettingsPage);
