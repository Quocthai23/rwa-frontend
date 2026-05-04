'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hook/useToast';
import { authApi } from '@/services/auth';
import { Input } from '@/components/shared/atoms/input';
import { Button } from '@/components/shared/atoms/button';
import { useTranslation } from 'react-i18next';
import { localizeApiError } from '@/i18n/apiErrors';
import { X } from '@untitledui/icons';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetTitle,
} from '@/components/shared/atoms/web/sheet';
import { useGetData } from '@/context/GetdataContext';

interface EditReferrerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditReferrer({ open, onOpenChange }: EditReferrerProps) {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const { refetchMe } = useGetData();
  const { showError } = useToast();
  const [referrerInput, setReferrerInput] = useState<string | undefined>(undefined);

  const existingReferrer = useMemo(
    () => (user?.referenceId ? `UID: ${user.referenceId}` : ''),
    [user],
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveReferrer = useCallback(async () => {
    setIsSaving(true);
    try {
      await authApi.updateReferral({ referenceCode: referrerInput ?? '' });
      const latestUser = await authApi.getMe();
      updateUser(latestUser);
      await refetchMe();
      onOpenChange(false);
    } catch (e) {
      showError(
        t('personalInfo.referrerTitle', { defaultValue: 'Referrer' }),
        localizeApiError(e, t),
      );
    } finally {
      setIsSaving(false);
    }
  }, [referrerInput, showError, t, updateUser, onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="center"
        className="bg-background border-border mx-auto flex w-full max-w-[520px] flex-col border p-4"
        showCloseButton={false}
      >
        <div className="border-foreground/10 flex items-center justify-between border-b pb-3">
          <SheetTitle>{t('personalInfo.referrerTitle', { defaultValue: 'Referrer' })}</SheetTitle>
          <SheetClose className="text-muted-foreground hover:bg-muted rounded-xs p-0.5 transition-colors">
            <X size={22} strokeWidth={2} />
          </SheetClose>
        </div>

        <div className="flex-1 overflow-y-auto">
          <p className="text-body-large-regular text-muted-foreground mb-3">
            {t('personalInfo.editReferrerHint', {
              defaultValue:
                "Please enter the referrer's referral code or UID to accept the invitation.\nEach user can only accept one invitation.",
            })}
          </p>
          <Input
            value={referrerInput}
            onChange={(e) => setReferrerInput(e.target.value)}
            className="h-12"
            placeholder={t('personalInfo.editReferrerPlaceholder', {
              defaultValue: 'Please enter the referral code or UID',
            })}
            disabled={isSaving || Boolean(existingReferrer)}
          />
        </div>

        <SheetFooter className="gap-3 p-0 pt-2">
          <Button
            onClick={handleSaveReferrer}
            disabled={isSaving || !referrerInput?.trim() || Boolean(existingReferrer)}
            className="h-11 w-full"
          >
            {isSaving
              ? t('personalInfoEditNickname.saving', { defaultValue: 'Saving...' })
              : t('personalInfoEditNickname.save', { defaultValue: 'Save' })}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
