'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from '@untitledui/icons';

import { authApi } from '@/services/auth';
import { useToast } from '@/hook/useToast';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/shared/atoms/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetTitle,
} from '@/components/shared/atoms/web/sheet';
import { useGetData } from '@/context/GetdataContext';

type GenderValue = 'MALE' | 'FEMALE' | 'OTHER';

interface EditGenderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditGender({ open, onOpenChange }: EditGenderProps) {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const { showError, showSuccess } = useToast();
  const { refetchMe } = useGetData();
  const [selectedGender, setSelectedGender] = useState<GenderValue>('OTHER');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const current = (user?.gender || 'OTHER').toUpperCase();
    if (current === 'MALE' || current === 'FEMALE' || current === 'OTHER') {
      setSelectedGender(current);
      return;
    }
    setSelectedGender('OTHER');
  }, [open, user?.gender]);

  const options = useMemo(
    () => [
      { value: 'MALE' as const, label: t('personalInfo.male', { defaultValue: 'Male' }) },
      { value: 'FEMALE' as const, label: t('personalInfo.female', { defaultValue: 'Female' }) },
      { value: 'OTHER' as const, label: t('personalInfo.other', { defaultValue: 'Other' }) },
    ],
    [t],
  );

  const handleSaveGender = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const username = user?.username?.trim() ?? '';
      await authApi.updateProfile({ username, gender: selectedGender });
      updateUser({ gender: selectedGender });
      await refetchMe();
      showSuccess(
        t('personalInfo.genderUpdatedTitle', { defaultValue: 'Gender updated' }),
        t('personalInfo.genderUpdatedMessage', { defaultValue: 'Your gender has been updated.' }),
      );
      onOpenChange(false);
    } catch (e) {
      showError(
        t('personalInfo.gender', { defaultValue: 'Gender' }),
        e instanceof Error
          ? e.message
          : t('personalInfo.genderUpdateFailedMessage', {
              defaultValue: 'Failed to update gender. Please try again.',
            }),
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    isSaving,
    selectedGender,
    user?.username,
    updateUser,
    showSuccess,
    t,
    onOpenChange,
    showError,
  ]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="center"
        className="bg-background border-border mx-auto flex w-full max-w-[420px] flex-col border p-4"
        showCloseButton={false}
      >
        <div className="border-foreground/10 flex items-center justify-between border-b pb-3">
          <SheetTitle>{t('personalInfo.gender', { defaultValue: 'Gender' })}</SheetTitle>
          <SheetClose className="text-muted-foreground hover:bg-muted rounded-xs p-0.5 transition-colors">
            <X size={22} strokeWidth={2} />
          </SheetClose>
        </div>

        <div className="space-y-2 py-2">
          {options.map((option) => {
            const active = option.value === selectedGender;
            return (
              <Button
                key={option.value}
                type="button"
                onClick={() => setSelectedGender(option.value)}
                variant={active ? 'primary-ghost' : 'white-contained'}
                className={`w-full rounded px-3 py-3 text-left transition-colors ${
                  active
                    ? '!text-primary-600 justify-start'
                    : 'text-foreground hover:bg-muted justify-start'
                }`}
              >
                {option.label}
              </Button>
            );
          })}
        </div>

        <SheetFooter className="gap-3 p-0 pt-2">
          <Button onClick={handleSaveGender} className="h-11 w-full" disabled={isSaving}>
            {isSaving
              ? t('personalInfoEditNickname.saving', { defaultValue: 'Saving...' })
              : t('personalInfoEditNickname.save', { defaultValue: 'Save' })}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
