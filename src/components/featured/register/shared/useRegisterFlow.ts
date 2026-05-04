'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useTranslation } from 'react-i18next';

import { useToast } from '@/hook/useToast';
import { localizeApiError } from '@/i18n/apiErrors';

export enum RegisterStep {
  Start = 'start',
  Input = 'input',
  VerifyOtp = 'verify-otp',
  CreatePassword = 'create-password',
  ReferralCode = 'referral-code',
}

type RegisterData = {
  email: string;
  token: string;
  password: string;
};

const DEFAULT_DATA: RegisterData = {
  email: '',
  token: '',
  password: '',
};

const REGISTER_TOKEN_TTL_MS = 5 * 60 * 1000;

export function useRegisterFlow() {
  const { t } = useTranslation();
  const router = useRouter();
  const { showError } = useToast();
  const [step, setStep] = useState<RegisterStep>(RegisterStep.Start);
  const [data, setData] = useState<RegisterData>(DEFAULT_DATA);
  const [tokenIssuedAt, setTokenIssuedAt] = useState<number | null>(null);
  const [skipInitialResendCooldown, setSkipInitialResendCooldown] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  const missingDataHandler = () => {
    setData(DEFAULT_DATA);
    setTokenIssuedAt(null);
    setSkipInitialResendCooldown(false);
    setStep(RegisterStep.Input);
  };

  const expireRegisterSession = useCallback(
    (message?: string) => {
      setData((prev) => ({ ...prev, token: '', password: '' }));
      setTokenIssuedAt(null);
      showError(
        t('auth.register.registerFailedTitle', { defaultValue: 'Registration failed' }),
        message ||
          t('auth.register.registerTokenExpired', {
            defaultValue:
              'Your registration session has expired. Please resend code to start a new session.',
          }),
      );
      setSkipInitialResendCooldown(true);
      setStep(RegisterStep.VerifyOtp);
    },
    [showError, t],
  );

  const handleGoogleSignUp = useCallback(async () => {
    if (isGoogleSubmitting) return;
    try {
      setIsGoogleSubmitting(true);
      const signInResult = await signIn('google', {
        callbackUrl: '/auth/callback?redirect=/',
      });
      if (signInResult?.error) {
        showError(
          t('auth.register.registerFailedTitle', { defaultValue: 'Registration failed' }),
          signInResult.error,
        );
      }
    } catch (error: unknown) {
      showError(
        t('auth.register.registerFailedTitle', { defaultValue: 'Registration failed' }),
        localizeApiError(error, t),
      );
    } finally {
      setIsGoogleSubmitting(false);
    }
  }, [isGoogleSubmitting, showError, t]);

  useEffect(() => {
    if (
      !tokenIssuedAt ||
      (step !== RegisterStep.CreatePassword && step !== RegisterStep.ReferralCode)
    ) {
      return;
    }

    const remaining = REGISTER_TOKEN_TTL_MS - (Date.now() - tokenIssuedAt);
    if (remaining <= 0) {
      const timer = setTimeout(() => {
        expireRegisterSession();
      }, 0);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      expireRegisterSession();
    }, remaining);

    return () => clearTimeout(timer);
  }, [expireRegisterSession, step, tokenIssuedAt]);

  return {
    t,
    router,
    step,
    setStep,
    data,
    setData,
    tokenIssuedAt,
    setTokenIssuedAt,
    skipInitialResendCooldown,
    setSkipInitialResendCooldown,
    isGoogleSubmitting,
    handleGoogleSignUp,
    missingDataHandler,
    expireRegisterSession,
  };
}
