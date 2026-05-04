'use client';

import { useTheme } from '@/theme';
import { User01 } from '@untitledui/icons';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';

const NoSignIn = () => {
  const { colors } = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <div className="flex-1 px-4">
        <div className="flex flex-row items-center gap-4 py-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-700">
            <User01 size={24} color={colors.neutral0} />
          </div>

          <div className="flex flex-1 flex-row items-center gap-1.5">
            <button onClick={() => router.push('/login')}>
              <span className="text-body-large-semibold text-foreground">
                {t('noSignIn.loginButton')}
              </span>
            </button>
            <span className="text-foreground text-[25px]">|</span>
            <button onClick={() => router.push('/register')}>
              <span className="text-body-large-semibold text-foreground">
                {t('noSignIn.signUpButton')}
              </span>
            </button>
          </div>
        </div>

        <p className="text-h3-semibold text-foreground py-8 text-center">{t('noSignIn.title')}</p>

        <div className="mb-8 flex flex-col gap-6">
          <div className="flex flex-row items-start gap-3">
            <div className="flex items-center justify-center">
              <Image
                width={24}
                height={24}
                src="/assets/icons/position/layers-three-02.svg"
                alt="Layers Icon"
              />
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-body-large-semibold text-foreground">
                {t('noSignIn.features.marketAccess.title')}
              </p>
              <p className="text-body-small-regular text-secondary-500">
                {t('noSignIn.features.marketAccess.description')}
              </p>
            </div>
          </div>

          {/* Reliable Trading Execution */}
          <div className="flex flex-row items-start gap-3">
            <Image
              width={24}
              height={24}
              src="/assets/icons/position/switch-vertical-01.svg"
              alt="Switch Icon"
            />
            <div className="flex-1 space-y-2">
              <p className="text-body-large-semibold text-foreground">
                {t('noSignIn.features.tradingExecution.title')}
              </p>
              <p className="text-body-small-regular text-secondary-500">
                {t('noSignIn.features.tradingExecution.description')}
              </p>
            </div>
          </div>

          {/* Balance Protection */}
          <div className="flex flex-row items-start gap-3">
            <Image
              width={24}
              height={24}
              src="/assets/icons/position/shield-tick.svg"
              alt="Shield Icon"
            />
            <div className="flex-1 space-y-2">
              <p className="text-body-large-semibold text-foreground">
                {t('noSignIn.features.balanceProtection.title')}
              </p>
              <p className="text-body-small-regular text-secondary-500">
                {t('noSignIn.features.balanceProtection.description')}
              </p>
            </div>
          </div>

          {/* Secure Trading Environment */}
          <div className="flex flex-row items-start gap-3">
            <Image
              width={24}
              height={24}
              src="/assets/icons/position/lock-01.svg"
              alt="Lock Icon"
            />
            <div className="flex-1 space-y-2">
              <p className="text-body-large-semibold text-foreground">
                {t('noSignIn.features.secureEnvironment.title')}
              </p>
              <p className="text-body-small-regular text-secondary-500">
                {t('noSignIn.features.secureEnvironment.description')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoSignIn;
