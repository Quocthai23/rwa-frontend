// src/app/settings/security/google-auth/page.tsx
'use client';

import { useState } from 'react';
import { ChevronLeft } from '@untitledui/icons';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

// Local Switch component based on the app's design
function Switch({
  value,
  onValueChange,
}: {
  value: boolean;
  onValueChange?: (val: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onValueChange?.(!value)}
      className={cn(
        'flex h-6 w-11 cursor-pointer items-center rounded-full p-1 transition-colors duration-200',
        value ? 'bg-primary-500' : 'bg-muted',
      )}
    >
      <div
        className={cn(
          'h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200',
          value ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  );
}

export default function GoogleAuthenticator() {
  const { t } = useTranslation();
  const router = useRouter();
  const [isEnabled, setIsEnabled] = useState(false);

  return (
    <div className="bg-background flex min-h-screen flex-col">
      {/* Header */}
      <div className="bg-background sticky top-0 z-10 flex h-14 items-center justify-center">
        <button onClick={() => router.back()} className="absolute left-4 p-1">
          <ChevronLeft size={24} className="text-foreground" />
        </button>
        <h1 className="text-foreground text-lg font-semibold">{t('security.googleAuth.title')}</h1>
      </div>

      <div className="mt-2 px-5">
        <div className="flex flex-row items-center justify-between py-4">
          <span className="text-foreground text-base font-medium">
            {t('security.googleAuth.switchLabel')}
          </span>
          <Switch value={isEnabled} onValueChange={setIsEnabled} />
        </div>
      </div>
    </div>
  );
}
