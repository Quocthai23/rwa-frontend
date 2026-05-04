'use client';

import React, { useEffect, useState } from 'react';
import { ChevronRight } from '@untitledui/icons';
import { useRouter } from 'next/navigation';

import Header from '@/components/shared/Header';
import { CircleProgress } from './components/CircleProgress';
import { useTheme } from '@/theme';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { authApi } from '@/services/auth';

type SecurityItemProps = {
  readonly isDestructive?: boolean;
  readonly label: string;
  readonly onPress?: () => void;
  readonly rightElement?: React.ReactNode;
};

function SecurityItem({ isDestructive = false, label, onPress, rightElement }: SecurityItemProps) {
  const { colors } = useTheme();

  return (
    <button
      className={cn(
        'border-border hover:text-primary-500 flex w-full flex-row items-center justify-between border-b py-4 text-left transition-colors',
        onPress ? 'cursor-pointer' : 'cursor-default',
      )}
      onClick={onPress}
      disabled={!onPress && !rightElement}
    >
      <span
        className={cn(
          'text-body-large-medium-semibold flex-1',
          isDestructive ? 'text-red-500' : 'text-foreground',
        )}
      >
        {label}
      </span>
      {rightElement ?? (
        <ChevronRight
          color={colors.neutral500}
          size={20}
          className="hover:text-primary-500 group-hover:text-primary-500"
        />
      )}
    </button>
  );
}

export default function SecurityCenter() {
  const { t } = useTranslation();
  const router = useRouter();

  const [enabledMfa, setEnabledMfa] = useState<boolean | null>(null);
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    authApi
      .getMe()
      .then((me) => {
        if (!isMounted) return;
        setEnabledMfa(Boolean(me.enabledMfa));
        setHasPassword(Boolean(me.hasPassword));
      })
      .catch(() => {
        if (!isMounted) return;
        setEnabledMfa(false);
        setHasPassword(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const securityScore = (hasPassword ? 1 : 0) + (enabledMfa ? 1 : 0);
  const maxScore = 2;
  const isStrongSecurity = securityScore === maxScore;
  const isReady = hasPassword !== null && enabledMfa !== null;
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <Header label={t('security.title')} />

      <div className="flex-1 overflow-y-auto px-5 pb-10">
        <div className="bg-muted mt-4 flex flex-row items-center rounded-xl p-4">
          <div className="mr-4">
            <CircleProgress value={securityScore} max={maxScore} />
          </div>
          <div className="flex-1">
            <div className="mb-1 flex flex-row items-center">
              <span className="text-body-large-semibold text-foreground mr-2 font-semibold">
                {t('security.securityLevel')}
              </span>
              <span
                className={cn(
                  'text-body-large-semibold font-semibold',
                  isStrongSecurity ? 'text-green-500' : 'text-red-500',
                )}
              >
                {isStrongSecurity ? t('security.levelStrong') : t('security.levelWeak')}
              </span>
            </div>
            <span className="text-body-small-regular text-muted-foreground text-sm">
              {isStrongSecurity
                ? t('security.levelDescriptionStrong')
                : t('security.levelDescriptionWeak')}
            </span>
          </div>
        </div>

        <div className="mt-8 mb-1">
          <span className="text-body-small-regular text-muted-foreground text-sm">
            {t('security.verificationOptions')}
          </span>
        </div>

        <div className="flex flex-col">
          <SecurityItem
            label={
              hasPassword === false
                ? t('security.setPasswordLabel')
                : t('security.changePasswordLabel')
            }
            onPress={() =>
              router.push(
                `/settings/security/change-password?hasPassword=${hasPassword === false ? 'false' : 'true'}`,
              )
            }
            rightElement={
              !isReady ? (
                <span className="text-body-large-semibold text-muted-foreground">...</span>
              ) : undefined
            }
          />
          <SecurityItem
            label={t('security.authenticatorAppLabel')}
            onPress={() => router.push('/settings/security/authenticator-app')}
            rightElement={
              enabledMfa === true ? (
                <span className="text-body-large-semibold text-primary-500">
                  {t('security.authenticatorStatusOn')}
                </span>
              ) : undefined
            }
          />
        </div>

        <div className="mt-8 mb-1">
          <span className="text-body-small-regular text-muted-foreground text-sm">
            {t('security.advancedSettings')}
          </span>
        </div>

        <div className="flex flex-col">
          <SecurityItem
            isDestructive
            label={t('security.deleteAccountLabel')}
            onPress={() => router.push('/settings/security/delete')}
          />
        </div>
      </div>
    </div>
  );
}
