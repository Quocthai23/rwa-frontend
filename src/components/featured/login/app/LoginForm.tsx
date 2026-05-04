'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Eye, EyeOff } from '@untitledui/icons';
import { useEffect } from 'react';

import { Button } from '@/components/shared/atoms/button';
import { Input } from '@/components/shared/atoms/input';
import { useAuthHydrated } from '@/hook/useAuthHydrated';
import { useAuthStore } from '@/store/authStore';
import { useLoginFormController } from '../shared/useLoginFormController';
import AppHeader from '@/components/shared/header/AppHeader';

export default function LoginForm() {
  const {
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
  } = useLoginFormController();
  const hasHydratedAuth = useAuthHydrated();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!hasHydratedAuth || !isAuthenticated) return;
    router.replace('/home');
  }, [hasHydratedAuth, isAuthenticated, router]);

  if (hasHydratedAuth && isAuthenticated) return null;

  return (
    <div className="min-h-screen">
      <div className="dark:bg-background dark:text-foreground flex min-h-screen flex-col bg-white">
        <div className="relative flex-1 pt-4">
          <AppHeader
            label={t('auth.login.title')}
            onBack={() => router.back()}
            rightItem={
              <Link href="/register">
                <span className="text-primary-500 text-button-large-medium">
                  {t('auth.login.signUp')}
                </span>
              </Link>
            }
          />

          <form className="mb-6 flex flex-col gap-2 px-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <label className="text-body-large-semibold text-neutral-900 dark:text-neutral-50">
                {t('auth.login.emailAddress')}
              </label>
              <Input
                autoComplete="email"
                inputMode="email"
                placeholder={t('auth.login.emailPlaceholder')}
                value={email}
                className="border-border h-12 border"
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError('');
                }}
                onBlur={() => validateEmail(email)}
              />
              {emailError && <p className="text-body-small-medium text-red-500">{emailError}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-body-large-semibold text-neutral-900 dark:text-neutral-50">
                {t('auth.login.password')}
              </label>
              <div className="relative">
                <Input
                  autoComplete="current-password"
                  placeholder={t('auth.login.passwordPlaceholder')}
                  type={isPasswordVisible ? 'text' : 'password'}
                  value={password}
                  className="border-border h-12 pr-12"
                  onChange={(e) => setPassword(e.target.value)}
                  rightAccessory={
                    <Button
                      type="button"
                      variant="white-contained"
                      onClick={() => setIsPasswordVisible((v) => !v)}
                      className="absolute top-1/2 right-2 -translate-y-1/2 bg-transparent p-2"
                      aria-label={
                        isPasswordVisible
                          ? t('auth.login.hidePassword')
                          : t('auth.login.showPassword')
                      }
                    >
                      {isPasswordVisible ? (
                        <Eye className="size-5" />
                      ) : (
                        <EyeOff className="size-5" />
                      )}
                    </Button>
                  }
                />
              </div>
            </div>

            <Link className="mb-4 self-end" href="/forgot-password">
              <span className="text-primary-500 text-button-small-medium justify-start text-center">
                {t('auth.login.forgotPassword')}
              </span>
            </Link>
            <Button
              variant="primary-contained"
              type="submit"
              className="text-button-large-medium w-full py-3"
              disabled={isCredentialsSubmitting || !trimmedEmail || !password}
            >
              {isCredentialsSubmitting ? t('auth.login.loading') : t('auth.login.title')}
            </Button>
          </form>

          <div className="mt-8 mb-8 flex flex-row items-center">
            <div className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
            <div>
              <div className="text-body-small-semibold text-muted-foreground mx-4">
                {t('auth.login.orLoginWith')}
              </div>
            </div>
            <div className="border-border h-px flex-1 border" />
          </div>
          <div className="flex flex-col gap-2 px-4">
            <Button
              type="button"
              className="text-button-large-medium mt-3 flex w-full items-center justify-center gap-3 py-3"
              onClick={handleGoogleLogin}
              disabled={isGoogleSubmitting}
              variant="neutral-outline"
              asChild={true}
            >
              <div className="flex items-center gap-3">
                <Image src="/assets/images/google.png" alt="Google" width={24} height={24} />
                <span className="text-body-large-medium">
                  {isGoogleSubmitting
                    ? t('auth.login.loading')
                    : t('auth.login.continueWithGoogle')}
                </span>
              </div>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
