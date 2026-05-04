'use client';

import { ChevronLeft } from '@untitledui/icons';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

export default function HelpCenter() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <div className="bg-background flex h-full flex-col">
      {/* Header */}
      <div className="relative flex h-15 flex-row items-center justify-center px-4">
        <button
          className="absolute left-4"
          onClick={() => {
            router.back();
          }}
        >
          <ChevronLeft size={24} />
        </button>
        <span className="text-h3-semibold text-center">{t('features.helpCenter')}</span>
      </div>

      {/* Content */}
      <div className="flex flex-1 items-center justify-center">
        <span className="text-h2-semibold text-muted-foreground">
          {t('common.comingSoonTitle')}
        </span>
      </div>
    </div>
  );
}
