'use client';

import { Suspense } from 'react';

import Reward from '@/components/featured/rewards/Reward';
import RewardCenterWebScreen from '@/components/featured/rewards-center/web/RewardCenterWebScreen';
import { WebLayout } from '@/components/layouts/WebLayout';
import { Button } from '@/components/shared/atoms/button';
import SplashLogo from '@/components/shared/SplashLogo';
import { useAuthHydrated } from '@/hook/useAuthHydrated';
import { resolveRouteExperience } from '@/lib/experience/resolveExperience';
import { useExperience } from '@/lib/experience/useExperience';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

export default function RewardCenterPage() {
  const router = useRouter();
  const pathname = usePathname() || '/rewards-center';
  const viewportExperience = useExperience();
  const experience = resolveRouteExperience(pathname, viewportExperience);
  const hasHydratedAuth = useAuthHydrated();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { t } = useTranslation();
  const { mode } = useTheme();
  if (!hasHydratedAuth) {
    if (experience === 'web') {
      return (
        <WebLayout>
          <SplashLogo size={300} />
        </WebLayout>
      );
    }

    return <SplashLogo size={300} />;
  }

  if (!isAuthenticated) {
    if (experience === 'web') {
      return (
        <WebLayout>
          <div className="flex h-[calc(100dvh-72px)] items-center justify-center px-4 py-6">
            <div className="mx-auto flex w-full max-w-2xl flex-col items-center text-center">
              <Image
                src={
                  mode === 'dark'
                    ? '/assets/images/position/group-dark.svg'
                    : '/assets/images/position/Group.svg'
                }
                alt="Welcome illustration"
                width={300}
                height={300}
                priority
                className="h-auto w-full max-w-[300px]"
              />
              <h2 className="text-primary-500 mt-6 text-3xl font-semibold sm:text-5xl">
                {t('position.web.authGate.welcomeTitle', {
                  defaultValue: 'Welcome to MTX Trading',
                })}
              </h2>
              <p className="mt-3 text-base text-neutral-900 dark:text-white">
                {t('position.web.authGate.welcomeDescription', {
                  defaultValue: 'Sign in to view your balance and personalized data.',
                })}
              </p>
              <div className="mt-7 grid w-full max-w-lg grid-cols-1 gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="neutral-contained"
                  className="text-body-large-semibold h-11 w-full text-neutral-900 dark:text-white"
                  onClick={() => router.push('/login')}
                >
                  {t('auth.login.title', { defaultValue: 'Login' })}
                </Button>
                <Button
                  type="button"
                  variant="primary-contained"
                  className="text-body-large-semibold text-foreground h-11 w-full"
                  onClick={() => router.push('/register')}
                >
                  {t('auth.register.title', { defaultValue: 'Register' })}
                </Button>
              </div>
            </div>
          </div>
        </WebLayout>
      );
    }

    return (
      <div className="bg-background flex min-h-[calc(100dvh-64px)] items-center justify-center px-4 py-6">
        <div className="flex w-full max-w-sm flex-col gap-3">
          <Button
            type="button"
            variant="primary-contained"
            className="text-body-large-semibold h-11 w-full text-white dark:text-black"
            onClick={() => router.push('/login')}
          >
            {t('auth.login.title', { defaultValue: 'Login' })}
          </Button>
          <Button
            type="button"
            variant="neutral-outline"
            className="text-body-large-semibold text-foreground h-11 w-full"
            onClick={() => router.push('/register')}
          >
            {t('auth.register.title', { defaultValue: 'Register' })}
          </Button>
        </div>
      </div>
    );
  }

  if (experience !== 'web') {
    return <Reward />;
  }

  return (
    <WebLayout>
      <Suspense fallback={null}>
        <RewardCenterWebScreen />
      </Suspense>
    </WebLayout>
  );
}
