import { ACCOUNT_TYPES_ID } from '@/constants/account';
import { FEATURES_CONFIG, FeatureId } from '@/constants/featuresConfig';
import { useAuthStore } from '@/store/authStore';
import { useAccountStore } from '@/store/useAccountStore';
import { useAppStore } from '@/store/useAppStore';
import DepositFlowSheet from '@/components/featured/deposit/DepositFlowSheet';
import WithdrawMethod from '@/components/featured/withdraw/components/WithdrawMethod';
import { useRouter } from 'next/navigation';

import { Sheet, SheetContent } from '@/components/shared/atoms/sheet';
import { useState } from 'react';
import { useToast } from '@/hook/useToast';
import { useTheme } from '@/theme';
import { useTranslation } from 'react-i18next';

const ICON_SIZE = 24;

export function HomeFeatures() {
  const { t } = useTranslation();
  const selectedAccount = useAccountStore((state) => state.selectedAccount);
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const { colors } = useTheme();
  const [isDepositSheetOpen, setIsDepositSheetOpen] = useState(false);
  const [isWithdrawSheetOpen, setIsWithdrawSheetOpen] = useState(false);
  const { showError, showInfo } = useToast();

  const handleShowDepositMethod = () => {
    setIsDepositSheetOpen(true);
  };

  const handleShowWithdrawMethod = () => {
    setIsWithdrawSheetOpen(true);
  };

  // Get quick access keys from store, and always append the 'More' button at the end
  const quickAccessKeys = useAppStore((state) => state.quickAccessKeys);
  const homeFeatures = [...quickAccessKeys, FeatureId.More]
    .map((id) => FEATURES_CONFIG.find((f) => f.id === id))
    .filter((feature): feature is (typeof FEATURES_CONFIG)[0] => feature !== undefined);

  const handleFeaturePress = (featureId: FeatureId) => {
    if (featureId === FeatureId.Ranking) {
      router.push('/ranking');
      return;
    }

    if (featureId === FeatureId.Deposit) {
      if (!user) {
        router.push('/login');

        return;
      }
      if (selectedAccount?.accountTypeId === ACCOUNT_TYPES_ID.DEMO) {
        router.push('/top-up');
        return;
      }
      handleShowDepositMethod();

      return;
    }
    if (featureId === FeatureId.Withdraw) {
      if (!user) {
        router.push('/login');

        return;
      }
      if (selectedAccount?.accountTypeId === ACCOUNT_TYPES_ID.DEMO) {
        showError(t('home.withdrawFailedTitle'), t('home.withdrawDemoError'));
        return;
      }
      handleShowWithdrawMethod();

      return;
    }


    if (featureId === FeatureId.Social) {
      router.push('/discover?discoverTab=for-you');
      return;
    }

    if (featureId === FeatureId.Copy) {
      showInfo(t('home.comingSoonTitle'), t('home.comingSoonMessage'));
      return;
    }
    if (featureId === FeatureId.Chat) {
      showInfo(t('home.comingSoonTitle'), t('home.comingSoonMessage'));
      return;
    }
    if (featureId === FeatureId.HelpCenter) {
      showInfo(t('home.comingSoonTitle'), t('home.comingSoonMessage'));
      return;
    }

    if (featureId === FeatureId.More) {
      if (!user) {
        router.push('/login');
        return;
      }
      router.push('/more');
    }
    if (featureId === FeatureId.History) {
      if (!user) {
        router.push('/login');
        return;
      }
      router.push('/transaction-history');
    }
    if (featureId === FeatureId.Transfer) {
      if (!user) {
        router.push('/login');
        return;
      }
      if (selectedAccount?.accountTypeId === ACCOUNT_TYPES_ID.DEMO) {
        showError(t('home.transferFailedTitle'), t('home.transferDemoError'));
        return;
      }
      router.push('/transfer');
    }

    if (featureId === FeatureId.Feedback) {
      if (!user) {
        router.push('/login');
        return;
      }
      router.push('/settings/feedback');
    }
  };

  return (
    <div className="bg-background w-full p-4">
      <DepositFlowSheet isOpen={isDepositSheetOpen} onOpenChange={setIsDepositSheetOpen} />
      <Sheet open={isWithdrawSheetOpen} onOpenChange={setIsWithdrawSheetOpen}>
        <SheetContent
          side="bottom"
          className="bg-background h-[93%] overflow-y-auto"
          showCloseButton={false}
        >
          <div className="bg-muted mx-auto mt-2 h-1 w-11 rounded" />

          <WithdrawMethod onClose={() => setIsWithdrawSheetOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="flex flex-wrap">
        {homeFeatures.map((feature) => {
          const IconComponent = feature.icon;
          return (
            <div key={feature.id} className="mb-4 flex w-1/4 justify-center">
              <button
                onClick={() => handleFeaturePress(feature.id)}
                className="flex flex-col items-center"
              >
                <div className="bg-muted mb-2 flex h-12 w-12 items-center justify-center rounded-full">
                  <IconComponent size={ICON_SIZE} color={colors.textNeutralSecondary} />
                </div>

                <p className="text-body-small-medium text-foreground w-full text-center">
                  {feature.labelKey
                    ? t(feature.labelKey)
                    : feature.label}
                </p>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
