'use client';

import { Button } from '@/components/shared/atoms/button';
import { ChevronDown } from '@untitledui/icons';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../../../store/authStore';
import { useAccountStore } from '../../../../store/useAccountStore';
import { formatBalance } from '../../../../utils/currency';
import { useAccountSummaryMetrics } from '@/hook/useAccountSummaryMetrics';

function AccountDropdown() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const router = useRouter();
  const { selectedAccount } = useAccountStore();
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const { availableBalance, balance, currentUnrealizedPnl, equity, marginLevel, marginPositions } =
    useAccountSummaryMetrics();

  useEffect(() => {
    if (!showAccountDropdown) return;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [showAccountDropdown]);

  return (
    <>
      <div className="relative">
        <div className="flex h-16 items-center justify-between p-4">
          <div>
            <h2 className="text-h2-semibold text-foreground">{t('market.title')}</h2>
          </div>

          {user ? (
            <Button
              variant="white-contained"
              className="relative flex items-center gap-2"
              onClick={() => setShowAccountDropdown((v) => !v)}
            >
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1">
                  <span className="text-body-small-semibold text-foreground">
                    ${formatBalance(balance.toNumber())}
                  </span>
                  <ChevronDown
                    size={20}
                    className={`transition-transform duration-200 ${showAccountDropdown ? 'rotate-180' : 'rotate-0'}`}
                  />
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-caption-regular text-foreground">
                    {t('market.accountDropdown.available')}
                  </span>
                  <span className="text-caption-medium bg-primary-50 text-primary-500 rounded px-2 py-1 text-center">
                    {selectedAccount?.accountTypeId.includes('demo')
                      ? t('market.accountDropdown.demo')
                      : t('market.accountDropdown.live')}
                  </span>
                </div>
              </div>
            </Button>
          ) : (
            <div>
              <Button
                className="bg-primary-500 dark:bg-primary-500 px-4 py-1 text-white"
                onClick={() => router.push('/login')}
              >
                {t('auth.login.title')}
              </Button>
            </div>
          )}
        </div>

        {showAccountDropdown && (
          <>
            <div
              className="fixed inset-y-0 top-16 left-1/2 z-50 w-full max-w-3xl -translate-x-1/2 bg-black/50"
              onClick={() => setShowAccountDropdown(false)}
            />
            <div className="bg-background absolute top-full right-0 left-0 z-50 shadow-lg">
              <div className="px-4">
                <div>
                  <div className="-mx-2 flex flex-wrap">
                    <ItemDropdown
                      label={t('market.accountDropdown.equity')}
                      value={`${formatBalance(equity.toNumber())}`}
                    />
                    <ItemDropdown
                      color={currentUnrealizedPnl.gte(0) ? 'text-green-500' : 'text-red-500'}
                      label={t('market.accountDropdown.profitLoss')}
                      value={`${currentUnrealizedPnl.gte(0) ? '+' : ''}${currentUnrealizedPnl.toFixed(2)}`}
                    />
                    <ItemDropdown
                      label={t('market.accountDropdown.balance')}
                      value={`${formatBalance(balance.toNumber())}`}
                      borderColor="border-primary-500"
                      textColor="text-primary-500"
                      bgColor="bg-primary-50"
                    />
                    <ItemDropdown
                      label={t('market.accountDropdown.available')}
                      value={`${formatBalance(availableBalance.toNumber())}`}
                    />
                    <ItemDropdown
                      label={t('market.accountDropdown.margin')}
                      value={`${formatBalance(marginPositions.toNumber())}`}
                    />
                    <ItemDropdown
                      label={t('market.accountDropdown.marginLevel')}
                      color={currentUnrealizedPnl.gte(0) ? 'text-green-500' : 'text-red-500'}
                      value={`${formatBalance(marginLevel.toNumber())}%`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default AccountDropdown;

function ItemDropdown({
  color,
  label,
  value,
  borderColor,
  textColor,
  bgColor,
}: {
  readonly color?: string;
  readonly label: string;
  readonly value: string;
  readonly borderColor?: string;
  readonly textColor?: string;
  readonly bgColor?: string;
}) {
  return (
    <div className="w-1/2 justify-between rounded p-2">
      <div
        className={`justify-between border border-neutral-200 p-3 ${borderColor ?? 'border-border'} ${bgColor ?? ''} w-full rounded dark:border-neutral-800`}
      >
        <p className={`text-body-small-medium text-muted-foreground`}>{label}</p>
        <p className={`text-body-medium ${color ?? textColor ?? 'text-foreground'}`}>{value}</p>
      </div>
    </div>
  );
}
