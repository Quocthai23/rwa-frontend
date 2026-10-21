'use client';

import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { isDemoAccount } from '@/lib/trading/environment';
import { useAccountStore } from '@/store/useAccountStore';

export function LiveAccountNotice() {
  const { i18n } = useTranslation();
  return (
    <p className="text-muted-foreground text-sm">
      {(i18n.resolvedLanguage ?? i18n.language).startsWith('vi')
        ? 'Chuyển sang tài khoản thật để xem'
        : 'Switch to a live account to view'}
    </p>
  );
}

export function DemoUnavailableState({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        'flex w-full flex-col items-center justify-center gap-2 px-5 py-8 text-center',
        className,
      )}
    >
      <h3 className="text-body-large-semibold text-foreground">{t('demoAvailability.title')}</h3>
      <p className="text-body-small-regular text-muted-foreground max-w-md">
        {t('demoAvailability.description')}
      </p>
    </div>
  );
}

export default function LiveAccountOnly({ children }: { children: ReactNode }) {
  const selectedAccount = useAccountStore((state) => state.selectedAccount);
  if (isDemoAccount(selectedAccount)) {
    return <DemoUnavailableState className="min-h-[calc(100dvh-72px)]" />;
  }
  return <>{children}</>;
}
