'use client';

import Image from 'next/image';
import { useTranslation } from 'react-i18next';

export default function AuthLeftPanel() {
  const { t } = useTranslation();

  return (
    <div className="relative hidden w-[45%] flex-col items-start justify-start overflow-hidden px-10 pt-12 md:flex">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_60%,rgba(1,88,255,0.35),transparent_60%),radial-gradient(circle_at_80%_20%,rgba(5,178,255,0.18),transparent_50%)]" />
      <Image
        src="/web/svg/login.svg"
        alt="Auth illustration"
        fill
        className="object-cover object-center opacity-90"
        priority
      />
      <div className="relative z-10">
        <h2 className="text-4xl leading-tight font-bold whitespace-pre-line text-white">
          {t('auth.leftPanel.title')}
        </h2>
        <p className="mt-4 leading-relaxed whitespace-pre-line text-white">
          {t('auth.leftPanel.description')}
        </p>
      </div>
    </div>
  );
}
