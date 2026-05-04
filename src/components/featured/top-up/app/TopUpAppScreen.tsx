'use client';

import Header from '@/components/shared/Header';
import { useTranslation } from 'react-i18next';

import TopUpActionContent from '../shared/TopUpActionContent';

export default function TopUpAppScreen() {
  const { t } = useTranslation();

  return (
    <div className="bg-background flex min-h-screen flex-col">
      <Header label={t('topUp.title')} />
      <div className="flex flex-1 flex-col px-4">
        <TopUpActionContent />
      </div>
    </div>
  );
}
