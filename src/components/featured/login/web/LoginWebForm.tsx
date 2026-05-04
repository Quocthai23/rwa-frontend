'use client';

import Image from 'next/image';
import AuthLeftPanel from '@/components/featured/shared/AuthLeftPanel';
import Link from 'next/link';
import { Eye, EyeOff, X } from '@untitledui/icons';
import { useEffect } from 'react';
import { Button } from '@/components/shared/atoms/button';
import { Input } from '@/components/shared/atoms/input';
import { useAuthHydrated } from '@/hook/useAuthHydrated';
import { useAuthStore } from '@/store/authStore';
import { useLoginFormController } from '../shared/useLoginFormController';

export default function LoginWebForm() {
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
    router.replace('/market');
  }, [hasHydratedAuth, isAuthenticated, router]);

  if (hasHydratedAuth && isAuthenticated) return null;

  return (
    <div className="bg-background flex min-h-screen w-full items-center justify-center p-4 md:p-0">
      <div className="dark:bg-card flex w-full max-w-[1000px] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl md:h-[680px] dark:border-neutral-800">
        <AuthLeftPanel />

        <div className="dark:bg-card dark:text-foreground flex flex-1 flex-col overflow-y-auto bg-white p-8 md:p-12">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="dark:text-foreground text-2xl font-bold text-neutral-900">
              {t('auth.login.title')}
            </h2>
            <Button
              variant="white-contained"
              onClick={() => router.push('/market')}
              aria-label={t('common.close')}
              title={t('common.close')}
              className="size-6 p-0"
            >
              <X className="size-6 text-neutral-600" />
            </Button>
          </div>

          <div className="mb-8 h-px w-full bg-neutral-200 dark:bg-neutral-800" />

          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className="flex flex-col gap-2">
              <label className="dark:text-foreground text-sm font-semibold text-neutral-700">
                {t('auth.login.emailAddress')}
              </label>
              <Input
                autoComplete="email"
                placeholder={t('auth.login.emailPlaceholder')}
                value={email}
                className="focus:border-primary-500 h-12 border-neutral-200 dark:border-neutral-800"
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError('');
                }}
                onBlur={() => validateEmail(email)}
              />
              {emailError && <p className="text-xs text-red-500">{emailError}</p>}
            </div>

            {/* Password Field */}
            <div className="flex flex-col gap-2">
              <label className="dark:text-foreground text-sm font-semibold text-neutral-700">
                {t('auth.login.password')}
              </label>
              <div className="relative">
                <Input
                  autoComplete="current-password"
                  placeholder={t('auth.login.passwordPlaceholder')}
                  type={isPasswordVisible ? 'text' : 'password'}
                  value={password}
                  className="h-12 border-neutral-200 pr-12 dark:border-neutral-800"
                  onChange={(e) => setPassword(e.target.value)}
                  rightAccessory={
                    <button
                      type="button"
                      onClick={() => setIsPasswordVisible((v) => !v)}
                      className="dark:text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    >
                      {isPasswordVisible ? (
                        <Eye className="size-5" />
                      ) : (
                        <EyeOff className="size-5" />
                      )}
                    </button>
                  }
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Link href="/forgot-password">
                <span className="text-primary-500 text-sm font-medium hover:underline">
                  {t('auth.login.forgotPassword')}
                </span>
              </Link>
            </div>

            <Button
              variant="primary-contained"
              type="submit"
              className="shadow-primary-500/20 w-full py-3 text-base font-semibold shadow-lg"
              disabled={isCredentialsSubmitting || !trimmedEmail || !password}
            >
              {isCredentialsSubmitting ? t('auth.login.loading') : t('auth.login.title')}
            </Button>
          </form>

          {/* Divider */}
          <div className="my-8 flex items-center gap-4">
            <div className="h-px flex-1 bg-neutral-100 dark:bg-neutral-800" />
            <span className="dark:text-muted-foreground text-xs font-bold tracking-wider text-neutral-500 uppercase">
              {t('auth.login.orLoginWith')}
            </span>
            <div className="h-px flex-1 bg-neutral-100 dark:bg-neutral-800" />
          </div>

          {/* Social Logins */}
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="neutral-outline"
              className="flex h-12 w-full items-center justify-center gap-3 border-neutral-200 dark:border-neutral-800"
              onClick={handleGoogleLogin}
              disabled={isGoogleSubmitting}
            >
              <Image src="/assets/images/google.png" alt="Google" width={20} height={20} />
              <span className="dark:text-foreground dark:hover:text-primary-500 text-sm font-semibold text-neutral-700">
                {isGoogleSubmitting ? t('auth.login.loading') : t('auth.login.continueWithGoogle')}
              </span>
            </Button>
          </div>

          <p className="dark:text-muted-foreground mt-auto pt-8 text-center text-sm text-neutral-500">
            {t('auth.login.noAccount')}{' '}
            <Link href="/register" className="text-primary-500 font-semibold hover:underline">
              {t('auth.login.signUp')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
