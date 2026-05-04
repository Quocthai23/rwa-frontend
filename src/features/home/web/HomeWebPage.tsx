'use client';

import HomeWebScreen from '@/components/featured/home/web/HomeWebScreen';
import { WebLayout } from '@/components/layouts/WebLayout';
import { useAuthStore } from '@/store/authStore';
import Image from 'next/image';
import { useTheme } from '@/theme';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/shared/atoms/button';

export function HomeWebPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { mode } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  if (!isAuthenticated) {
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
              Welcome to MTX Trading
            </h2>
            <p className="mt-3 text-base text-neutral-900 dark:text-white">
              Sign in to view your balance and personalized data.
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
    <WebLayout>
      <div className="w-full px-4 py-5 xl:px-6">
        <HomeWebScreen />
      </div>
    </WebLayout>
  );
}
