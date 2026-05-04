'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronRight, Edit02, Loading01, RefreshCcw01, Check } from '@untitledui/icons';
import Header from '@/components/shared/Header';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hook/useToast';
import { authApi } from '@/services/auth';
import { imageApi } from '@/services/imageService';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent } from '@/components/shared/atoms/sheet';
import { Button } from '@/components/shared/atoms/button';
import { useTranslation } from 'react-i18next';
import { useGetData } from '@/context/GetdataContext';

const PROFILE_PLACEHOLDER = '/assets/images/discover/profile-picture.png';
const COPY_ICON = '/assets/images/discover/copy-icon.png';

type GenderOption = { display: string; value: 'MALE' | 'FEMALE' };

function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;

  const [local, domain] = email.split('@');
  if (local.length <= 4) return `${local.slice(0, 2)}****@${domain}`;

  return `${local.slice(0, 4)}****@${domain}`;
}

type InfoRowProps = {
  readonly label: string;
  readonly onPress?: () => void;
  readonly value: string;
};

function InfoRow({ label, onPress, value }: InfoRowProps) {
  const displayValue = value && value.length > 20 ? `${value.slice(0, 20)}...` : value;

  return (
    <button
      className={cn(
        'bg-background flex w-full flex-row items-center justify-between py-4 last:border-0',
        onPress ? 'active:bg-muted cursor-pointer' : 'cursor-default',
      )}
      onClick={onPress}
      disabled={!onPress}
    >
      <span className="text-body-large-regular text-muted-foreground">{label}</span>
      <div className="flex flex-1 flex-row items-center justify-end pl-4">
        {displayValue ? (
          <span className="text-body-large-semibold text-foreground truncate">{displayValue}</span>
        ) : null}
        {onPress ? <ChevronRight size={24} className="text-muted-foreground ml-1" /> : null}
      </div>
    </button>
  );
}

export default function PersonalInfo() {
  const { t } = useTranslation();
  const GENDER_OPTIONS: GenderOption[] = [
    { display: t('personalInfo.male'), value: 'MALE' },
    { display: t('personalInfo.female'), value: 'FEMALE' },
  ];

  const router = useRouter();
  const authUser = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const { me, refetchMe, isFetchingMe } = useGetData();
  const user = me ?? authUser;
  const { showSuccess, showError } = useToast();

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const [isAvatarSheetOpen, setIsAvatarSheetOpen] = useState(false);
  const [isGenderSheetOpen, setIsGenderSheetOpen] = useState(false); // Keep for gender selection

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const albumInputRef = useRef<HTMLInputElement>(null);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      // Clear timeout on unmount
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  const uid = user?.id ?? '';

  const copyUid = useCallback(() => {
    if (!uid) return;
    navigator.clipboard.writeText(uid);
    showSuccess('Copy successful', 'UID copied to clipboard successfully.');
    setIsCopied(true);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setIsCopied(false), 2000); // Revert after 2 seconds
  }, [uid, showSuccess, copyTimeoutRef]);

  const username = user?.username?.trim() || t('personalInfo.notSet');
  const displayName = user?.displayName?.trim() || t('personalInfo.notSet');
  const linkEmail = user?.email ? maskEmail(user.email) : '—';
  const referrer = user?.referenceId ? user.referenceId : t('personalInfo.notSet');
  const canEditReferrer = referrer === t('personalInfo.notSet');
  const genderDisplay =
    user?.gender === 'MALE'
      ? t('personalInfo.male')
      : user?.gender === 'FEMALE'
        ? t('personalInfo.female')
        : t('personalInfo.unknown');

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsUploadingAvatar(true);

      try {
        // Pass File directly — fetch(blob URL) from camera captures is flaky on some mobile browsers
        const avatar = await imageApi.uploadImageToPresignedUrl(file, {
          type: file.type || 'image/jpeg',
          fileName: file.name || 'photo.jpg',
        });

        await authApi.updateProfile({
          avatar: avatar,
          username: user?.username?.trim() ?? '',
        });

        updateUser({ avatar });

        showSuccess(t('personalInfo.uploadSuccessTitle'), t('personalInfo.uploadSuccessMessage'));
      } catch (e) {
        showError(
          'Upload failed',
          e instanceof Error ? e.message : 'Upload failed. Please try again.',
        );
      } finally {
        setIsUploadingAvatar(false);
        if (cameraInputRef.current) cameraInputRef.current.value = '';
        if (albumInputRef.current) albumInputRef.current.value = '';
      }
    },
    [user, updateUser, showSuccess, showError, t],
  );

  /** Close sheet first — opening the native picker while a modal is open often breaks iOS/Android. */
  const triggerHiddenFileInput = useCallback((ref: React.RefObject<HTMLInputElement | null>) => {
    setIsAvatarSheetOpen(false);
    // Short delay so the sheet finishes closing; otherwise the file picker may not fire `change` on iOS
    window.setTimeout(() => {
      ref.current?.click();
    }, 150);
  }, []);

  const handleCamera = useCallback(() => {
    triggerHiddenFileInput(cameraInputRef);
  }, [triggerHiddenFileInput]);

  const handleSelectFromAlbum = useCallback(() => {
    triggerHiddenFileInput(albumInputRef);
  }, [triggerHiddenFileInput]);

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <Header
        label={t('personalInfo.title')}
        rightItem={
          <button
            type="button"
            onClick={() => void refetchMe()}
            disabled={isFetchingMe}
            aria-label="Refresh"
            className="hover:bg-muted rounded-full p-1 transition-colors"
          >
            <RefreshCcw01
              size={22}
              className={cn('text-foreground', isFetchingMe && 'animate-spin')}
            />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto px-4 pb-10">
        {/* Avatar + UID */}
        <div className="flex flex-col items-center pt-6 pb-8">
          <div className="relative">
            <div className="bg-primary-500 h-30 w-30 overflow-hidden rounded-full">
              <Image
                key={user?.avatar || 'avatar'}
                src={user?.avatar || PROFILE_PLACEHOLDER}
                alt="Profile"
                width={120}
                height={120}
                className="h-full w-full object-cover"
                unoptimized
              />
              {isUploadingAvatar && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Loading01 color="black" fill="white" size={20} className="animate-spin" />
                </div>
              )}
            </div>
            <button
              className="bg-primary-50 hover:bg-primary-200 dark:bg-card dark:hover:bg-muted absolute right-0 bottom-0 flex h-8 w-8 items-center justify-center rounded-full transition-colors"
              disabled={isUploadingAvatar}
              onClick={() => setIsAvatarSheetOpen(true)}
            >
              <Edit02 color="#0158FF" size={20} className="text-primary-500" />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="text-body-large-regular text-muted-foreground">UID </span>
            <span className="text-body-large-semibold text-foreground">{uid}</span>
            <button className="cursor-pointer rounded p-1" onClick={copyUid} aria-label="Copy UID">
              {isCopied ? (
                <Check size={20} className="text-green-500" />
              ) : (
                <Image
                  src={COPY_ICON}
                  alt="copy"
                  width={20}
                  height={20}
                  className="h-5 w-5 object-contain"
                />
              )}
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex flex-col">
          <InfoRow
            label={t('personalInfo.username', 'Username')}
            value={username}
            onPress={() => router.push('/personal-info/edit-nickname')}
          />
          <InfoRow
            label={t('personalInfo.displayName', 'Display Name')}
            value={displayName}
            onPress={() => router.push('/personal-info/edit-display-name')}
          />
          <InfoRow
            label={t('personalInfo.gender')}
            value={genderDisplay}
            onPress={() => setIsGenderSheetOpen(true)}
          />
          <InfoRow label={t('personalInfo.linkEmail')} value={linkEmail} />
          <InfoRow
            label={t('personalInfo.referrerTitle')}
            value={referrer}
            onPress={
              canEditReferrer ? () => router.push('/personal-info/edit-referrer') : undefined
            }
          />
        </div>
      </div>

      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={cameraInputRef}
        className="hidden"
        accept="image/*"
        capture="user"
        onChange={handleFileChange}
      />
      <input
        type="file"
        ref={albumInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />

      {/* Select Avatar Sheet */}
      <Sheet open={isAvatarSheetOpen} onOpenChange={setIsAvatarSheetOpen}>
        <SheetContent
          side="bottom"
          title="Select Avatar"
          className="bg-card mx-auto max-h-[90vh] w-full max-w-192 overflow-y-auto rounded-t-lg p-0"
        >
          <div className="bg-card flex flex-col pb-6">
            <div className="p-4">
              <h3 className="text-h3-semibold text-foreground">{t('personalInfo.selectAvatar')}</h3>
            </div>
            <div className="bg-border h-px w-full" />
            <div className="flex flex-col px-4">
              <button
                type="button"
                className="text-body-large-semibold text-foreground flex h-14 items-center justify-start"
                onClick={handleCamera}
              >
                {t('personalInfo.takePhoto', 'Camera')}
              </button>
              <button
                type="button"
                className="text-body-large-semibold text-foreground flex h-14 items-center justify-start"
                onClick={handleSelectFromAlbum}
              >
                {t('personalInfo.selectFromAlbum')}
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Select Gender Sheet (assuming it remains a sheet for now) */}
      <Sheet open={isGenderSheetOpen} onOpenChange={setIsGenderSheetOpen}>
        <SheetContent
          side="bottom"
          className="bg-background mx-auto max-h-[90vh] w-full max-w-192 overflow-y-auto rounded-t-lg p-0"
        >
          <div className="bg-background flex flex-col py-4">
            <div className="px-4">
              <h3 className="text-h3-semibold text-foreground">{t('personalInfo.gender')}</h3>
            </div>
            <div className="bg-border mt-4 h-px w-full" />
            <div className="flex flex-col px-4">
              {GENDER_OPTIONS.map((opt) => {
                const isActive = user?.gender === opt.value;
                return (
                  <Button
                    variant="white-contained"
                    key={opt.value}
                    disabled={isActive}
                    className={cn(
                      'flex h-16 items-center justify-between px-0 disabled:opacity-100',
                      isActive ? 'text-primary-500!' : 'text-foreground hover:text-primary-500!',
                    )}
                    onClick={async () => {
                      if (isActive) return;
                      setIsGenderSheetOpen(false);
                      const username = user?.username?.trim() ?? '';
                      try {
                        await authApi.updateProfile({ username, gender: opt.value });
                        updateUser({ gender: opt.value });
                        showSuccess(
                          t('personalInfo.genderUpdatedTitle'),
                          t('personalInfo.genderUpdatedMessage'),
                        );
                      } catch (e) {
                        showError(
                          'Gender update failed',
                          e instanceof Error
                            ? e.message
                            : 'Failed to update gender. Please try again.',
                        );
                      }
                    }}
                  >
                    <span
                      className={cn(
                        'text-body-large-semibold',
                        isActive ? 'text-primary-500' : 'text-foreground',
                      )}
                    >
                      {opt.display}
                    </span>
                    {isActive ? <Check size={24} className="text-primary-500" /> : null}
                  </Button>
                );
              })}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
