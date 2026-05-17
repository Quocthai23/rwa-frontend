'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/shared/atoms/button';
import { ACCOUNT_TYPES_ID } from '@/constants/account';
import { localizeApiError } from '@/i18n/apiErrors';
import { useAccounts } from '@/hook/useAccount';
import { useAccountBalance } from '@/hook/useAccountBalance';
import { useDepositDemo } from '@/hook/payment/useDepositDemo';
import { useToast } from '@/hook/useToast';
import { useAccountStore } from '@/store/useAccountStore';
import { useTheme } from '@/theme';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

type TopUpActionContentProps = {
  onCompleted?: () => void;
  onNonDemo?: () => void;
};

export default function TopUpActionContent({
  onCompleted,
  onNonDemo,
}: TopUpActionContentProps = {}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { mode } = useTheme();
  const selectedAccount = useAccountStore((s) => s.selectedAccount);
  const [isLoading, setIsLoading] = useState(false);
  const [topupAnimationData, setTopupAnimationData] = useState<unknown>(null);
  const [topupAnimationDarkData, setTopupAnimationDarkData] = useState<unknown>(null);
  const { mutate: depositDemo } = useDepositDemo();
  const { showError, showSuccess } = useToast();
  const { refetch: refetchAccounts } = useAccounts();
  const { refetch: refetchAccountBalance } = useAccountBalance(selectedAccount?.id || '');

  useEffect(() => {
    fetch('/assets/animations/topup.json')
      .then((response) => response.json())
      .then((data) => setTopupAnimationData(data))
      .catch(() => setTopupAnimationData(null));
  }, []);

  useEffect(() => {
    fetch('/assets/animations/topup-darkmode.json')
      .then((response) => response.json())
      .then((data) => setTopupAnimationDarkData(data))
      .catch(() => setTopupAnimationDarkData(null));
  }, []);

  const isDemoAccount = selectedAccount?.accountTypeId === ACCOUNT_TYPES_ID.DEMO;
  const topupAnimationForTheme =
    mode === 'dark'
      ? topupAnimationDarkData || topupAnimationData
      : topupAnimationData || topupAnimationDarkData;

  const handleTopUp = () => {
    if (!isDemoAccount) {
      if (onNonDemo) {
        onNonDemo();
        return;
      }
      router.back();
      return;
    }

    setIsLoading(true);
    depositDemo(
      {
        amount: '500',
        idempotencyKey: undefined,
      },
      {
        onError: (error: unknown) => {
          setIsLoading(false);
          const message = localizeApiError(error, t, 'topUp.topUpFailedMessage');
          showError(t('topUp.topUpFailedTitle'), message || t('topUp.topUpFailedMessage'));
        },
        onSuccess: () => {
          setIsLoading(false);
          showSuccess(t('topUp.topUpSuccessTitle'), t('topUp.topUpSuccessMessage'));
          refetchAccounts();
          refetchAccountBalance();
          if (onCompleted) {
            onCompleted();
            return;
          }
          router.push('/position');
        },
      },
    );
  };

  return (
    <>
      <div className="flex flex-1 flex-col justify-center">
        <div className="flex flex-col items-center py-4">
          <div className="flex h-50 w-50 items-center justify-center">
            {topupAnimationForTheme ? (
              <Lottie animationData={topupAnimationForTheme} loop className="h-50 w-50" />
            ) : (
              <div className="bg-muted h-50 w-50 animate-pulse rounded" />
            )}
          </div>
          <div className="flex flex-col items-center gap-3">
            <p className="text-h3-semibold text-foreground text-center">
              {t('topUp.pageDescription')}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-5 flex flex-col gap-3">
        <Button
          type="button"
          className={`text-button-large-medium py-3 text-white ${
            isLoading ? 'bg-muted' : 'bg-primary-500'
          }`}
          disabled={isLoading}
          onClick={handleTopUp}
        >
          {t('topUp.topUpNow')}
        </Button>
      </div>
    </>
  );
}
