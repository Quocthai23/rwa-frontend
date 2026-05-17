'use client';
import { useAccountStore } from '@/store/useAccountStore';
import { useTheme } from '@/theme';
import type { Account } from '@/types/account';
import { formatBalance } from '@/utils/currency';
import { Bell01, ChevronDown, SearchLg, Settings02 } from '@untitledui/icons';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useToast } from '@/hook/useToast';
import { useTranslation } from 'react-i18next';
import { useUnreadNotificationCount } from '@/hook/useNotifications';
import { Button } from '@/components/shared/atoms/button';

export default function HomeHeader() {
  const { t } = useTranslation();
  const router = useRouter();
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const { showInfo } = useToast();
  const unreadCountQuery = useUnreadNotificationCount();
  const unreadCount = unreadCountQuery.data ?? 0;
  const selectedAccount = useAccountStore((state) => state.selectedAccount);
  const selectAccount = useAccountStore((state) => state.selectAccount);
  const accounts = useAccountStore((state) => state.accounts);
  const handleSelectAccount = (account: Account) => {
    selectAccount(account);
    setDropdownVisible(false);
  };
  const { colors } = useTheme();

  useEffect(() => {
    if (dropdownVisible) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [dropdownVisible]);

  return (
    <div className="relative z-50">
      <div className="bg-background relative z-50 flex h-16 flex-row items-center justify-between gap-4 p-4">
        <div className="flex flex-1 flex-row items-center gap-3">
          <Button
            type="button"
            variant="white-contained"
            className="flex flex-row items-center gap-2 bg-transparent p-0"
            onClick={() => setDropdownVisible(!dropdownVisible)}
          >
            <Image src="/logo/logo-home.png" height={36} width={36} alt="logo" />
            <span className="text-body-large-medium text-foreground">
              {selectedAccount?.name || t('home.accountFallback')}
            </span>
            <ChevronDown
              color={colors.textNeutralSecondary}
              className={`size-6 transition-transform duration-200 ${dropdownVisible ? 'rotate-180' : ''}`}
            />
          </Button>
        </div>

        <div className="flex flex-row items-center gap-5">
          <Button
            type="button"
            variant="white-contained"
            className="bg-transparent p-0"
            onClick={() => router.push('/settings')}
          >
            <Settings02 color={colors.textNeutralSecondary} className="size-6" />
          </Button>

          <Button
            type="button"
            variant="white-contained"
            className="relative bg-transparent p-0"
            onClick={() => {
              router.push('/notifications');
            }}
          >
            <Bell01 color={colors.textNeutralSecondary} className="size-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] leading-none font-semibold text-white ring-2 ring-white dark:ring-neutral-900">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Button>

          <Button
            type="button"
            variant="white-contained"
            className="bg-transparent p-0"
            onClick={() => {
              router.push('/search');
            }}
          >
            <SearchLg color={colors.textNeutralSecondary} className="size-6" />
          </Button>
        </div>
      </div>

      {dropdownVisible && (
        <>
          <div
            className="fixed inset-y-0 top-16 left-1/2 z-50 w-full max-w-3xl -translate-x-1/2 bg-black/50"
            onClick={() => setDropdownVisible(false)}
          />

          {/* Dropdown Menu */}
          <div className="bg-background absolute top-full right-0 left-0 z-50 flex flex-col gap-3 px-4 py-4 shadow-lg">
            {accounts?.map((account) => {
              const isSelected = selectedAccount?.id === account.id;

              return (
                <div
                  key={account.id}
                  className={`border-border flex cursor-pointer flex-row items-center justify-between border p-4 ${
                    isSelected
                      ? 'border-primary-500 bg-primary-100 dark:bg-primary-900/20 rounded-sm border'
                      : 'border-border rounded-sm border'
                  }`}
                  onClick={() => handleSelectAccount(account)}
                >
                  <span className="text-body-small-medium text-foreground">{account.name}</span>

                  <span className="text-body-small-regular text-secondary-500">
                    {t('home.equity')}:{' '}
                    {formatBalance(
                      (Number(account.availableBalance) + Number(account.lockedBalance)).toString(),
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
