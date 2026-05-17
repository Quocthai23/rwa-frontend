'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { HIDDEN_NAVBAR_ROUTES } from '@/constants/navigation';
import { cn } from '@/lib/utils';
import { useAccountStore } from '@/store/useAccountStore';
import { useInfiniteOrders } from '@/hook/useOrder';
import { OrderStatus } from '@/types/orders';

const VALID_NAVBAR_ROUTES = [
  '/home',
  '/market',
  '/trade',
  '/position',
  '/discover',
  '/settings/accounts',
  '/chat',
  '/copytrading',
  '/more',
  '/notifications',
  '/personal-info',
  '/ranking',
  '/search',
  '/social',
  '/transfer',
  '/withdraw',
  '/profile',
];

export default function AppNavbar() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [tradeHref, setTradeHref] = useState('/trade/XAUUSD');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedSymbol = window.localStorage.getItem('lastTradeSymbol')?.trim();
    const symbol = savedSymbol || 'XAUUSD';

    setTimeout(() => {
      setTradeHref(`/trade/${encodeURIComponent(symbol)}`);
    }, 0);
  }, [pathname]);

  const selectedAccount = useAccountStore((state) => state.selectedAccount);
  const { data: openOrdersData } = useInfiniteOrders({
    accountId: selectedAccount?.id || '',
    status: [OrderStatus.OPEN, OrderStatus.PARTIALLY_FILLED],
  });
  const openOrdersCount = openOrdersData?.pages?.[0]?.total ?? openOrdersData?.pages?.[0]?.data?.length ?? 0;

  const navItems = [
    {
      label: t('nav.home'),
      href: '/home',
      icon: '/assets/images/nav01/Union.svg',
      activeIcon: '/assets/images/nav01/home-active.svg',
    },
    {
      label: t('nav.market'),
      href: '/market',
      icon: '/assets/images/nav01/bar-chart-square-01.svg',
      activeIcon: '/assets/images/nav01/market-active.svg ',
    },
    {
      label: t('nav.trade'),
      href: tradeHref,
      activePrefix: '/trade',
      icon: '/assets/images/nav01/filled01.svg',
      activeIcon: '/assets/images/nav01/trade-active.svg',
    },
    {
      label: t('nav.portfolio'),
      href: '/position',
      icon: '/assets/images/nav01/bar-chart-10.svg',
      activeIcon: '/assets/images/nav01/position-active.svg',
    },
    {
      label: t('nav.discover'),
      href: '/discover',
      icon: '/assets/images/nav01/light.svg',
      activeIcon: '/assets/images/nav01/discover-active.svg',
    },
  ];

  const shouldHideNavbar =
    HIDDEN_NAVBAR_ROUTES.some((route) => pathname.startsWith(route)) ||
    !(pathname === '/' || VALID_NAVBAR_ROUTES.some((route) => pathname.startsWith(route)));

  if (shouldHideNavbar) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full -translate-x-1/2 bg-white pb-[2px] shadow-[0_-2px_8px_neutral-100]">
      <div className="bg-background dark:bg-neutral-1000 mx-auto flex h-16 w-full items-center justify-around px-2">
        {navItems.map((item) => {
          const activePrefix = (item as { activePrefix?: string }).activePrefix;
          const isActive = activePrefix
            ? pathname.startsWith(activePrefix)
            : pathname === item.href || pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className={cn(
                'relative flex flex-1 flex-col items-center justify-center gap-1 rounded-lg py-2 transition-all duration-200',
                isActive ? 'text-primary-500' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <div className="relative h-6 w-6">
                <Image
                  src={isActive ? item.activeIcon : item.icon}
                  alt={item.label}
                  fill
                  className="object-contain"
                  sizes="24px"
                  unoptimized
                  priority
                />
                {item.href === '/position' && (
                  <div className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {openOrdersCount > 9 ? '9+' : openOrdersCount}
                  </div>
                )}
              </div>
              <span
                className={
                  isActive ? 'text-caption-semibold text-xs' : 'text-caption-medium text-xs'
                }
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
