'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';

import AppHeader from '@/components/shared/header/AppHeader';
import RegisterCreatePassword from '../components/RegisterCreatePassword';
import RegisterInput from '../components/RegisterInput';
import RegisterReferralCode from '../components/RegisterReferralCode';
import RegisterVerifyOTP from '../components/RegisterVerifyOTP';
import { Button } from '@/components/shared/atoms/button';
import { useAuthHydrated } from '@/hook/useAuthHydrated';
import { useAuthStore } from '@/store/authStore';
import { RegisterStep, useRegisterFlow } from '../shared/useRegisterFlow';

export default function RegisterApp() {
  const {
    t,
    router,
    step,
    setStep,
    data,
    setData,
    skipInitialResendCooldown,
    isGoogleSubmitting,
    handleGoogleSignUp,
    missingDataHandler,
    expireRegisterSession,
    setTokenIssuedAt,
  } = useRegisterFlow();
  const hasHydratedAuth = useAuthHydrated();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (!hasHydratedAuth || !isAuthenticated) return;
    router.replace('/home');
  }, [hasHydratedAuth, isAuthenticated, router]);

  if (hasHydratedAuth && isAuthenticated) return null;

  if (step === RegisterStep.Input) {
    return (
      <RegisterInput
        email={data.email}
        onBack={() => setStep(RegisterStep.Start)}
        onEmailChange={(email) => {
          setData((prev) => ({ ...prev, email }));
        }}
        onContinue={(email) => {
          setData((prev) => ({ ...prev, email }));
          setStep(RegisterStep.VerifyOtp);
        }}
      />
    );
  }

  if (step === RegisterStep.VerifyOtp) {
    return (
      <RegisterVerifyOTP
        email={data.email}
        skipInitialResendCooldown={skipInitialResendCooldown}
        onBack={() => {
          setStep(RegisterStep.Input);
        }}
        onMissingEmail={missingDataHandler}
        onContinue={({ email, token }) => {
          setData((prev) => ({ ...prev, email, token }));
          setTokenIssuedAt(Date.now());
          setStep(RegisterStep.CreatePassword);
        }}
      />
    );
  }

  if (step === RegisterStep.CreatePassword) {
    return (
      <RegisterCreatePassword
        email={data.email}
        registerToken={data.token}
        onBack={() => setStep(RegisterStep.VerifyOtp)}
        onMissingData={missingDataHandler}
        onContinue={({ email, token, password }) => {
          setData((prev) => ({ ...prev, email, token, password }));
          setStep(RegisterStep.ReferralCode);
        }}
      />
    );
  }

  if (step === RegisterStep.ReferralCode) {
    return (
      <RegisterReferralCode
        email={data.email}
        password={data.password}
        registerToken={data.token}
        onBack={() => setStep(RegisterStep.CreatePassword)}
        onMissingData={missingDataHandler}
        onTokenExpired={expireRegisterSession}
        onSuccess={(email) => router.replace(`/login?email=${encodeURIComponent(email)}`)}
      />
    );
  }

  return (
    <div className="min-h-screen">
      <div className="dark:bg-background dark:text-foreground flex min-h-screen flex-col bg-white">
        <div className="relative flex flex-1 flex-col pt-4">
          <AppHeader
            label={t('auth.register.title')}
            onBack={() => router.back()}
            rightItem={
              <Link href="/login">
                <span className="text-primary-500 text-button-large-medium">
                  {t('auth.register.login')}
                </span>
              </Link>
            }
          />

          <div className="flex flex-1 items-center justify-center px-4">
            <div className="flex w-full max-w-md flex-col items-center">
              <div className="mb-8 flex w-full flex-col gap-4">
                <Button
                  type="button"
                  variant="white-outline"
                  className="text-button-large-medium dark:bg-background dark:text-foreground flex h-12 w-full items-center justify-center gap-3 rounded border border-gray-200 bg-white text-neutral-900 dark:border-neutral-800"
                  onClick={() => {
                    void handleGoogleSignUp();
                  }}
                  disabled={isGoogleSubmitting}
                >
                  <Image src="/assets/images/google.png" alt="Google" width={20} height={20} />
                  {isGoogleSubmitting
                    ? t('auth.login.loading')
                    : t('auth.register.signUpWithGoogle')}
                </Button>
              </div>

              <div className="mb-8 flex w-full flex-row items-center">
                <div className="h-px flex-1 bg-gray-200 dark:bg-neutral-800" />
                <div className="text-secondary-500 text-body-small-semibold mx-4 dark:text-neutral-300">
                  {t('auth.register.or')}
                </div>
                <div className="h-px flex-1 bg-gray-200 dark:bg-neutral-800" />
              </div>

              <div className="w-full">
                <Button
                  type="button"
                  variant="white-outline"
                  className="text-button-large-medium h-12 w-full"
                  onClick={() => setStep(RegisterStep.Input)}
                >
                  {t('auth.register.signUpWithEmail')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

