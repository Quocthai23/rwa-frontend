'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hook/useToast';
import { authApi } from '@/services/auth';
import { Input } from '@/components/shared/atoms/input';
import { Button } from '@/components/shared/atoms/button';
import { useTranslation } from 'react-i18next';
import { X } from '@untitledui/icons';
import { isValidUsername } from '@/lib/validators/username';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetTitle,
} from '@/components/shared/atoms/web/sheet';
import { useGetData } from '@/context/GetdataContext';

interface EditUserNameProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditUserName({ open, onOpenChange }: EditUserNameProps) {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const { showSuccess, showError, showInfo } = useToast();
  const { refetchMe } = useGetData();

  const [nicknameInput, setNicknameInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNicknameInput(user?.username?.trim() ?? '');
  }, [open, user?.username]);

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
      onOpenChange(false);
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
      onOpenChange(false);
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
  }, [
    nicknameInput,
    user?.username,
    updateUser,
    showSuccess,
    showError,
    showInfo,
    onOpenChange,
    t,
  ]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="center"
        className="bg-background border-border mx-auto flex w-full max-w-[480px] flex-col border p-4"
        showCloseButton={false}
      >
        <div className="border-foreground/10 flex items-center justify-between border-b pb-3">
          <SheetTitle>{t('personalInfo.username', 'Username')}</SheetTitle>
          <SheetClose className="text-muted-foreground hover:bg-muted rounded-xs p-0.5 transition-colors">
            <X size={22} strokeWidth={2} />
          </SheetClose>
        </div>

        <div className="py-2">
          <Input
            value={nicknameInput}
            onChange={(e) => setNicknameInput(e.target.value)}
            className="h-12"
            placeholder={t('personalInfoEditUsername.enterUsernamePlaceholder', 'Enter username')}
          />
        </div>

        <SheetFooter className="gap-3 p-0 pt-2">
          <Button
            onClick={handleSaveNickname}
            disabled={isSaving || !nicknameInput.trim()}
            className="h-11 w-full"
          >
            {isSaving
              ? t('personalInfoEditUsername.saving', 'Saving...')
              : t('personalInfoEditUsername.save', 'Save')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
