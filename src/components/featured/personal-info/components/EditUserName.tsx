'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/shared/Header';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hook/useToast';
import { authApi } from '@/services/auth';
import { Input } from '@/components/shared/atoms/input';
import { Button } from '@/components/shared/atoms/button';
import { useTranslation } from 'react-i18next';
import { isValidUsername } from '@/lib/validators/username';
import { useGetData } from '@/context/GetdataContext';

export default function EditUserName() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const { showSuccess, showError, showInfo } = useToast();
  const { refetchMe } = useGetData();
  const [nicknameInput, setNicknameInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Initialize nicknameInput with current user's nickname when the page loads
    if (user?.username) {
      setNicknameInput(user.username.trim());
    }
  }, [user?.username]);

  const handleSaveNickname = useCallback(async () => {
    const trimmedNickname = nicknameInput.trim();
    if (!trimmedNickname) {
      showError(
        t('personalInfoEditUsername.usernameRequiredTitle', 'Username is required'),
        t('personalInfoEditUsername.enterUsernameMessage', 'Please enter a username.'),
      );
      return;
    }

    if (!isValidUsername(trimmedNickname)) {
      showError(
        t('personalInfoEditUsername.usernameInvalidTitle', 'Invalid username'),
        t(
          'personalInfoEditUsername.usernameInvalidMessage',
          'Username can only contain lowercase letters (a-z), numbers (0-9), and underscore (_).',
        ),
      );
      return;
    }

    if (trimmedNickname === user?.username?.trim()) {
      showInfo(
        t('personalInfoEditNickname.noChangesTitle'),
        t('personalInfoEditUsername.usernameAlreadySameMessage', 'Username is already the same.'),
      );
      router.back();
      return;
    }

    setIsSaving(true);
    try {
      await authApi.updateProfile({ username: trimmedNickname });
      updateUser({ username: trimmedNickname });
      await refetchMe();
      showSuccess(
        t('personalInfoEditUsername.usernameUpdatedTitle', 'Username updated'),
        t('personalInfoEditUsername.usernameUpdatedMessage', 'Username updated successfully.'),
      );
      router.back();
    } catch (e) {
      showError(
        t('personalInfoEditUsername.usernameUpdateFailedTitle', 'Username update failed'),
        e instanceof Error
          ? e.message
          : t(
              'personalInfoEditUsername.usernameUpdateFailedMessage',
              'Failed to update username. Please try again.',
            ),
      );
    } finally {
      setIsSaving(false);
    }
  }, [nicknameInput, user?.username, updateUser, showSuccess, showError, showInfo, router, t]);

  return (
    <div className="bg-background text-foreground flex h-dvh flex-col pb-2">
      <Header label={t('personalInfo.username', 'Username')} />

      <div className="flex-1 overflow-y-auto p-4">
        <Input
          value={nicknameInput}
          onChange={(e) => setNicknameInput(e.target.value)}
          className="h-12"
          placeholder={t('personalInfoEditUsername.enterUsernamePlaceholder', 'Enter username')}
        />
      </div>
      <div className="px-4 py-4 pb-[env(safe-area-inset-bottom)]">
        <Button
          onClick={handleSaveNickname}
          disabled={isSaving || !nicknameInput.trim()}
          className="bg-primary-500 text-body-large-semibold h-11 w-full rounded text-white"
        >
          {isSaving
            ? t('personalInfoEditUsername.saving', 'Saving...')
            : t('personalInfoEditUsername.save', 'Save')}
        </Button>
      </div>
    </div>
  );
}
