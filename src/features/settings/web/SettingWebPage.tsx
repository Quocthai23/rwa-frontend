'use client';

import { Button } from '@/components/shared/atoms/button';
import SplashLogo from '@/components/shared/SplashLogo';
import SettingWebScreen from '@/components/featured/settings/web/SettingWebScreen';
import { WebLayout } from '@/components/layouts/WebLayout';
import { useAuthHydrated } from '@/hook/useAuthHydrated';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

export function SettingWebPage() {
  const router = useRouter();
  const hasHydratedAuth = useAuthHydrated();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { t } = useTranslation();
  if (!hasHydratedAuth) {
    return (
      <WebLayout>
        <SplashLogo size={300} />
      </WebLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <WebLayout>
        <div className="flex h-[calc(100dvh-72px)] items-center justify-center px-4">
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
      </WebLayout>
    );
  }

  return (
    <WebLayout>
      <SettingWebScreen />
    </WebLayout>
  );
}
