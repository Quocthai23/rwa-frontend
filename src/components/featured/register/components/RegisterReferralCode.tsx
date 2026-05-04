'use client';

import { useState } from 'react';
import { Button } from '@/components/shared/atoms/button';
import AppHeader from '@/components/shared/header/AppHeader';
import { Input } from '@/components/shared/atoms/input';
import { authApi } from '@/services/auth';
import { useToast } from '@/hook/useToast';
import { useTranslation } from 'react-i18next';
import { localizeApiError } from '@/i18n/apiErrors';

type RegisterReferralCodeProps = {
  email: string;
  password: string;
  registerToken: string;
  onBack: () => void;
  onMissingData: () => void;
  onTokenExpired: (message?: string) => void;
  onSuccess: (email: string) => void;
};

export default function RegisterReferralCode({
  email,
  password,
  registerToken,
  onBack,
  onMissingData,
  onTokenExpired,
  onSuccess,
}: RegisterReferralCodeProps) {
  const { t } = useTranslation();
  const { showError, showSuccess } = useToast();
  const [referralCode, setReferralCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const getErrorCode = (error: unknown): string | undefined => {
    if (typeof error !== 'object' || error === null) return undefined;

    if ('code' in error && typeof (error as { code?: unknown }).code === 'string') {
      return (error as { code: string }).code.toLowerCase();
    }

    const nestedErrors = (error as { errors?: unknown }).errors;
    if (
      typeof nestedErrors === 'object' &&
      nestedErrors !== null &&
      'code' in nestedErrors &&
      typeof (nestedErrors as { code?: unknown }).code === 'string'
    ) {
      return (nestedErrors as { code: string }).code.toLowerCase();
    }

    return undefined;
  };

  const isRegisterTokenInvalid = (error: unknown): boolean => {
    const code = getErrorCode(error);
    if (!code) return false;

    // registerToken can fail when OTP is expired/not found/invalid
    if (
      code === 'token-expired' ||
      code === 'otp-not-found' ||
      code === 'invalid-otp' ||
      code === 'user-not-found' ||
      code === 'unauthorized' ||
      code === 'invalid-token'
    ) {
      return true;
    }

    const message =
      typeof error === 'string'
        ? error
        : error instanceof Error
          ? error.message
          : ((error as { message?: unknown })?.message as string | undefined) || '';

    const normalized = message.toLowerCase();
    return (
      (normalized.includes('expired') && normalized.includes('token')) ||
      (normalized.includes('otp') && normalized.includes('expired')) ||
      (normalized.includes('otp') && normalized.includes('not found')) ||
      normalized.includes('invalid otp') ||
      normalized.includes('invalid register token')
    );
  };

  const handleRegister = async (useReferral: boolean) => {
    setIsLoading(true);
    try {
      if (useReferral && referralCode.trim()) {
        const res = await authApi.checkReferenceCode(referralCode.trim());
        if (!res.exists || !res.isValid) {
          showError(
            t('auth.register.registerFailedTitle', { defaultValue: 'Registration failed' }),
            t('auth.register.invalidReferralCode', {
              defaultValue: 'The referral code is invalid or expired.',
            }),
          );
          setIsLoading(false);
          return;
        }
      }

      if (!password || !registerToken) {
        onMissingData();
        setIsLoading(false);
        return;
      }

      const response = await authApi.register({
        password,
        registerToken,
        referenceCode: useReferral && referralCode.trim() ? referralCode.trim() : undefined,
      });

      if (response.user) {
        showSuccess(
          t('auth.register.registerSuccessTitle', { defaultValue: 'Registration successful' }),
          t('auth.register.registerSuccessMessage', {
            defaultValue: 'You have been registered successfully.',
          }),
        );
        onSuccess(response.user.email || email);
      } else {
        showError(
          t('auth.register.registerFailedTitle', { defaultValue: 'Registration failed' }),
          t('auth.register.missingUserData', {
            defaultValue: 'Registration response is missing user data. Please try again.',
          }),
        );
        setIsLoading(false);
      }
    } catch (error) {
      if (getErrorCode(error) === 'otp-not-found' || isRegisterTokenInvalid(error)) {
        onTokenExpired(localizeApiError(error, t));
        return;
      }

      const message =
        typeof error === 'string'
          ? error
          : error instanceof Error
            ? error.message
            : t('auth.register.registerFailedTitle', { defaultValue: 'Registration failed' });
      showError(
        t('auth.register.registerFailedTitle', { defaultValue: 'Registration failed' }),
        message ||
          t('auth.register.registerFailedMessage', {
            defaultValue: 'Registration failed. Please try again.',
          }),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="bg-background flex min-h-screen flex-col pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <div className="relative flex flex-1 flex-col pt-4">
          <AppHeader
            label={t('auth.register.referralTitle', { defaultValue: 'Have a Referral Code?' })}
            onBack={onBack}
          />

          <div className="mb-6 px-4">
            <label className="text-body-large-semibold text-foreground mb-2 block">
              {t('auth.register.referralLabel', {
                defaultValue: 'Referral Code',
              })}
            </label>
            <Input
              value={referralCode}
              onChange={(event) => setReferralCode(event.target.value)}
              autoCapitalize="none"
              autoComplete="off"
              placeholder={t('auth.register.referralPlaceholder', {
                defaultValue: 'Enter referral code',
              })}
              className="h-12 border border-neutral-200"
            />
            <div className="text-body-large-regular text-muted-foreground mt-2">
              {t('auth.register.referralHint', {
                defaultValue: 'Enter a valid referral code to receive your bonus.',
              })}
            </div>
          </div>

          <div className="bg-background mt-auto px-4 pb-5">
            <Button
              className="border-primary-500 bg-primary-500 h-12 w-full rounded border text-white"
              disabled={isLoading}
              onClick={() => handleRegister(true)}
            >
              {isLoading ? t('auth.login.loading') : t('auth.register.title')}
            </Button>
            <Button
              className="border-primary-100 bg-primary-100 text-primary-500 mt-3 h-12 w-full rounded border"
              variant="white-contained"
              disabled={isLoading}
              onClick={() => handleRegister(false)}
            >
              {t('auth.register.skipReferral', { defaultValue: 'Skip' })}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
