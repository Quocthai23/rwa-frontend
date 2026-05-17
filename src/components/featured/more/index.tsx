'use client';

import { MinusCircle, PlusCircle, RefreshCcw01 } from '@untitledui/icons';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FEATURES_CONFIG, FEATURE_SECTIONS, FeatureId } from '@/constants/featuresConfig';
import { useAccountStore } from '@/store/useAccountStore';
import { useAppStore } from '@/store/useAppStore';
import { useTheme } from '@/theme';
import Header from '@/components/shared/Header';
import DepositFlowSheet from '@/components/featured/deposit/DepositFlowSheet';
import WithdrawMethod from '@/components/featured/withdraw/components/WithdrawMethod';
import { Sheet, SheetContent } from '@/components/shared/atoms/sheet';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hook/useToast';
import { ACCOUNT_TYPES_ID } from '@/constants/account';
import { useTranslation } from 'react-i18next';

export default function More() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  // const { showModal, closeModal } = useGlobalModal();
  const user = useAuthStore((state) => state.user);
  const { showError, showInfo } = useToast();
  const selectedAccount = useAccountStore((state) => state.selectedAccount);
  const [isEditMode, setIsEditMode] = useState(false);

  const storeQuickAccessKeys = useAppStore((state) => state.quickAccessKeys);
  const setQuickAccessKeys = useAppStore((state) => state.setQuickAccessKeys);

  const [quickAccessKeys, setLocalQuickAccessKeys] = useState(storeQuickAccessKeys);
  const [isDepositSheetOpen, setIsDepositSheetOpen] = useState(false);
  const [isWithdrawSheetOpen, setIsWithdrawSheetOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const restoreTimeoutRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (restoreTimeoutRef.current) {
        window.clearTimeout(restoreTimeoutRef.current);
      }
    };
  }, []);

  const defaultQuickAccessKeys = [
    FeatureId.Deposit,
    FeatureId.Withdraw,
    FeatureId.Transfer,
    FeatureId.History,
    FeatureId.Copy,
  ];

  const handleShowDepositMethod = () => {
    setIsDepositSheetOpen(true);
  };

  const handleShowWithdrawMethod = () => {
    setIsWithdrawSheetOpen(true);
  };

  const handleFeaturePress = useCallback(
    (featureId: FeatureId, path: string) => {
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
      
      if (FeatureId.Social === featureId) {
        router.push('/discover?discoverTab=for-you');
        return;
      }

      if (
        featureId === FeatureId.Copy ||
        featureId === FeatureId.Chat ||
        featureId === FeatureId.HelpCenter
      ) {
        showInfo(t('common.comingSoonTitle'), t('common.comingSoonMessage'));
        return;
      }

      if (
        !user &&
        [FeatureId.History, FeatureId.Transfer, FeatureId.Feedback].includes(
          featureId,
        )
      ) {
        router.push('/login');
        return;
      }

      router.push(path);
    },
    [router, selectedAccount?.accountTypeId, showError, showInfo, t, user],
  );

  // Build sections dynamically from shared config
  const sections = useMemo(() => {
    return FEATURE_SECTIONS.map((section) => ({
      title: section.titleKey ? t(section.titleKey) : section.title,
      items: section.featureIds
        .map((featureId) => {
          const feature = FEATURES_CONFIG.find((f) => f.id === featureId);
          if (!feature || feature.id === FeatureId.Chat) return null;

          return {
            key: feature.id,
            name: feature.labelKey ? t(feature.labelKey) : feature.label,
            icon: feature.icon, // Store component class
            onPress: () => handleFeaturePress(feature.id, feature.path),
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null),
    }));
  }, [handleFeaturePress, t]);

  const allItems = useMemo(() => {
    return sections.flatMap((section) => section.items);
  }, [sections]);

  const quickAccessItems = useMemo(() => {
    return quickAccessKeys
      .map((key) => allItems.find((item) => item && item.key === key))
      .filter((item): item is NonNullable<typeof item> => item !== null && item !== undefined);
  }, [quickAccessKeys, allItems]);

  const handleToggleEditMode = () => {
    if (isEditMode) {
      setQuickAccessKeys(quickAccessKeys);
    } else {
      setLocalQuickAccessKeys(storeQuickAccessKeys);
    }
    setIsEditMode(!isEditMode);
  };

  const handleAddToQuickAccess = (key: string) => {
    if (!quickAccessKeys.includes(key) && quickAccessKeys.length < 7) {
      setLocalQuickAccessKeys([...quickAccessKeys, key]);
    }
  };

  const handleRemoveFromQuickAccess = (key: string) => {
    setLocalQuickAccessKeys(quickAccessKeys.filter((k) => k !== key));
  };

  const handleRestoreDefault = () => {
    if (restoreTimeoutRef.current) {
      window.clearTimeout(restoreTimeoutRef.current);
    }
    setIsRestoring(true);
    setLocalQuickAccessKeys(defaultQuickAccessKeys);
    restoreTimeoutRef.current = window.setTimeout(() => {
      setIsRestoring(false);
      restoreTimeoutRef.current = null;
    }, 500);
  };

  return (
    <div className="bg-background flex h-full flex-col">
      {/* Header */}
      <Header
        label={t('more.title')}
        onBack={() => {
          if (isEditMode) {
            setIsEditMode(false);
            return;
          }
          router.back();
        }}
      />

      <DepositFlowSheet isOpen={isDepositSheetOpen} onOpenChange={setIsDepositSheetOpen} />
      <Sheet open={isWithdrawSheetOpen} onOpenChange={setIsWithdrawSheetOpen}>
        <SheetContent
          side="bottom"
          className="bg-card mx-auto h-[93%] w-full max-w-3xl overflow-y-auto"
          showCloseButton={false}
        >
          <div className="bg-muted mx-auto mt-2 h-1 w-11 rounded" />
          <WithdrawMethod onClose={() => setIsWithdrawSheetOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-6">
          <div className="mb-4 flex flex-row items-center justify-between">
            <span className="text-body-large-semibold text-foreground">
              {t('more.quickAccess')}
            </span>
            {isEditMode && (
              <button
                className="bg-primary-500 dark:bg-primary-500 rounded px-3 py-1.5"
                onClick={handleToggleEditMode}
              >
                <span className="text-body-small-semibold text-white">{t('more.done')}</span>
              </button>
            )}
          </div>

          {isEditMode ? (
            <div className="border-border bg-background rounded border p-4">
              <div className="flex flex-row flex-wrap">
                {quickAccessItems.map((item) => (
                  <div key={item.key} className="mb-4 flex w-1/4 flex-col items-center">
                    <div className="relative">
                      <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
                        <item.icon size={24} color={colors.textNeutralPrimary} />
                      </div>
                      <button
                        className="absolute -top-1 -right-1"
                        onClick={() => handleRemoveFromQuickAccess(item.key)}
                      >
                        <MinusCircle color={colors.neutral400} size={20} fill="white" />
                      </button>
                    </div>
                    <span
                      className="text-body-small-regular text-foreground mt-2 line-clamp-2 w-full text-center wrap-break-word whitespace-normal"
                      style={{
                        WebkitLineClamp: 2,
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
              <button
                className="mt-2 flex w-full flex-row items-center justify-center"
                onClick={handleRestoreDefault}
                disabled={isRestoring}
              >
                <RefreshCcw01
                  color={colors.primary500}
                  size={16}
                  className={isRestoring ? 'animate-spin' : undefined}
                />
                <span className="text-body-small-semibold text-primary-500 ml-1.5">
                  {t('more.restoreDefault')}
                </span>
              </button>
            </div>
          ) : (
            <div className="border-border bg-card flex flex-row items-center justify-between gap-2 rounded-xl border p-2">
              <div className="flex min-w-0 flex-1 flex-row items-center overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex w-full items-center gap-3 -space-x-2.5 sm:gap-4 md:gap-5 lg:gap-6">
                  {quickAccessItems.map((item, index) => (
                    <div
                      key={item.key}
                      onClick={item.onPress}
                      className="border-border bg-muted relative shrink-0 cursor-pointer rounded-full border p-2.5"
                      style={{ zIndex: quickAccessItems.length - index }}
                    >
                      <div className="text-foreground flex h-6 w-6 items-center justify-center">
                        <item.icon size={16} color={colors.textNeutralPrimary} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <button
                className="bg-primary-500 shrink-0 cursor-pointer rounded px-5 py-2"
                onClick={handleToggleEditMode}
              >
                <span className="text-body-small-semibold text-white">{t('more.edit')}</span>
              </button>
            </div>
          )}
        </div>

        {sections.map((section) => (
          <div key={section.title} className="mb-6">
            <span className="text-body-large-semibold text-foreground mb-4 block">
              {section.title}
            </span>
            <div className="flex flex-row flex-wrap">
              {section.items.map((item) => {
                const isInQuickAccess = quickAccessKeys.includes(item.key);

                return (
                  <button
                    key={item.key}
                    className="relative mb-6 flex w-1/4 flex-col items-center"
                    onClick={() => !isEditMode && item.onPress()}
                  >
                    <div className="relative">
                      <div
                        className="bg-muted flex h-12 w-12 items-center justify-center rounded-full"
                        style={{
                          opacity: isEditMode && isInQuickAccess ? 0.4 : 1,
                        }}
                      >
                        <item.icon size={24} color={colors.textNeutralPrimary} />
                      </div>
                      {isEditMode && (
                        <div
                          className="absolute -top-1 -right-1 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isInQuickAccess) {
                              handleRemoveFromQuickAccess(item.key);
                            } else {
                              handleAddToQuickAccess(item.key);
                            }
                          }}
                        >
                          {isInQuickAccess ? (
                            <MinusCircle color={colors.neutral400} size={20} fill="white" />
                          ) : (
                            <PlusCircle color={colors.neutral400} size={20} fill="white" />
                          )}
                        </div>
                      )}
                    </div>
                    <span
                      className="text-body-small-medium text-foreground mt-2 line-clamp-2 w-full text-center wrap-break-word whitespace-normal"
                      style={{
                        opacity: isEditMode && isInQuickAccess ? 0.4 : 1,
                        WebkitLineClamp: 2,
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {item.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
