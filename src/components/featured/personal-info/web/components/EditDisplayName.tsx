'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { X } from '@untitledui/icons';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/shared/atoms/button';
import { Input } from '@/components/shared/atoms/input';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetTitle,
} from '@/components/shared/atoms/web/sheet';
import { useToast } from '@/hook/useToast';
import { authApi } from '@/services/auth';
import { useAuthStore } from '@/store/authStore';
import { useGetData } from '@/context/GetdataContext';

interface EditDisplayNameProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditDisplayName({ open, onOpenChange }: EditDisplayNameProps) {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const { showError, showInfo, showSuccess } = useToast();
  const { refetchMe } = useGetData();
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDisplayNameInput(user?.displayName?.trim() ?? '');
  }, [open, user?.displayName]);

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
        t('personalInfoEditNickname.noChangesTitle'),
        t(
          'personalInfoEditDisplayName.displayNameAlreadySameMessage',
          'Display name is already the same.',
        ),
      );
      onOpenChange(false);
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
      onOpenChange(false);
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
  }, [displayNameInput, onOpenChange, showError, showInfo, showSuccess, t, updateUser, user]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="center"
        className="bg-background border-border mx-auto flex w-full max-w-[480px] flex-col border p-4"
        showCloseButton={false}
      >
        <div className="border-foreground/10 flex items-center justify-between border-b pb-3">
          <SheetTitle>{t('personalInfo.displayName', 'Display Name')}</SheetTitle>
          <SheetClose className="text-muted-foreground hover:bg-muted rounded-xs p-0.5 transition-colors">
            <X size={22} strokeWidth={2} />
          </SheetClose>
        </div>

        <div className="py-2">
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

        <SheetFooter className="gap-3 p-0 pt-2">
          <Button
            onClick={handleSaveDisplayName}
            disabled={isSaving || !displayNameInput.trim()}
            className="h-11 w-full"
          >
            {isSaving
              ? t('personalInfoEditDisplayName.saving', 'Saving...')
              : t('personalInfoEditDisplayName.save', 'Save')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
