'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import i18n, { normalizeToSupportedLanguage } from '@/i18n';

export default function I18nSync() {
  const language = useAppStore((s) => s.language);

  useEffect(() => {
    const next = normalizeToSupportedLanguage(language);
    if (i18n.language !== next) {
      void i18n.changeLanguage(next);
    }
  }, [language]);

  return null;
}
