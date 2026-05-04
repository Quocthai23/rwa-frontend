import { ChevronRight, CheckVerified02 } from '@untitledui/icons';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/shared/atoms/button';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

const USER_PLACEHOLDER_ICON = '/assets/images/discover/filled.png';

export function UserCard() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const isAuthenticated = Boolean(user);

  return (
    <div className="mt-4 mb-8 flex flex-row items-center justify-between">
      {isAuthenticated ? (
        <>
          <div
            className="flex flex-1 flex-row items-center"
            onClick={() => router.push('/personal-info')}
          >
            <div className="bg-muted flex h-10 w-10 items-center justify-center overflow-hidden rounded-full">
              <Image
                src={user?.avatar || USER_PLACEHOLDER_ICON}
                alt={t('settings.userCard.avatarAlt')}
                width={56}
                height={56}
              />
            </div>

            <div className="ml-4">
              <span className="text-body-large-semibold text-foreground">{user?.email}</span>
              <div className="bg-primary-50 dark:bg-primary-900/25 border-border mt-1 flex w-fit items-center justify-center rounded border px-2 py-0.5 dark:border-neutral-800">
                <CheckVerified02
                  color="white"
                  fill="var(--color-primary-500)"
                  size={20}
                  className="mr-1"
                />
                <span className="text-primary-500 text-xs font-semibold">
                  {t('settings.userCard.verified')}
                </span>
              </div>
            </div>
          </div>
          <Button
            variant="white-contained"
            onClick={() => router.push('/personal-info')}
            className="p-1"
          >
            <ChevronRight className="text-muted-foreground size-6" />
          </Button>
        </>
      ) : (
        <>
          <div className="flex flex-1 flex-row items-center">
            <div className="bg-muted flex h-10 w-10 items-center justify-center overflow-hidden rounded-full">
              <Image
                className="h-10 w-10"
                src={USER_PLACEHOLDER_ICON}
                alt={t('settings.userCard.placeholderAlt')}
                width={40}
                height={40}
              />
            </div>

            <div className="ml-4">
              <span className="text-body-large-semibold text-foreground block truncate">
                <Link href="/login">{t('auth.login.title')}</Link> |{' '}
                <Link href="/register">{t('auth.register.title')}</Link>
              </span>
            </div>
          </div>
          <div className="flex flex-row items-center gap-2">
            <Button variant="white-contained" onClick={() => router.push('/login')} className="p-1">
              <ChevronRight className="text-muted-foreground size-6" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
