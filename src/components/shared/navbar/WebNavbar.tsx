'use client';

import {
  Bell01,
  Gift01,
  Settings01,
  BarChartSquare01,
  SwitchVertical01,
  BarChart10,
  Compass03,
  User01,
  Announcement01,
  UsersPlus,
  UploadCloud02,
} from '@untitledui/icons';
import { useAssetDeploymentStore } from '@/store/useAssetDeploymentStore';
import { useKycStore } from '@/store/useKycStore';
import { useToast } from '@/hook/useToast';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import NotificationWebScreen from '@/components/featured/notification/web/NotificationWebScreen';
import SettingWebScreen from '@/components/featured/settings/web/SettingWebScreen';
import { useUnreadNotificationCount, useReadAllNotifications } from '@/hook/useNotifications';
import { cn } from '@/lib/utils';
import { Button } from '@/components/shared/atoms/button';
import { Sheet, SheetContent } from '@/components/shared/atoms/web/sheet';
import { useAuthStore } from '@/store/authStore';

type WebNavItem = {
  activeIcon: React.ElementType;
  activePrefix?: string;
  href: string; // Keep href as string
  icon: React.ElementType; // Change to React.ElementType
  label: React.ReactNode;
};

type WebNavbarProps = {
  withHeader?: boolean;
};

export default function WebNavbar({ withHeader = true }: WebNavbarProps) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const [tradeHref, setTradeHref] = useState('/trade/XAUUSD');
  const [isNotificationSheetOpen, setNotificationSheetOpen] = useState(false);
  const [isSettingsSheetOpen, setSettingsSheetOpen] = useState(false);
  const unreadCountQuery = useUnreadNotificationCount();
  const readAllMutation = useReadAllNotifications();
  const { data: unreadCountData } = unreadCountQuery;
  const { showError } = useToast();
  const unreadCount = unreadCountQuery.data ?? 0;
  const navTop = withHeader ? 72 : 0;
  const me = useAuthStore((state) => state.user);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedSymbol = window.localStorage.getItem('lastTradeSymbol')?.trim();
    const symbol = savedSymbol || 'XAUUSD';

    setTimeout(() => {
      setTradeHref(`/trade/${encodeURIComponent(symbol)}`);
    }, 0);
  }, [pathname]);

  const navItems: WebNavItem[] = [
    {
      label: t('nav.market'),
      href: '/market',
      icon: BarChartSquare01,
      activeIcon: BarChartSquare01,
    },
    {
      label: t('nav.trade'),
      href: tradeHref,
      activePrefix: '/trade',
      icon: SwitchVertical01,
      activeIcon: SwitchVertical01,
    },
    {
      label: t('nav.positions'),
      href: '/position',
      icon: BarChart10,
      activeIcon: BarChart10,
    },
    {
      label: t('nav.discover'),
      href: '/discover',
      icon: Compass03,
      activeIcon: Compass03,
    },
    {
      label: t('nav.news'),
      href: '/news',
      icon: Announcement01,
      activeIcon: Announcement01,
    },
    {
      label: t('nav.account'),
      href: '/account',
      icon: User01,
      activeIcon: User01,
    },
    // {
    //   label: (
    //     <span className="text-center leading-tight whitespace-pre-line">
    //       {t('features.copyTrading', 'Copy\nTrading')}
    //     </span>
    //   ),
    //   href: '/copytrading',
    //   icon: UsersPlus,
    //   activeIcon: UsersPlus,
    // },
  ];

  return (
    <>
      <Sheet open={isNotificationSheetOpen} onOpenChange={setNotificationSheetOpen}>
        <SheetContent
          side="center"
          className="mx-auto h-auto w-auto max-w-none border-0 bg-transparent p-0 shadow-none"
          showCloseButton={false}
        >
          <NotificationWebScreen inSheet onClose={() => setNotificationSheetOpen(false)} />
        </SheetContent>
      </Sheet>

      <Sheet open={isSettingsSheetOpen} onOpenChange={setSettingsSheetOpen}>
        <SheetContent
          side="center"
          className="mx-auto h-auto w-auto max-w-none border-0 bg-transparent p-0 shadow-none"
          showCloseButton={false}
        >
          <SettingWebScreen inSheet onClose={() => setSettingsSheetOpen(false)} />
        </SheetContent>
      </Sheet>

      <nav
        className="pointer-events-none fixed left-0 z-20 w-[60px] transition-all duration-300 lg:w-[70px] 2xl:w-[80px]"
        style={{ top: navTop, height: `calc(100dvh - ${navTop}px)` }}
      >
        <div className="bg-background border-border pointer-events-auto h-full w-full rounded border-r">
          <div className="flex h-full flex-col items-center justify-between px-1 py-3 lg:px-1.5 lg:py-4 2xl:px-2 2xl:py-5">
            <div className="flex w-full flex-col items-center gap-1 2xl:gap-2">
              {navItems.map((item) => {
                const isActive = item.activePrefix
                  ? pathname.startsWith(item.activePrefix)
                  : pathname === item.href || pathname.startsWith(item.href);

                return (
                  <Button
                    key={item.href}
                    type="button"
                    variant="white-contained"
                    onClick={() => router.push(item.href)}
                    className={cn(
                      'text-body-small-medium flex w-full cursor-pointer flex-col items-center rounded-md !bg-transparent px-1 py-1 transition-colors hover:bg-neutral-100 2xl:py-2 dark:hover:bg-neutral-800/70',
                    )}
                  >
                    <div className="flex origin-center scale-[0.75] flex-col items-center gap-1 transition-transform duration-300 2xl:scale-100 2xl:gap-1.5">
                      <div className="relative h-6 w-6">
                        {isActive ? (
                          <item.activeIcon className="text-primary-500 hover:text-primary-600 size-6" />
                        ) : (
                          <item.icon className="text-muted-foreground hover:text-primary-500 size-6" />
                        )}
                      </div>
                      <span
                        className={
                          isActive
                            ? 'text-primary-500 text-body-small-semibold'
                            : 'text-muted-foreground text-body-small-medium'
                        }
                      >
                        {item.label}
                      </span>
                    </div>
                  </Button>
                );
              })}

              <div className="border-border w-full border-t pt-1 2xl:pt-2" />
              <Button
                type="button"
                variant="white-contained"
                onClick={() => {
                  const user = useAuthStore.getState().user;
                  if (user?.kycStatus !== 'APPROVED') {
                    showError(t('common.error'), t('kyc.required', 'KYC verification is required to deploy assets.'));
                    useKycStore.getState().open();
                    return;
                  }
                  useAssetDeploymentStore.getState().open();
                }}
                className={cn(
                  'text-body-small-medium flex w-full cursor-pointer flex-col items-center rounded-md !bg-transparent px-1 py-1 transition-colors hover:bg-neutral-100 2xl:py-2 dark:hover:bg-neutral-800/70',
                )}
              >
                <div className="flex origin-center scale-[0.75] flex-col items-center gap-1 transition-transform duration-300 2xl:scale-100 2xl:gap-1.5">
                  <div className="relative h-6 w-6">
                    <UploadCloud02 className="text-muted-foreground hover:text-primary-500 size-6" />
                  </div>
                  <span className="text-muted-foreground text-body-small-medium text-center leading-tight">
                    {t('nav.deploy', 'Deploy')}
                  </span>
                </div>
              </Button>
            </div>

            <div className="text-muted-foreground flex w-full flex-col items-center gap-1">
              {me ? (
                <Button
                  variant="white-contained"
                  aria-label={t('notifications.title', 'Notifications')}
                  className="rounded p-1 text-xl transition-colors hover:bg-neutral-100 2xl:p-2 dark:text-neutral-300 dark:hover:bg-neutral-800/70"
                  onClick={() => {
                    setNotificationSheetOpen(true);
                    readAllMutation.mutate();
                  }}
                >
                  <div className="relative origin-center scale-[0.8] transition-transform duration-300 2xl:scale-100">
                    {isNotificationSheetOpen ? (
                      <Bell01 className="text-primary-500 hover:text-primary-600 size-5" />
                    ) : (
                      <Bell01 className="text-muted-foreground hover:text-primary-500 size-5" />
                    )}
                    {unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] leading-none font-semibold text-white ring-2 ring-white dark:ring-neutral-900">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>
                </Button>
              ) : null}
              <Button
                variant="white-contained"
                aria-label={t('settings.title', 'Settings')}
                className="rounded p-1 text-xl transition-colors hover:bg-neutral-100 2xl:p-2 dark:text-neutral-300 dark:hover:bg-neutral-800/70"
                onClick={() => setSettingsSheetOpen(true)}
              >
                <div className="origin-center scale-[0.8] transition-transform duration-300 2xl:scale-100">
                  {isSettingsSheetOpen ? (
                    <Settings01 className="text-primary-500 hover:text-primary-600 size-5" />
                  ) : (
                    <Settings01 className="text-muted-foreground hover:text-primary-500 size-5" />
                  )}
                </div>
              </Button>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
