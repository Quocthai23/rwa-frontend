'use client';

import { Button } from '@/components/shared/atoms/button';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

export default function HomeWebScreen() {
  const user = useAuthStore((state) => state.user);
  const { t } = useTranslation();
  return (
    <div className="mx-auto flex min-h-screen items-center justify-center px-4">
      {!user ? (
        <section className="bg-background flex flex-col items-center justify-center gap-4 rounded p-5 text-center">
          <p className="text-body-large-semibold">Welcome to MTX Trading</p>
          <p className="text-body-small-regular text-muted-foreground">
            Sign in to view your balance and personalized data.
          </p>
          <div className="flex flex-col items-center justify-center gap-4">
            <Link href="/login">
              <Button
                type="button"
                variant="primary-contained"
                className="text-body-large-semibold w-full px-3 py-1 text-white dark:text-black"
              >
                {t('auth.login.title', { defaultValue: 'Login' })}
              </Button>
            </Link>
            <Link href="/register">
              <Button
                type="button"
                variant="neutral-outline"
                className="text-body-large-semibold py text-foreground w-full px-3 py-1 dark:text-neutral-50"
              >
                {t('auth.register.title', { defaultValue: 'Sign up' })}
              </Button>
            </Link>
          </div>
        </section>
      ) : (
        <section className="bg-background flex flex-col items-center justify-center gap-4 rounded p-5 text-center">
          <p className="text-body-large-semibold">Welcome to MTX Trading</p>
          <p className="text-body-small-regular text-muted-foreground">
            <Link href="/market">
              <Button type="button" variant="primary-contained" className="w-full px-3 py-1">
                {t('market.title', { defaultValue: 'Market' })}
              </Button>
            </Link>
          </p>
        </section>
      )}
    </div>
  );
}
