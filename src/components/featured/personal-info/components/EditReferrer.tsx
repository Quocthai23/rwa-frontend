'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/shared/Header';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hook/useToast';
import { authApi } from '@/services/auth';
import { Input } from '@/components/shared/atoms/input';
import { Button } from '@/components/shared/atoms/button';
import { useTranslation } from 'react-i18next';
import { localizeApiError } from '@/i18n/apiErrors';
import { useGetData } from '@/context/GetdataContext';

export default function EditReferrer() {
  const { t } = useTranslation();
  const router = useRouter();
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
      router.back();
    } catch (e) {
      showError(
        t('personalInfo.referrerTitle', { defaultValue: 'Referrer' }),
        localizeApiError(e, t),
      );
    } finally {
      setIsSaving(false);
    }
  }, [referrerInput, existingReferrer, showError, t, router, updateUser, referrerInput]);

  return (
    <div className="bg-background text-foreground flex h-dvh flex-col pb-2">
      <Header label={t('personalInfo.referrerTitle', { defaultValue: 'Referrer' })} />

      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-body-large-regular text-muted-foreground mb-3 whitespace-pre-line">
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
      <div className="px-4 py-4 pb-[env(safe-area-inset-bottom)]">
        <Button
          onClick={handleSaveReferrer}
          disabled={isSaving || !referrerInput?.trim() || Boolean(existingReferrer)}
          className="bg-primary-500 text-body-large-semibold h-11 w-full rounded text-white"
        >
          {isSaving
            ? t('personalInfoEditNickname.saving', { defaultValue: 'Saving...' })
            : t('personalInfoEditNickname.save', { defaultValue: 'Save' })}
        </Button>
      </div>
    </div>
  );
}
