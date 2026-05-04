'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSession, signIn, signOut } from 'next-auth/react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/hook/auth/useAuth';
import { useExperience } from '@/lib/experience/useExperience';
import { useGetData } from '@/context/GetdataContext';
import { authApi } from '@/services/auth';
import { tokenStorage } from '@/services/tokenStorage';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hook/useToast';
import { localizeApiError } from '@/i18n/apiErrors';

const EMAIL_REGEX =
  /^(?!\.)(?!.*\.\.)[A-Za-z0-9_'+\-\.]*[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;

export function useLoginFormController() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const experience = useExperience();
  const redirectTo = useMemo(
    () => searchParams.get('redirect') ?? (experience === 'web' ? '/market' : '/'),
    [searchParams, experience],
  );
  const prefilledEmail = useMemo(() => searchParams.get('email')?.trim() ?? '', [searchParams]);
  const googleError = searchParams.get('googleError');

  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  const hasProcessedGoogleCallbackRef = useRef(false);

  const { refetchAssets, refetchMe } = useGetData();
  const login = useAuthStore((state) => state.login);
  const { showSuccess, showError } = useToast();
  const { loginMutation } = useAuth();
  const isCredentialsSubmitting = loginMutation.isPending;

  useEffect(() => {
    if (!googleError) return;
    showError(t('auth.login.googleLoginFailedTitle'), t('auth.login.googleLoginFailedTitle'));
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('googleError');
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `/login?${nextQuery}` : '/login');
  }, [googleError, router, searchParams, showError, t]);

  useEffect(() => {
    if (!prefilledEmail) return;
    setEmail(prefilledEmail);
    setEmailError('');
  }, [prefilledEmail]);

  useEffect(() => {
    const maybeCompleteGoogleLogin = async () => {
      if (hasProcessedGoogleCallbackRef.current) return;

      const session = (await getSession()) as ({ idToken?: string } | null) | undefined;
      const idToken = session?.idToken;
      if (!idToken) return;

      hasProcessedGoogleCallbackRef.current = true;
      setIsGoogleSubmitting(true);
      try {
        const response = await authApi.loginSocial({ idToken, provider: 'google' });

        if ('status' in response && response.status === 'challenge_required') {
          localStorage.setItem(
            'mfa-flow',
            JSON.stringify({
              challengeId: response.challengeId,
              purpose: 'LOGIN',
              requiredFactors: response.requiredFactors,
            }),
          );

          await signOut({ redirect: false });
          router.push(
            `/settings/security/authenticator-app/verify-authenticator?mode=login&redirect=${encodeURIComponent(
              redirectTo,
            )}`,
          );
          return;
        }

        if ('accessToken' in response && response.accessToken) {
          tokenStorage.setAccessToken(response.accessToken);
        }
        if ('user' in response && response.user) {
          login(response.user);
          void refetchMe();
        }

        await signOut({ redirect: false });

        showSuccess(
          t('auth.login.googleLoginSuccessfulTitle'),
          t('auth.login.loginSuccessfulMessage'),
        );
        router.replace(redirectTo);
      } catch (error: unknown) {
        hasProcessedGoogleCallbackRef.current = false;
        showError(t('auth.login.googleLoginFailedTitle'), localizeApiError(error, t));
      } finally {
        setIsGoogleSubmitting(false);
      }
    };

    void maybeCompleteGoogleLogin();
  }, [login, redirectTo, router, showError, showSuccess, t]);

  const validateEmail = (value: string): boolean => {
    if (!value.trim()) {
      setEmailError(t('auth.login.emailRequired'));
      return false;
    }
    if (!EMAIL_REGEX.test(value.trim())) {
      setEmailError(t('auth.login.invalidEmail'));
      return false;
    }
    setEmailError('');
    return true;
  };

  const trimmedEmail = email.trim();
  const isEmailValid = EMAIL_REGEX.test(trimmedEmail);

  const handleSubmit = async (e?: { preventDefault: () => void }) => {
    e?.preventDefault();

    if (!isEmailValid) {
      validateEmail(trimmedEmail);
      return;
    }
    if (!password) return;

    try {
      const data = await loginMutation.mutateAsync({ email: trimmedEmail, password });

      if ('status' in data && data.status === 'challenge_required') {
        localStorage.setItem(
          'mfa-flow',
          JSON.stringify({
            challengeId: data.challengeId,
            purpose: 'LOGIN',
            requiredFactors: data.requiredFactors,
          }),
        );

        router.push(
          `/settings/security/authenticator-app/verify-authenticator?mode=login&redirect=${encodeURIComponent(
            redirectTo,
          )}`,
        );
        return;
      }

      if ('accessToken' in data && data.accessToken) {
        tokenStorage.setAccessToken(data.accessToken);
        refetchAssets();
      }

      if ('user' in data && data.user) {
        login(data.user);
        void refetchMe();
      }

      showSuccess(t('auth.login.loginSuccessfulTitle'), t('auth.login.loginSuccessfulMessage'));
      router.push(redirectTo);
    } catch (error: unknown) {
      showError(t('auth.login.loginFailedTitle'), localizeApiError(error, t));
    }
  };

  const handleGoogleLogin = async () => {
    if (isGoogleSubmitting) return;

    try {
      setIsGoogleSubmitting(true);
      const signInResult = await signIn('google', {
        callbackUrl: `/auth/callback?redirect=${encodeURIComponent(redirectTo)}`,
      });
      if (signInResult?.error) {
        showError(t('auth.login.googleLoginFailedTitle'), signInResult.error);
      }
    } catch (error: unknown) {
      showError(t('auth.login.googleLoginFailedTitle'), localizeApiError(error, t));
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  return {
    t,
    router,
    isPasswordVisible,
    setIsPasswordVisible,
    email,
    setEmail,
    password,
    setPassword,
    emailError,
    setEmailError,
    isGoogleSubmitting,
    isCredentialsSubmitting,
    trimmedEmail,
    validateEmail,
    handleSubmit,
    handleGoogleLogin,
  };
}
