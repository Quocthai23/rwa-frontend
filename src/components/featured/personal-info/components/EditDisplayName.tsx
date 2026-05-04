'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Header from '@/components/shared/Header';
import { Button } from '@/components/shared/atoms/button';
import { Input } from '@/components/shared/atoms/input';
import { useToast } from '@/hook/useToast';
import { authApi } from '@/services/auth';
import { useAuthStore } from '@/store/authStore';
import { useGetData } from '@/context/GetdataContext';

export default function EditDisplayName() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const { showError, showInfo, showSuccess } = useToast();
  const { refetchMe } = useGetData();
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user?.displayName) {
      setDisplayNameInput(user.displayName.trim());
      return;
    }
    setDisplayNameInput('');
  }, [user?.displayName]);

  const handleSaveDisplayName = useCallback(async () => {
    const trimmedDisplayName = displayNameInput.trim();
    if (!trimmedDisplayName) {
      showError(
        t('personalInfoEditDisplayName.displayNameRequiredTitle', 'Display name is required'),
        t('personalInfoEditDisplayName.enterDisplayNameMessage', 'Please enter a display name.'),
      );
      return;
    }

    if (trimmedDisplayName === (user?.displayName?.trim() ?? '')) {
      showInfo(
        t('personalInfoEditNickname.noChangesTitle', 'No changes'),
        t(
          'personalInfoEditDisplayName.displayNameAlreadySameMessage',
          'Display name is already the same.',
        ),
      );
      router.back();
      return;
    }

    setIsSaving(true);
    try {
      await authApi.updateProfile({ displayName: trimmedDisplayName });
      updateUser({ displayName: trimmedDisplayName });
      await refetchMe();
      showSuccess(
        t('personalInfoEditDisplayName.displayNameUpdatedTitle', 'Display name updated'),
        t(
          'personalInfoEditDisplayName.displayNameUpdatedMessage',
          'Display name updated successfully.',
        ),
      );
      router.back();
    } catch (error) {
      showError(
        t('personalInfoEditDisplayName.displayNameUpdateFailedTitle', 'Display name update failed'),
        error instanceof Error
          ? error.message
          : t(
              'personalInfoEditDisplayName.displayNameUpdateFailedMessage',
              'Failed to update display name. Please try again.',
            ),
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    displayNameInput,
    router,
    showError,
    showInfo,
    showSuccess,
    t,
    updateUser,
    user?.displayName,
  ]);

  return (
    <div className="bg-background text-foreground flex h-dvh flex-col pb-2">
      <Header label={t('personalInfo.displayName', 'Display Name')} />

      <div className="flex-1 overflow-y-auto p-4">
        <Input
          value={displayNameInput}
          onChange={(event) => setDisplayNameInput(event.target.value)}
          className="h-12"
          placeholder={t(
            'personalInfoEditDisplayName.enterDisplayNamePlaceholder',
            'Enter display name',
          )}
        />
      </div>

      <div className="px-4 py-4 pb-[env(safe-area-inset-bottom)]">
        <Button
          onClick={handleSaveDisplayName}
          disabled={isSaving || !displayNameInput.trim()}
          className="bg-primary-500 text-body-large-semibold h-11 w-full rounded text-white"
        >
          {isSaving
            ? t('personalInfoEditDisplayName.saving', 'Saving...')
            : t('personalInfoEditDisplayName.save', 'Save')}
        </Button>
      </div>
    </div>
  );
}
