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
import { useCommissionStats, useCommissionRewards, useClaimCommissions } from '@/hook/useCommissions';
import { localizeApiError } from '@/i18n/apiErrors';

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

  const { data: commStats } = useCommissionStats();
  const { data: commRewards } = useCommissionRewards({ skip: 0, take: 5 });
  const claimCommMutation = useClaimCommissions();

  const [inlineReferrerInput, setInlineReferrerInput] = useState('');
  const [isSavingReferrer, setIsSavingReferrer] = useState(false);

  const handleSaveInlineReferrer = useCallback(async () => {
    if (!inlineReferrerInput.trim()) return;
    setIsSavingReferrer(true);
    try {
      await authApi.updateReferral({ referenceCode: inlineReferrerInput.trim() });
      const latestUser = await authApi.getMe();
      updateUser(latestUser);
      await refetchMe();
      showSuccess(
        t('personalInfo.referrerTitle', { defaultValue: 'Referrer Linked' }),
        t('personalInfo.referrerLinkSuccess', { defaultValue: 'Referral code successfully applied!' }),
      );
      setInlineReferrerInput('');
    } catch (e) {
      showError(
        t('personalInfo.referrerTitle', { defaultValue: 'Referrer Link Failed' }),
        localizeApiError(e, t),
      );
    } finally {
      setIsSavingReferrer(false);
    }
  }, [inlineReferrerInput, updateUser, refetchMe, showSuccess, showError, t]);

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
  const linkEmail = user?.email ? maskEmail(user.email) : 'â€”';
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
        // Pass File directly â€” fetch(blob URL) from camera captures is flaky on some mobile browsers
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

  /** Close sheet first â€” opening the native picker while a modal is open often breaks iOS/Android. */
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

        {/* Referral & Commissions Dashboard */}
        <div className="border-border bg-card mt-6 rounded-xl border p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-primary-500/10 p-1.5 rounded-lg">
              <span className="text-primary-500 font-semibold text-lg">đŸ“¢</span>
            </div>
            <div>
              <h3 className="text-body-large-semibold text-foreground">
                {t('commissions.referralTitle', { defaultValue: 'Referral & Commissions' })}
              </h3>
              <p className="text-body-small-regular text-muted-foreground">
                {t('commissions.referralDescription', { defaultValue: 'Invite friends and earn real estate commissions' })}
              </p>
            </div>
          </div>

          {/* Inline Referrer Input (if not set yet) */}
          {canEditReferrer && (
            <div className="bg-muted/30 border-primary-500/10 mb-4 rounded-lg border p-3.5">
              <div className="text-body-medium-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                <span>đŸ</span>
                <span>{t('personalInfo.enterReferrerTitle', { defaultValue: 'Enter Referral Code' })}</span>
              </div>
              <p className="text-body-small-regular text-muted-foreground mb-3 text-xs">
                {t('personalInfo.enterReferrerDesc', { defaultValue: "Enter your friend's referral code to link accounts and earn real estate rewards." })}
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inlineReferrerInput}
                  onChange={(e) => setInlineReferrerInput(e.target.value)}
                  disabled={isSavingReferrer}
                  placeholder={t('personalInfo.editReferrerPlaceholder', { defaultValue: 'Please enter the referral code' })}
                  className="bg-background border-border text-foreground flex-1 rounded-lg border px-3 py-1.5 text-xs outline-none focus:border-primary-500 transition-colors"
                />
                <Button
                  variant="primary-contained"
                  disabled={isSavingReferrer || !inlineReferrerInput.trim()}
                  onClick={handleSaveInlineReferrer}
                  className="px-4 py-1.5 text-xs font-semibold text-white dark:text-black shrink-0"
                >
                  {isSavingReferrer ? t('personalInfoEditNickname.saving', { defaultValue: 'Saving...' }) : t('common.apply', { defaultValue: 'Apply' })}
                </Button>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-muted/40 rounded-lg p-3 text-center">
              <div className="text-body-small-regular text-muted-foreground text-xs truncate">
                {t('commissions.totalFriends', { defaultValue: 'Invited' })}
              </div>
              <div className="text-body-large-semibold text-foreground mt-1 text-base">
                {commStats?.totalReferees ?? 0}
              </div>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 text-center">
              <div className="text-body-small-regular text-muted-foreground text-xs truncate">
                {t('commissions.activeFriends', { defaultValue: 'Active' })}
              </div>
              <div className="text-body-large-semibold text-foreground mt-1 text-base">
                {commStats?.activeReferees ?? 0}
              </div>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 text-center">
              <div className="text-body-small-regular text-muted-foreground text-xs truncate">
                {t('commissions.totalEarned', { defaultValue: 'Earned' })}
              </div>
              <div className="text-primary-500 text-body-large-semibold mt-1 text-base truncate">
                ${Number(commStats?.totalCommissions ?? 0).toFixed(2)}
              </div>
            </div>
          </div>

          {/* SVG Visual Chart */}
          {commStats && Number(commStats.totalCommissions) > 0 && (
            <div className="bg-muted/20 rounded-lg p-3.5 mb-4 flex items-center gap-4">
              {/* Circular progress SVG */}
              <div className="relative w-16 h-16 shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="26"
                    className="stroke-muted-foreground/10"
                    strokeWidth="5"
                    fill="transparent"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="26"
                    className="stroke-primary-500"
                    strokeWidth="5"
                    fill="transparent"
                    strokeDasharray={163.36}
                    strokeDashoffset={
                      163.36 - (163.36 * Number(commStats.claimedCommissions)) / (Number(commStats.totalCommissions) || 1)
                    }
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-foreground">
                  {Math.round(
                    (Number(commStats.claimedCommissions) / (Number(commStats.totalCommissions) || 1)) * 100
                  )}%
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex justify-between text-body-small-regular">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary-500" />
                    {t('commissions.claimed', { defaultValue: 'Claimed' })}
                  </span>
                  <span className="text-foreground font-semibold">
                    ${Number(commStats.claimedCommissions).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-body-small-regular">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
                    {t('commissions.unclaimed', { defaultValue: 'Unclaimed' })}
                  </span>
                  <span className="text-foreground font-semibold">
                    ${Number(commStats.unclaimedCommissions).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Claim Rewards Panel */}
          <div className="border-t border-border pt-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-body-small-regular text-muted-foreground text-xs">
                {t('commissions.unclaimedBalance', { defaultValue: 'Unclaimed' })}
              </div>
              <div className="text-body-large-semibold text-foreground mt-0.5">
                ${Number(commStats?.unclaimedCommissions ?? 0).toFixed(2)} <span className="text-xs text-muted-foreground font-normal">VND</span>
              </div>
            </div>
            <Button
              variant="primary-contained"
              disabled={claimCommMutation.isPending || !commStats || Number(commStats.unclaimedCommissions) <= 0}
              onClick={() => claimCommMutation.mutate()}
              className="px-3 py-2 text-xs font-semibold text-white dark:text-black shrink-0"
            >
              {claimCommMutation.isPending
                ? t('commissions.claiming', { defaultValue: 'Claiming...' })
                : t('commissions.claimButton', { defaultValue: 'Claim Rewards' })}
            </Button>
          </div>

          {/* Recent Rewards History List */}
          {commRewards && commRewards.length > 0 && (
            <div className="border-t border-border mt-4 pt-4">
              <h4 className="text-body-medium-semibold text-foreground mb-2">
                {t('commissions.recentRewards', { defaultValue: 'Recent Rewards' })}
              </h4>
              <div className="space-y-2">
                {commRewards.map((reward) => (
                  <div key={reward.id} className="flex justify-between items-center text-body-small-regular">
                    <div className="min-w-0">
                      <div className="text-foreground font-medium truncate">
                        {reward.refereeName || t('commissions.friendJoined', { defaultValue: 'Invited Friend' })}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {new Date(reward.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-success-500 font-semibold shrink-0">
                      +${Number(reward.amount).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
          className="bg-card mx-auto max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-t-lg p-0"
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
          className="bg-background mx-auto max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-t-lg p-0"
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

