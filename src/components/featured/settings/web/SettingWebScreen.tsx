'use client';

import {
  Check,
  ChevronDown,
  ClockRewind,
  LogOut01,
  Moon02,
  Settings01,
  Contrast02,
  Sun,
  X,
} from '@untitledui/icons';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/shared/atoms/button';
import SplashLogo from '@/components/shared/SplashLogo';
import { useGetData } from '@/context/GetdataContext';
import { useAuthHydrated } from '@/hook/useAuthHydrated';
import { authApi } from '@/services/auth';
import { tokenStorage } from '@/services/tokenStorage';
import { useAccountStore } from '@/store/useAccountStore';
import { useAuthStore } from '@/store/authStore';
import { useFavoriteAssetsStore } from '@/store/favoriteAssetsStore';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme/ThemeProvider';

const LANGUAGE_CODES = [
  'en-EN',
  'vi-VN',
  'zh-CN',
  'ja-JP',
  'ko-KR',
  'es-ES',
  'fr-FR',
  'de-DE',
  'ru-RU',
  'pt-BR',
  'th-TH',
  'id-ID',
  'ar-SA',
] as const;

const REGION_LABEL_OVERRIDES: Record<string, string> = {
  UK: 'UK',
  US: 'US',
  EN: 'EN',
  CN: 'CN',
  JP: 'JP',
  KR: 'KR',
  ES: 'ES',
  FR: 'FR',
  DE: 'DE',
  RU: 'RU',
  BR: 'BR',
  TH: 'TH',
  ID: 'ID',
  SA: 'SA',
};

type LanguageOption = {
  code: string;
  label: string;
  region?: string;
};

type SettingsSection = 'general' | 'display';

type SettingWebScreenProps = {
  inSheet?: boolean;
  onClose?: () => void;
};

function normalizeLocale(code: string): string {
  if (code === 'en-EN') return 'en';
  return code;
}

function buildLanguageOptions(displayLocale: string): LanguageOption[] {
  const languageNames = new Intl.DisplayNames([displayLocale], { type: 'language' });
  const regionNames = new Intl.DisplayNames([displayLocale], { type: 'region' });

  return LANGUAGE_CODES.map((code) => {
    const normalized = normalizeLocale(code);
    const [languagePart, regionPart] = normalized.split('-');
    const languageLabel = languageNames.of(languagePart) ?? languagePart;
    const resolvedRegion =
      regionPart != null
        ? (REGION_LABEL_OVERRIDES[regionPart] ?? regionNames.of(regionPart) ?? regionPart)
        : undefined;

    return {
      code,
      label: languageLabel,
      region: resolvedRegion,
    };
  });
}

function getLanguageDisplayText(option: LanguageOption): string {
  return option.region ? `${option.label} (${option.region})` : option.label;
}

export default function SettingWebScreen({ inSheet = false, onClose }: SettingWebScreenProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { mode, setMode } = useTheme();
  const hasHydratedAuth = useAuthHydrated();
  const { me } = useGetData();

  const logout = useAuthStore((state) => state.logout);
  const clearFavorites = useFavoriteAssetsStore((state) => state.clearFavorites);
  const clearSelection = useAccountStore((state) => state.clearSelection);
  const clearAuth = useAppStore((state) => state.clearAuth);
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const { refetchAssets } = useGetData();
  const user = useAuthStore((state) => state.user);
  const [activeSection, setActiveSection] = useState<SettingsSection>('general');
  const [isLoggingOut, setLoggingOut] = useState(false);
  const [isLanguageExpanded, setLanguageExpanded] = useState(false);

  const languageOptions = useMemo(() => {
    const appLanguage = language ?? 'en-EN';
    return buildLanguageOptions(normalizeLocale(appLanguage));
  }, [language]);

  const selectedLanguageLabel = getLanguageDisplayText(
    languageOptions.find((item) => item.code === (language ?? 'en-EN')) ?? {
      code: 'en-EN',
      label: 'English',
    },
  );

  const handleClose = () => {
    if (onClose) {
      onClose();
      return;
    }
    router.back();
  };
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
      router.push('/');
    } finally {
      setLoggingOut(false);
    }
  }, [clearAuth, clearFavorites, clearSelection, isLoggingOut, logout, refetchAssets, router]);

  const handleSetAppearance = (nextMode: 'light' | 'dark') => {
    localStorage.setItem('tradingview.current_theme.name', nextMode);
    setMode(nextMode);
  };

  if (!hasHydratedAuth) {
    return <SplashLogo size={300} />;
  }

  return (
    <div
      className={
        inSheet
          ? 'bg-background h-[min(38.5rem,calc(100dvh-2rem))] w-[min(41.75rem,calc(100vw-2rem))] dark:bg-neutral-900'
          : 'bg-background h-[calc(100dvh-72px)] p-4 dark:bg-neutral-900'
      }
    >
      <div
        className={`border-border bg-background flex flex-col overflow-hidden rounded dark:bg-neutral-900 ${
          inSheet ? 'h-full w-full max-w-none' : 'mx-auto h-full w-full max-w-280'
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-foreground text-button-large-semibold">
            {t('settings.title', 'Settings')}
          </h1>
          <Button
            variant="white-contained"
            className="hover:bg-muted h-6 w-6 rounded p-0 dark:bg-neutral-900 hover:dark:bg-neutral-800/50"
            onClick={handleClose}
            aria-label={t('common.close', 'Close')}
          >
            <X size={24} />
          </Button>
        </div>

        <div
          className={`grid grid-cols-[220px_minmax(0,1fr)] ${
            inSheet ? 'border-border h-full border-t' : 'flex-1 overflow-hidden'
          }`}
        >
          <aside className="border-border flex h-full flex-col border-r px-3 py-3">
            <div className="scrollbar-neutral-slim w-full flex-1 overflow-y-auto">
              <div className="flex flex-col gap-2">
                <SectionButton
                  active={activeSection === 'general'}
                  icon={Settings01}
                  label={t('settings.sectionGeneral', 'General')}
                  onClick={() => setActiveSection('general')}
                />
                <SectionButton
                  active={activeSection === 'display'}
                  icon={Contrast02}
                  label={t('settings.sectionDisplay', 'Display')}
                  onClick={() => setActiveSection('display')}
                />
              </div>
            </div>
            <div className="shrink-0 pt-3">
              {user ? (
                <Button
                  variant="white-contained"
                  className="flex h-10 w-full items-center justify-start gap-2 px-2 text-red-500 hover:bg-red-50 dark:bg-neutral-900 dark:hover:bg-red-900/20"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  <LogOut01 size={24} className="text-red-500" />
                  <span className="text-button-large-semibold text-red-500">
                    {t('settings.signOut', 'Sign out')}
                  </span>
                </Button>
              ) : null}
            </div>
          </aside>

          <section
            className={`scrollbar-neutral-slim h-full overflow-y-auto ${inSheet ? 'px-0 py-0' : 'px-4 py-4'}`}
          >
            {activeSection === 'general' ? (
              <div className="w-auto px-4 py-4">
                <h2 className="text-foreground text-button-large-semibold mb-3">
                  {t('settings.language', 'Language')}
                </h2>
                <div className="border-border rounded">
                  <Button
                    variant="white-contained"
                    className={`border-border text-foreground text-body-large-regular flex w-full items-center justify-between rounded border ${
                      inSheet ? 'mb-2 px-3 py-2.5 dark:bg-neutral-800' : 'px-3 py-2.5'
                    }`}
                    onClick={() => setLanguageExpanded((prev) => !prev)}
                  >
                    <span>{selectedLanguageLabel}</span>
                    <ChevronDown
                      size={24}
                      className={`text-muted-foreground transition-transform ${
                        isLanguageExpanded ? 'rotate-180' : 'rotate-0'
                      }`}
                    />
                  </Button>

                  {isLanguageExpanded ? (
                    <div
                      className={
                        inSheet
                          ? 'scrollbar-neutral-slim border-border max-h-[min(27.5rem,calc(100dvh-16rem))] overflow-y-auto rounded border px-3 py-3'
                          : 'scrollbar-neutral-slim max-h-64 overflow-y-auto py-1'
                      }
                    >
                      {languageOptions.map((item) => {
                        const isSelected = (language ?? 'en-EN') === item.code;
                        return (
                          <Button
                            key={item.code}
                            variant="white-contained"
                            className={`hover:bg-muted flex h-12 w-full items-center justify-between rounded-none text-left shadow-none dark:bg-neutral-800 ${
                              inSheet ? 'px-4' : 'px-3'
                            }`}
                            onClick={() => setLanguage(item.code)}
                          >
                            <span className={isSelected ? 'text-primary-500' : 'text-foreground'}>
                              {getLanguageDisplayText(item)}
                            </span>
                            {isSelected ? <Check size={24} className="text-primary-500" /> : null}
                          </Button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {activeSection === 'display' ? (
              <div className="w-auto px-4 py-4">
                <div className="max-w-[620px] space-y-6">
                  <div>
                    <h2 className="text-foreground text-button-large-semibold mb-2">
                      {t('settings.appearance', 'Appearance')}
                    </h2>
                    <div className="grid grid-cols-2 gap-2">
                      <SelectCard
                        active={mode === 'light'}
                        icon={Sun}
                        onClick={() => handleSetAppearance('light')}
                        label={t('settings.light', 'Light')}
                      />
                      <SelectCard
                        active={mode === 'dark'}
                        icon={Moon02}
                        onClick={() => handleSetAppearance('dark')}
                        label={t('settings.dark', 'Dark')}
                      />
                    </div>
                  </div>

                  {/* <div>
                    <h2 className="text-foreground text-button-large-semibold mb-2">
                      {t('settings.priceDisplay', 'Price display')}
                    </h2>
                    <div className="grid grid-cols-2 gap-2">
                      <SelectCard
                        active={priceDisplay === 'buy'}
                        onClick={() => setPriceDisplay('buy')}
                        label={t('settings.buyPrice', 'Buy Price')}
                      />
                      <SelectCard
                        active={priceDisplay === 'sell'}
                        onClick={() => setPriceDisplay('sell')}
                        label={t('settings.sellPrice', 'Sell Price')}
                      />
                    </div>
                  </div> */}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}

function SectionButton({
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
      variant="white-contained"
      onClick={onClick}
      className={`!text-button-large-semibold flex h-12 w-full items-center justify-start gap-2 rounded px-5 dark:bg-neutral-800 ${
        active ? 'text-primary-500 dark:text-primary-500' : 'text-foreground hover:text-primary-500'
      }`}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center">
        <Icon size={24} />
      </span>
      <span className="text-button-large-semibold">{label}</span>
    </Button>
  );
}

function SelectCard({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon?: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant="white-contained"
      className={`h-10 justify-start gap-2 rounded border px-3 text-sm ${
        active
          ? 'border-primary-500 bg-primary-50/40 text-primary-500 dark:border-neutral-900 dark:bg-neutral-800'
          : 'border-border text-foreground dark:border-neutral-800 dark:bg-neutral-900'
      }`}
      onClick={onClick}
    >
      {Icon ? <Icon size={24} /> : null}
      {label}
    </Button>
  );
}

