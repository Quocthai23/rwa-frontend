'use client';

import { AlertTriangle } from '@untitledui/icons';
import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import Header from '@/components/shared/Header';
import { Button } from '@/components/shared/atoms/button';
import { useToast } from '@/hook/useToast';
import { authApi } from '@/services/auth';
import { tokenStorage } from '@/services/tokenStorage';
import { useAuthStore } from '@/store/authStore';

const DELETE_CONSEQUENCES = [
  {
    key: 'assetLoss',
    title: 'Asset Loss',
    description: 'All remaining balances will be permanently lost and unrecoverable.',
  },
  {
    key: 'serviceTermination',
    title: 'Service Termination',
    description: 'All active trades, orders, and subscriptions will be cancelled immediately.',
  },
  {
    key: 'dataRemoval',
    title: 'Data Removal',
    description: 'Your personal info and history will be deleted (except as required by law).',
  },
  {
    key: 'forfeiture',
    title: 'Forfeiture',
    description: 'All unused vouchers, rewards, and points will be cleared.',
  },
] as const;

export default function DeleteAccount() {
  const { t } = useTranslation();
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const logout = useAuthStore((state) => state.logout);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = useCallback(async () => {
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      await authApi.deleteMe();
      tokenStorage.clearToken();
      logout();
      showSuccess(
        t('security.deleteAccount.successTitle', { defaultValue: 'Account deleted' }),
        t('security.deleteAccount.successMessage', {
          defaultValue: 'Your account has been deleted successfully.',
        }),
      );
      router.replace('/login');
    } catch {
      showError(
        t('security.deleteAccount.failedTitle', { defaultValue: 'Delete account failed' }),
        t('security.deleteAccount.failedMessage', {
          defaultValue: 'Failed to delete account. Please try again.',
        }),
      );
    } finally {
      setIsDeleting(false);
    }
  }, [isDeleting, logout, router, showError, showSuccess, t]);

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <Header label={t('security.deleteAccount.title', { defaultValue: 'Delete account' })} />

      <div className="flex flex-1 flex-col px-5 pb-6">
        <div className="mt-10 mb-6 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
            <AlertTriangle className="text-red-500" size={28} />
          </div>
        </div>

        <h1 className="text-h3-semibold text-foreground mb-6 text-center">
          {t('security.deleteAccount.confirmTitle', { defaultValue: 'Delete your account?' })}
        </h1>

        <p className="text-body-large-regular text-foreground mb-4 self-stretch">
          {t('security.deleteAccount.description', {
            defaultValue:
              'If you no longer wish to use this account, you can request to permanently delete it. Please note that this action is irreversible.',
          })}
        </p>

        <p className="text-body-large-regular text-foreground mb-3">
          {t('security.deleteAccount.consequencesIntro', {
            defaultValue: 'Deleting will result in the following:',
          })}
        </p>

        <ul className="mb-4 ml-5 list-disc space-y-2">
          {DELETE_CONSEQUENCES.map((item) => (
            <li key={item.key} className="text-body-large-regular text-foreground">
              <span className="text-body-large-semibold text-foreground">
                {t(`security.deleteAccount.consequences.${item.key}.title`, {
                  defaultValue: item.title,
                })}
                :
              </span>{' '}
              <span>
                {t(`security.deleteAccount.consequences.${item.key}.description`, {
                  defaultValue: item.description,
                })}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex-1" />

        <div className="mb-6">
          <Button
            type="button"
            variant="red-contained"
            disabled={isDeleting}
            onClick={handleDeleteAccount}
            className="text-button-large-medium w-full self-stretch rounded px-4 py-3 font-medium"
          >
            {isDeleting
              ? t('security.deleteAccount.deleting', { defaultValue: 'Deleting...' })
              : t('security.deleteAccount.deleteButton', { defaultValue: 'Delete account' })}
          </Button>
        </div>

        <div
          aria-hidden
          className="bg-foreground mx-auto h-[5px] w-[134px] shrink-0 rounded-full"
        />
      </div>
    </div>
  );
}

